# OneMindAI Chat History & Context Preservation - Execution Plan

## 1. ARCHITECTURE OVERVIEW

### Current State
- OneMindAI sends individual requests to AI providers
- No conversation memory between requests
- Each request is stateless

### Desired State
- Users can have multi-turn conversations
- Context is preserved across messages
- Chat history is stored and retrievable
- Users can manage multiple conversations

---

## 2. DATABASE SCHEMA

### New Tables Required

#### `conversations` Table
```sql
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  provider VARCHAR(50) NOT NULL, -- 'openai', 'anthropic', 'gemini', etc.
  model_id VARCHAR(100) NOT NULL, -- 'gpt-4o', 'claude-3-5-sonnet', etc.
  system_prompt TEXT, -- Optional custom system prompt
  temperature DECIMAL(3,2) DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 2000,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,
  message_count INTEGER DEFAULT 0,
  is_archived BOOLEAN DEFAULT FALSE,
  is_pinned BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);
```

#### `chat_messages` Table
```sql
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  tokens_used INTEGER, -- For cost tracking
  model_used VARCHAR(100),
  provider_used VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  is_edited BOOLEAN DEFAULT FALSE,
  metadata JSONB -- Store additional data like citations, sources, etc.
);

CREATE INDEX idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
```

#### `conversation_settings` Table
```sql
CREATE TABLE public.conversation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL UNIQUE REFERENCES conversations(id) ON DELETE CASCADE,
  context_window_size INTEGER DEFAULT 10, -- Number of previous messages to include
  include_system_prompt BOOLEAN DEFAULT TRUE,
  auto_summarize BOOLEAN DEFAULT FALSE,
  summary_interval INTEGER DEFAULT 20, -- Summarize every N messages
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RLS Policies
```sql
-- Users can only see their own conversations
CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON conversations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations" ON conversations
  FOR DELETE USING (auth.uid() = user_id);

-- Similar policies for chat_messages and conversation_settings
```

---

## 3. BACKEND API ENDPOINTS

### New Endpoints Required

#### Chat Management
```
POST   /api/chat/conversations              - Create new conversation
GET    /api/chat/conversations              - List user's conversations
GET    /api/chat/conversations/:id          - Get conversation details
PUT    /api/chat/conversations/:id          - Update conversation (title, settings)
DELETE /api/chat/conversations/:id          - Delete conversation
POST   /api/chat/conversations/:id/archive  - Archive conversation
```

#### Messages
```
POST   /api/chat/conversations/:id/messages      - Send message (with context)
GET    /api/chat/conversations/:id/messages      - Get conversation history
PUT    /api/chat/messages/:messageId             - Edit message
DELETE /api/chat/messages/:messageId             - Delete message
POST   /api/chat/messages/:messageId/regenerate  - Regenerate AI response
```

#### Context Management
```
POST   /api/chat/conversations/:id/summarize     - Create context summary
GET    /api/chat/conversations/:id/context       - Get formatted context for API
```

### Message Flow with Context

```
User sends message
    ↓
Backend receives POST /api/chat/conversations/:id/messages
    ↓
Fetch last N messages from database (context window)
    ↓
Build context array:
  [
    { role: "system", content: "system_prompt" },
    { role: "user", content: "previous message 1" },
    { role: "assistant", content: "previous response 1" },
    ...
    { role: "user", content: "current message" }
  ]
    ↓
Send to AI provider with full context
    ↓
Receive response
    ↓
Store both user message and assistant response in database
    ↓
Return response to frontend
```

---

## 4. FRONTEND IMPLEMENTATION

### New Components Required

#### `ChatInterface.tsx`
- Main chat container
- Message list with auto-scroll
- Input area with send button
- Loading states and error handling

#### `ConversationSidebar.tsx`
- List of user's conversations
- Create new conversation button
- Search/filter conversations
- Archive/delete options
- Pin favorites

#### `MessageItem.tsx`
- Display individual message
- Edit/delete buttons
- Copy to clipboard
- Show metadata (tokens used, timestamp)

#### `ContextIndicator.tsx`
- Show how many messages are in context
- Display context window size
- Warning if context is getting large

#### `ConversationSettings.tsx`
- Configure context window size
- System prompt editor
- Temperature/max_tokens controls
- Auto-summarization settings

### State Management (React Context or Zustand)

```typescript
interface ChatState {
  // Current conversation
  currentConversation: Conversation | null;
  messages: ChatMessage[];
  
  // UI state
  isLoading: boolean;
  error: string | null;
  
  // Actions
  createConversation: (title: string, provider: string, model: string) => Promise<void>;
  loadConversation: (conversationId: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  editMessage: (messageId: string, newContent: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  archiveConversation: (conversationId: string) => Promise<void>;
}
```

---

## 5. UI WIREFRAME

```
┌─────────────────────────────────────────────────────────────────────┐
│                         OneMindAI Chat                              │
├──────────────────┬──────────────────────────────────────────────────┤
│                  │                                                  │
│  CONVERSATIONS   │              CHAT INTERFACE                      │
│  ─────────────   │  ──────────────────────────────────────────────  │
│                  │                                                  │
│ [+ New Chat]     │  Conversation: "Project Planning"               │
│                  │  Model: GPT-4o | Temperature: 0.7               │
│ 📌 Project       │  ──────────────────────────────────────────────  │
│    Planning      │                                                  │
│    (3 msgs)      │  ┌──────────────────────────────────────────┐   │
│                  │  │ Context: 5/10 messages loaded            │   │
│ 📄 Code Review   │  └──────────────────────────────────────────┘   │
│    (12 msgs)     │                                                  │
│                  │  ┌──────────────────────────────────────────┐   │
│ 📄 Bug Analysis  │  │ User: "How do I implement auth?"         │   │
│    (8 msgs)      │  │ 2:34 PM                                  │   │
│                  │  └──────────────────────────────────────────┘   │
│ 📄 API Design    │                                                  │
│    (15 msgs)     │  ┌──────────────────────────────────────────┐   │
│                  │  │ Assistant: "Here's how to implement...   │   │
│ [Archive]        │  │ 1. Set up Supabase Auth...              │   │
│ [Delete]         │  │ 2. Create auth context...               │   │
│                  │  │ 3. Add RLS policies..."                 │   │
│                  │  │ 2:35 PM | 245 tokens | [Edit] [Copy]    │   │
│                  │  └──────────────────────────────────────────┘   │
│                  │                                                  │
│                  │  ┌──────────────────────────────────────────┐   │
│                  │  │ User: "Can you show me the code?"        │   │
│                  │  │ 2:36 PM | [Edit] [Delete]               │   │
│                  │  └──────────────────────────────────────────┘   │
│                  │                                                  │
│                  │  ┌──────────────────────────────────────────┐   │
│                  │  │ Assistant: [Generating response...]      │   │
│                  │  │ ⏳ (loading animation)                   │   │
│                  │  └──────────────────────────────────────────┘   │
│                  │                                                  │
│                  │  ──────────────────────────────────────────────  │
│                  │  [📎 Attach] [Input message...] [Send] [⚙️]    │
│                  │  ──────────────────────────────────────────────  │
│                  │                                                  │
└──────────────────┴──────────────────────────────────────────────────┘
```

### Detailed Component Layout

#### Message Bubble (User)
```
┌─────────────────────────────────────┐
│ How do I implement authentication?   │
│ 2:34 PM | [Edit] [Delete] [Copy]    │
└─────────────────────────────────────┘
```

#### Message Bubble (Assistant)
```
┌─────────────────────────────────────┐
│ Here's how to implement auth:        │
│ 1. Set up Supabase Auth              │
│ 2. Create auth context               │
│ 3. Add RLS policies                  │
│                                      │
│ 2:35 PM | 245 tokens | [Edit] [Copy]│
│ [👍 Helpful] [👎 Not helpful]        │
└─────────────────────────────────────┘
```

#### Conversation Settings Panel
```
┌──────────────────────────────────────┐
│ Conversation Settings                │
├──────────────────────────────────────┤
│                                      │
│ Title: [Project Planning ________]   │
│                                      │
│ Model: [GPT-4o ▼]                    │
│ Provider: [OpenAI ▼]                 │
│                                      │
│ Temperature: [0.7 ───●─── 2.0]       │
│ Max Tokens: [2000 ___________]       │
│                                      │
│ Context Window: [10 messages ▼]      │
│ ☑ Include System Prompt              │
│ ☐ Auto-summarize every 20 messages   │
│                                      │
│ System Prompt:                       │
│ ┌──────────────────────────────────┐ │
│ │ You are a helpful assistant...    │ │
│ │                                  │ │
│ │                                  │ │
│ └──────────────────────────────────┘ │
│                                      │
│ [Cancel] [Save Changes]              │
└──────────────────────────────────────┘
```

---

## 6. IMPLEMENTATION ROADMAP

### Phase 1: Database & Backend (Week 1)
- [ ] Create database migrations for `conversations`, `chat_messages`, `conversation_settings`
- [ ] Set up RLS policies
- [ ] Implement backend API endpoints for CRUD operations
- [ ] Implement context building logic
- [ ] Add message storage after API calls
- [ ] Add error handling and validation

### Phase 2: Frontend - Basic Chat (Week 2)
- [ ] Create `ChatInterface` component
- [ ] Create `ConversationSidebar` component
- [ ] Create `MessageItem` component
- [ ] Implement message sending with context
- [ ] Implement message display and auto-scroll
- [ ] Add loading states

### Phase 3: Frontend - Advanced Features (Week 3)
- [ ] Create `ConversationSettings` component
- [ ] Implement edit/delete message functionality
- [ ] Add conversation management (create, delete, archive)
- [ ] Implement search/filter conversations
- [ ] Add message regeneration
- [ ] Add context indicator

### Phase 4: Polish & Optimization (Week 4)
- [ ] Add keyboard shortcuts (Cmd+K for search, Ctrl+Enter to send)
- [ ] Implement message pagination for old conversations
- [ ] Add export conversation as PDF/Markdown
- [ ] Implement conversation sharing (optional)
- [ ] Add analytics (track token usage, conversation length)
- [ ] Performance optimization and caching

---

## 7. KEY TECHNICAL DECISIONS

### Context Window Strategy
```
Option 1: Fixed Window (Recommended for MVP)
- Always include last N messages (e.g., 10)
- Simple, predictable token usage
- Suitable for most conversations

Option 2: Smart Window
- Include messages until token limit reached
- More context but variable cost
- Requires token counting library

Option 3: Summarization
- Summarize old messages into single summary
- Preserve context while reducing tokens
- More complex, requires LLM call
```

**Recommendation: Start with Option 1 (Fixed Window)**

### Token Counting
```typescript
// Use tiktoken library to count tokens before sending
import { encoding_for_model } from 'js-tiktoken';

const enc = encoding_for_model('gpt-4o');
const tokens = enc.encode(message).length;
```

### Cost Tracking
```typescript
interface MessageMetadata {
  tokens_used: number;
  cost_usd: number;
  model: string;
  provider: string;
  response_time_ms: number;
}
```

---

## 8. INTEGRATION WITH EXISTING CODE

### Modify `OneMindAI.tsx`
```typescript
// Add chat mode toggle
const [chatMode, setChatMode] = useState(false);

// If chatMode is true, show ChatInterface instead of current UI
return chatMode ? (
  <ChatInterface />
) : (
  // existing UI
);
```

### Modify AI Provider Calls
```typescript
// Current: Single request
const response = await callAIProvider(userMessage);

// New: Include context
const context = await buildContext(conversationId, contextWindowSize);
const response = await callAIProvider(userMessage, context);
await saveMessage(conversationId, userMessage, response);
```

---

## 9. SECURITY CONSIDERATIONS

- ✅ RLS policies ensure users only see their own conversations
- ✅ Validate context window size (prevent excessive token usage)
- ✅ Rate limit message creation (prevent spam)
- ✅ Sanitize system prompts (prevent prompt injection)
- ✅ Audit log all conversation deletions
- ✅ Encrypt sensitive data in metadata

---

## 10. PERFORMANCE OPTIMIZATIONS

### Database Queries
```sql
-- Index for fast conversation lookup
CREATE INDEX idx_conversations_user_created 
ON conversations(user_id, created_at DESC);

-- Index for fast message retrieval
CREATE INDEX idx_messages_conversation_created 
ON chat_messages(conversation_id, created_at DESC);
```

### Frontend Caching
```typescript
// Cache recent conversations in memory
const conversationCache = new Map<string, Conversation>();

// Pagination for old messages
const loadMoreMessages = async (conversationId: string, offset: number) => {
  // Load messages in batches of 50
};
```

### API Response Optimization
```typescript
// Only return last 10 messages by default
GET /api/chat/conversations/:id/messages?limit=10&offset=0

// Lazy load older messages on scroll
```

---

## 11. MIGRATION STRATEGY

### For Existing Users
- Create default conversation for backward compatibility
- Migrate any existing chat history if applicable
- Show onboarding for new chat features

### Database Migration
```bash
# Run migrations in order
supabase migration up 003_chat_history_schema.sql
supabase migration up 004_chat_history_rls.sql
supabase migration up 005_chat_history_functions.sql
```

---

## 12. TESTING STRATEGY

### Unit Tests
- Context building logic
- Token counting
- Message formatting

### Integration Tests
- Create conversation → Send message → Verify storage
- Load conversation → Verify context is correct
- Edit message → Verify update
- Delete conversation → Verify cascade delete

### E2E Tests
- Full conversation flow
- Multi-turn conversation with context
- Switching between conversations
- Archive/restore conversation

---

## 13. ESTIMATED EFFORT

| Phase | Component | Effort | Timeline |
|-------|-----------|--------|----------|
| 1 | Database & Backend | 16 hours | 2 days |
| 2 | Basic Chat UI | 20 hours | 2.5 days |
| 3 | Advanced Features | 24 hours | 3 days |
| 4 | Polish & Testing | 16 hours | 2 days |
| **Total** | | **76 hours** | **~2 weeks** |

---

## 14. SUCCESS METRICS

- ✅ Users can create and manage multiple conversations
- ✅ Context is preserved across messages (verified by checking API requests)
- ✅ Chat history is persisted and retrievable
- ✅ Performance: Message send latency < 2 seconds
- ✅ Performance: Load conversation < 500ms
- ✅ User satisfaction: Chat feature rating > 4.5/5

---

## 15. FUTURE ENHANCEMENTS

1. **Conversation Sharing** - Share conversations with team members
2. **Collaborative Chat** - Multiple users in same conversation
3. **Voice Input/Output** - Speak to AI
4. **Image Upload** - Include images in context (for vision models)
5. **Conversation Branching** - Create alternate paths in conversation
6. **AI-Generated Titles** - Auto-generate conversation titles
7. **Conversation Templates** - Pre-built system prompts
8. **Analytics Dashboard** - Track usage, costs, favorite models
9. **Conversation Merging** - Combine multiple conversations
10. **Export/Import** - Save conversations locally

---

## 16. NEXT STEPS

1. Review this plan with team
2. Create database migration files
3. Implement backend endpoints
4. Build frontend components
5. Integrate with existing OneMindAI UI
6. Test thoroughly
7. Deploy to production
