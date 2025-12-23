// =============================================================================
// CONTEXT BUILDER
// =============================================================================
// Build API context from preferred blocks (user-curated selections)
// Supports 'preferred' mode (use selected blocks) and 'cold_start' (no context)
// =============================================================================

import { supabase } from '../supabase/client';
import { ContextMessage, ContextMode } from '../../types/chat-history';
import { blocksToContext } from './block-parser';

/**
 * Build context for sending to engines
 * 
 * @param conversationId - Current conversation ID
 * @param newMessage - The new user message to send
 * @param mode - 'preferred' uses selected blocks, 'cold_start' sends no history
 * @returns Array of context messages for API call
 */
export async function buildContext(
  conversationId: string,
  newMessage: string,
  mode: ContextMode = 'preferred'
): Promise<ContextMessage[]> {
  const context: ContextMessage[] = [];
  
  // Cold start: just send the new message
  if (mode === 'cold_start') {
    return [{ role: 'user', content: newMessage }];
  }
  
  try {
    // Get all user messages in order with their preferred blocks
    const { data: messages, error } = await supabase!
      .from('user_messages')
      .select(`
        id,
        content,
        turn_number,
        preferred_blocks (
          selection_order,
          block:response_blocks (
            content,
            block_type,
            metadata,
            engine_response:engine_responses (
              engine,
              provider
            )
          )
        )
      `)
      .eq('conversation_id', conversationId)
      .order('turn_number', { ascending: true });
    
    if (error) {
      console.error('[Context Builder] Error fetching messages:', error);
      return [{ role: 'user', content: newMessage }];
    }
    
    if (!messages || messages.length === 0) {
      return [{ role: 'user', content: newMessage }];
    }
    
    // Build context from messages and preferred blocks
    for (const msg of messages as any[]) {
      // Add user message
      context.push({ role: 'user', content: msg.content });
      
      // Add assistant response from preferred blocks (if any)
      if (msg.preferred_blocks && msg.preferred_blocks.length > 0) {
        // Sort by selection order
        const sortedBlocks = [...msg.preferred_blocks].sort(
          (a: any, b: any) => a.selection_order - b.selection_order
        );
        
        // Extract block data
        const blocks = sortedBlocks
          .map((pb: any) => pb.block)
          .filter(Boolean);
        
        if (blocks.length > 0) {
          const assistantContent = blocksToContext(blocks);
          context.push({ role: 'assistant', content: assistantContent });
        }
      }
    }
    
    // Add the new message
    context.push({ role: 'user', content: newMessage });
    
    return context;
  } catch (err) {
    console.error('[Context Builder] Unexpected error:', err);
    return [{ role: 'user', content: newMessage }];
  }
}

/**
 * Build context for a newly added engine mid-conversation
 * 
 * @param conversationId - Current conversation ID
 * @param currentMessage - Current user message
 * @param usePreferredContext - Whether to use preferred blocks or cold start
 * @returns Array of context messages
 */
export async function buildContextForNewEngine(
  conversationId: string,
  currentMessage: string,
  usePreferredContext: boolean
): Promise<ContextMessage[]> {
  if (!usePreferredContext) {
    // Cold start - just the current message
    return [{ role: 'user', content: currentMessage }];
  }
  
  // Use full preferred context
  return buildContext(conversationId, currentMessage, 'preferred');
}

/**
 * Get context summary (for debugging/display)
 * 
 * @param context - Context messages
 * @returns Summary string
 */
export function getContextSummary(context: ContextMessage[]): string {
  const userMessages = context.filter(m => m.role === 'user').length;
  const assistantMessages = context.filter(m => m.role === 'assistant').length;
  const totalChars = context.reduce((sum, m) => sum + m.content.length, 0);
  
  return `${userMessages} user messages, ${assistantMessages} assistant responses, ~${Math.ceil(totalChars / 4)} tokens`;
}
