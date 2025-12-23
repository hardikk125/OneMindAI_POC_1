// =============================================================================
// CHAT HISTORY TYPES
// =============================================================================
// Block-based conversation system with user-curated preferred selections
// =============================================================================

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  folder_id?: string;
  is_pinned: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  engines?: ConversationEngine[];
}

export interface ConversationEngine {
  id: string;
  conversation_id: string;
  engine: string;
  provider: string;
  is_active: boolean;
  added_at: string;
  removed_at?: string;
}

export interface UserMessage {
  id: string;
  conversation_id: string;
  content: string;
  turn_number: number;
  attachments: Attachment[];
  created_at: string;
  engine_responses?: EngineResponse[];
  preferred_blocks?: PreferredBlock[];
}

export interface Attachment {
  filename: string;
  url: string;
  type: string;
  size?: number;
}

export interface EngineResponse {
  id: string;
  conversation_id: string;
  user_message_id: string;
  engine: string;
  provider: string;
  full_response: string;
  response_time_ms: number;
  input_tokens: number;
  output_tokens: number;
  cost_usd: number;
  error?: string;
  created_at: string;
  blocks?: ResponseBlock[];
}

export type BlockType = 'paragraph' | 'heading' | 'bullet' | 'numbered' | 'code' | 'table' | 'quote' | 'chart';

export interface ResponseBlock {
  id: string;
  engine_response_id: string;
  block_index: number;
  block_type: BlockType;
  content: string;
  metadata: BlockMetadata;
  created_at: string;
  isSelected?: boolean; // UI state only
}

export interface BlockMetadata {
  language?: string;      // For code blocks
  level?: number;         // For headings (1-6)
  items?: string[];       // For bullet/numbered lists
  chartType?: string;     // For charts
  [key: string]: any;     // Allow additional metadata
}

export interface PreferredBlock {
  id: string;
  conversation_id: string;
  user_message_id: string;
  block_id: string;
  selection_order: number;
  selected_at: string;
}

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  color: string;
  parent_id?: string;
  created_at: string;
  updated_at: string;
}

// Context message format for API calls
export interface ContextMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export type ContextMode = 'preferred' | 'cold_start';

// Extended block with engine metadata for UI display
export interface BlockWithMeta extends ResponseBlock {
  engineName: string;
  engineColor: string;
  provider: string;
}

// Conversation list item with summary
export interface ConversationListItem extends Conversation {
  message_count?: number;
  last_message_preview?: string;
  engine_count?: number;
}
