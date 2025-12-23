// =============================================================================
// CHAT HISTORY API ROUTES
// =============================================================================
// Backend endpoints for block-based conversation system
// =============================================================================

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service key for backend operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Import block parser (we'll need to convert this to CJS or use dynamic import)
// For now, we'll implement parsing directly in the route

/**
 * Parse response into blocks (CJS version)
 */
function parseResponseIntoBlocks(fullResponse) {
  const blocks = [];
  let blockIndex = 0;
  
  const sections = fullResponse.split(/\n\n+/);
  
  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;
    
    // Code blocks
    const codeMatch = trimmed.match(/^```(\w*)\n?([\s\S]*?)```$/);
    if (codeMatch) {
      blocks.push({
        block_index: blockIndex++,
        block_type: 'code',
        content: codeMatch[2].trim(),
        metadata: { language: codeMatch[1] || 'text' }
      });
      continue;
    }
    
    // Headings
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/m);
    if (headingMatch) {
      blocks.push({
        block_index: blockIndex++,
        block_type: 'heading',
        content: headingMatch[2],
        metadata: { level: headingMatch[1].length }
      });
      continue;
    }
    
    // Bullet lists
    if (/^[\-\*•]\s/.test(trimmed)) {
      const items = trimmed.split(/\n/).filter(line => /^[\-\*•]\s/.test(line));
      blocks.push({
        block_index: blockIndex++,
        block_type: 'bullet',
        content: trimmed,
        metadata: { items: items.map(i => i.replace(/^[\-\*•]\s+/, '')) }
      });
      continue;
    }
    
    // Numbered lists
    if (/^\d+\.\s/.test(trimmed)) {
      const items = trimmed.split(/\n/).filter(line => /^\d+\.\s/.test(line));
      blocks.push({
        block_index: blockIndex++,
        block_type: 'numbered',
        content: trimmed,
        metadata: { items: items.map(i => i.replace(/^\d+\.\s+/, '')) }
      });
      continue;
    }
    
    // Blockquotes
    if (/^>\s/.test(trimmed)) {
      blocks.push({
        block_index: blockIndex++,
        block_type: 'quote',
        content: trimmed.replace(/^>\s?/gm, ''),
        metadata: {}
      });
      continue;
    }
    
    // Tables
    if (/\|.*\|/.test(trimmed) && /\|[\-:]+\|/.test(trimmed)) {
      blocks.push({
        block_index: blockIndex++,
        block_type: 'table',
        content: trimmed,
        metadata: {}
      });
      continue;
    }
    
    // Charts
    if (trimmed.match(/```(mermaid|chart|plotly|vega|d3)/i)) {
      blocks.push({
        block_index: blockIndex++,
        block_type: 'chart',
        content: trimmed,
        metadata: { chartType: 'mermaid' }
      });
      continue;
    }
    
    // Default: paragraph
    blocks.push({
      block_index: blockIndex++,
      block_type: 'paragraph',
      content: trimmed,
      metadata: {}
    });
  }
  
  return blocks;
}

// ============================================
// CONVERSATIONS
// ============================================

// GET /api/chat/conversations - List user's conversations
router.get('/conversations', async (req, res) => {
  try {
    const userId = req.headers['x-user-id']; // From auth middleware
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        id,
        title,
        is_pinned,
        is_archived,
        folder_id,
        created_at,
        updated_at,
        conversation_engines (engine, provider, is_active)
      `)
      .eq('user_id', userId)
      .eq('is_archived', false)
      .order('updated_at', { ascending: false });
    
    if (error) throw error;
    
    res.json({ conversations: data || [] });
  } catch (err) {
    console.error('[Chat History] Error fetching conversations:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chat/conversations - Create new conversation
router.post('/conversations', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'];
    const { title, engines } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Create conversation
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .insert({ user_id: userId, title: title || 'New Conversation' })
      .select()
      .single();
    
    if (convError) throw convError;
    
    // Add initial engines
    if (engines && engines.length > 0) {
      const engineRows = engines.map(e => ({
        conversation_id: conv.id,
        engine: e.engine,
        provider: e.provider,
        is_active: true
      }));
      
      await supabase.from('conversation_engines').insert(engineRows);
    }
    
    res.json({ conversation: conv });
  } catch (err) {
    console.error('[Chat History] Error creating conversation:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chat/conversations/:id - Get full conversation with messages
router.get('/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get conversation
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .select(`
        *,
        conversation_engines (*)
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .single();
    
    if (convError) throw convError;
    
    // Get user messages with engine responses and blocks
    const { data: messages, error: msgError } = await supabase
      .from('user_messages')
      .select(`
        id,
        content,
        turn_number,
        attachments,
        created_at,
        engine_responses (
          id,
          engine,
          provider,
          full_response,
          response_time_ms,
          input_tokens,
          output_tokens,
          cost_usd,
          error,
          created_at,
          response_blocks (
            id,
            block_index,
            block_type,
            content,
            metadata,
            created_at
          )
        ),
        preferred_blocks (
          id,
          block_id,
          selection_order,
          selected_at
        )
      `)
      .eq('conversation_id', id)
      .order('turn_number', { ascending: true });
    
    if (msgError) throw msgError;
    
    res.json({ conversation: conv, messages: messages || [] });
  } catch (err) {
    console.error('[Chat History] Error fetching conversation:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// MESSAGES
// ============================================

// POST /api/chat/messages - Send a new message
router.post('/messages', async (req, res) => {
  try {
    const { conversation_id, content, attachments } = req.body;
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Verify conversation belongs to user
    const { data: conv } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversation_id)
      .eq('user_id', userId)
      .single();
    
    if (!conv) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Get current turn number
    const { data: lastMsg } = await supabase
      .from('user_messages')
      .select('turn_number')
      .eq('conversation_id', conversation_id)
      .order('turn_number', { ascending: false })
      .limit(1)
      .single();
    
    const turnNumber = (lastMsg?.turn_number || 0) + 1;
    
    // Insert user message
    const { data: msg, error } = await supabase
      .from('user_messages')
      .insert({
        conversation_id,
        content,
        turn_number: turnNumber,
        attachments: attachments || []
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Update conversation timestamp
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversation_id);
    
    res.json({ message: msg });
  } catch (err) {
    console.error('[Chat History] Error creating message:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// ENGINE RESPONSES
// ============================================

// POST /api/chat/responses - Store engine response with blocks
router.post('/responses', async (req, res) => {
  try {
    const {
      conversation_id,
      user_message_id,
      engine,
      provider,
      full_response,
      response_time_ms,
      input_tokens,
      output_tokens,
      cost_usd,
      error: responseError
    } = req.body;
    
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Insert engine response
    const { data: response, error } = await supabase
      .from('engine_responses')
      .insert({
        conversation_id,
        user_message_id,
        engine,
        provider,
        full_response,
        response_time_ms,
        input_tokens,
        output_tokens,
        cost_usd,
        error: responseError
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Parse response into blocks
    const blocks = parseResponseIntoBlocks(full_response);
    
    // Insert blocks
    if (blocks.length > 0) {
      const blockRows = blocks.map(b => ({
        engine_response_id: response.id,
        block_index: b.block_index,
        block_type: b.block_type,
        content: b.content,
        metadata: b.metadata
      }));
      
      await supabase.from('response_blocks').insert(blockRows);
    }
    
    res.json({ response, blocks_count: blocks.length });
  } catch (err) {
    console.error('[Chat History] Error storing response:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// PREFERRED BLOCKS (THE KEY FEATURE)
// ============================================

// POST /api/chat/preferred - Select a block
router.post('/preferred', async (req, res) => {
  try {
    const { conversation_id, user_message_id, block_id } = req.body;
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get current max order
    const { data: maxOrder } = await supabase
      .from('preferred_blocks')
      .select('selection_order')
      .eq('conversation_id', conversation_id)
      .eq('user_message_id', user_message_id)
      .order('selection_order', { ascending: false })
      .limit(1)
      .single();
    
    const newOrder = (maxOrder?.selection_order || 0) + 1;
    
    // Insert preferred block
    const { data, error } = await supabase
      .from('preferred_blocks')
      .insert({
        conversation_id,
        user_message_id,
        block_id,
        selection_order: newOrder
      })
      .select()
      .single();
    
    if (error) throw error;
    
    res.json({ preferred: data });
  } catch (err) {
    console.error('[Chat History] Error selecting block:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/chat/preferred/:id - Deselect a block
router.delete('/preferred/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { error } = await supabase
      .from('preferred_blocks')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    res.json({ success: true });
  } catch (err) {
    console.error('[Chat History] Error deselecting block:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/chat/preferred/reorder - Reorder preferred blocks
router.put('/preferred/reorder', async (req, res) => {
  try {
    const { user_message_id, block_order } = req.body;
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Update each block's order
    for (const item of block_order) {
      await supabase
        .from('preferred_blocks')
        .update({ selection_order: item.order })
        .eq('id', item.id);
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('[Chat History] Error reordering blocks:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chat/context/:conversationId - Get context for API call
router.get('/context/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { mode, newMessage } = req.query;
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Cold start mode
    if (mode === 'cold_start') {
      return res.json({
        context: [{ role: 'user', content: newMessage }]
      });
    }
    
    // Get conversation context using helper function
    const { data: contextData, error } = await supabase
      .rpc('get_conversation_context', { p_conversation_id: conversationId });
    
    if (error) throw error;
    
    // Build context array
    const context = [];
    for (const msg of contextData || []) {
      context.push({ role: 'user', content: msg.message_content });
      
      if (msg.preferred_blocks && msg.preferred_blocks.length > 0) {
        const blocksContent = msg.preferred_blocks
          .map(pb => pb.content)
          .join('\n\n');
        context.push({ role: 'assistant', content: blocksContent });
      }
    }
    
    // Add new message
    if (newMessage) {
      context.push({ role: 'user', content: newMessage });
    }
    
    res.json({ context });
  } catch (err) {
    console.error('[Chat History] Error building context:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
