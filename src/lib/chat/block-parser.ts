// =============================================================================
// BLOCK PARSER
// =============================================================================
// Parse engine responses into selectable blocks
// Detects: paragraphs, headings, code, bullets, numbered lists, tables, quotes
// =============================================================================

import { ResponseBlock, BlockType } from '../../types/chat-history';

/**
 * Parse an engine response into selectable blocks
 * 
 * @param fullResponse - Complete response text from engine
 * @returns Array of parsed blocks with type, content, and metadata
 */
export function parseResponseIntoBlocks(fullResponse: string): Omit<ResponseBlock, 'id' | 'engine_response_id' | 'created_at'>[] {
  const blocks: Omit<ResponseBlock, 'id' | 'engine_response_id' | 'created_at'>[] = [];
  let blockIndex = 0;
  
  // Split by double newlines first (paragraphs)
  const sections = fullResponse.split(/\n\n+/);
  
  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;
    
    // Check for code blocks
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
    
    // Check for headings
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
    
    // Check for bullet lists
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
    
    // Check for numbered lists
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
    
    // Check for blockquotes
    if (/^>\s/.test(trimmed)) {
      blocks.push({
        block_index: blockIndex++,
        block_type: 'quote',
        content: trimmed.replace(/^>\s?/gm, ''),
        metadata: {}
      });
      continue;
    }
    
    // Check for tables
    if (/\|.*\|/.test(trimmed) && /\|[\-:]+\|/.test(trimmed)) {
      blocks.push({
        block_index: blockIndex++,
        block_type: 'table',
        content: trimmed,
        metadata: {}
      });
      continue;
    }
    
    // Check for chart indicators (mermaid, plotly, etc.)
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

/**
 * Reconstruct text from selected blocks for API context
 * 
 * @param blocks - Array of response blocks
 * @returns Reconstructed markdown text
 */
export function blocksToContext(blocks: Pick<ResponseBlock, 'block_type' | 'content' | 'metadata'>[]): string {
  return blocks
    .map(block => {
      if (block.block_type === 'code') {
        return `\`\`\`${block.metadata.language || ''}\n${block.content}\n\`\`\``;
      }
      if (block.block_type === 'heading') {
        return `${'#'.repeat(block.metadata.level || 1)} ${block.content}`;
      }
      if (block.block_type === 'quote') {
        return block.content.split('\n').map(line => `> ${line}`).join('\n');
      }
      return block.content;
    })
    .join('\n\n');
}

/**
 * Estimate token count for a block (rough approximation)
 * 
 * @param block - Response block
 * @returns Estimated token count
 */
export function estimateBlockTokens(block: Pick<ResponseBlock, 'content'>): number {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(block.content.length / 4);
}

/**
 * Truncate blocks to fit within token limit
 * 
 * @param blocks - Array of blocks
 * @param maxTokens - Maximum token limit
 * @returns Truncated array of blocks
 */
export function truncateBlocksToTokenLimit(
  blocks: Pick<ResponseBlock, 'block_type' | 'content' | 'metadata'>[],
  maxTokens: number
): Pick<ResponseBlock, 'block_type' | 'content' | 'metadata'>[] {
  let totalTokens = 0;
  const result: Pick<ResponseBlock, 'block_type' | 'content' | 'metadata'>[] = [];
  
  for (const block of blocks) {
    const blockTokens = estimateBlockTokens(block);
    if (totalTokens + blockTokens > maxTokens) {
      break;
    }
    result.push(block);
    totalTokens += blockTokens;
  }
  
  return result;
}
