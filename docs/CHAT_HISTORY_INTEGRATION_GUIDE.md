# Chat History Integration Guide

## Phase 6: Integration Steps for OneMindAI.tsx

### Step 1: Add Chat History Toggle Button (Header)

Find the header section (around line 5700-5800) and add a history button:

```tsx
// Add near other header buttons (Settings, Export, etc.)
<button
  onClick={() => setShowChatHistory(!showChatHistory)}
  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
  title="Chat History"
>
  <History className="w-5 h-5 text-slate-600" />
</button>
```

### Step 2: Wrap Response Screen with Sidebar

In the Step 3/4 response rendering section (around line 6320+), wrap with sidebar:

```tsx
{storyMode && storyStep >= 3 && (
  <div className="flex h-full">
    {/* Chat History Sidebar */}
    <ChatHistorySidebar
      isOpen={showChatHistory}
      onClose={() => setShowChatHistory(false)}
      onSelectConversation={(conv) => {
        chatHistory.loadConversation(conv.id);
        setShowChatHistory(false);
      }}
      onNewChat={() => {
        const selectedEngines = engines
          .filter(e => selected[e.id])
          .map(e => ({ engine: e.selectedVersion, provider: e.provider }));
        chatHistory.createConversation('New Chat', selectedEngines);
        setShowChatHistory(false);
      }}
      currentConversationId={chatHistory.currentConversation?.id}
    />

    {/* Main Content Area */}
    <div className={`flex-1 ${showChatHistory ? 'lg:ml-80' : ''}`}>
      {/* Existing response UI */}
    </div>
  </div>
)}
```

### Step 3: Integrate Block Selection with SelectableMarkdownRenderer

Replace the current response rendering with block-based selection:

```tsx
{/* For each engine response */}
<SelectableMarkdownRenderer
  content={streamingStates[engine.id]?.content || ''}
  engineName={engine.name}
  onComponentSelect={(component) => {
    // Store as preferred block
    if (chatHistory.currentConversation && currentUserMessageId) {
      chatHistory.selectBlock(currentUserMessageId, component.id);
    }
  }}
  onComponentDeselect={(id) => {
    // Remove from preferred blocks
    const preferredBlock = chatHistory.messages
      .find(m => m.id === currentUserMessageId)
      ?.preferred_blocks?.find(pb => pb.block_id === id);
    if (preferredBlock) {
      chatHistory.deselectBlock(preferredBlock.id);
    }
  }}
  selectedIds={getSelectedBlockIds(currentUserMessageId)}
  isStreaming={streamingStates[engine.id]?.isStreaming}
/>
```

### Step 4: Modify streamFromProvider to Store Responses

In the `streamFromProvider` function (around line 1620), after streaming completes:

```tsx
// After streaming finishes
if (chatHistory.currentConversation && userMessageId) {
  const responseTime = Date.now() - startTime;
  
  await chatHistory.storeEngineResponse(
    userMessageId,
    e.selectedVersion,
    e.provider,
    fullContent,
    {
      response_time_ms: responseTime,
      input_tokens: estimateTokens(prompt),
      output_tokens: estimateTokens(fullContent),
      cost_usd: calculateCost(e.provider, inputTokens, outputTokens)
    }
  );
}
```

### Step 5: Modify runAll to Create User Messages

In the `runAll` function (around line 3700), before calling engines:

```tsx
// Create user message if conversation exists
let userMessageId: string | undefined;
if (chatHistory.currentConversation) {
  const message = await chatHistory.sendMessage(prompt);
  userMessageId = message?.id;
}

// Build context from preferred blocks
const context = await chatHistory.getContext(prompt, 'preferred');

// Pass context to streamFromProvider instead of just prompt
```

### Step 6: Add Preferred Selection Panel

After the engine responses, show selected blocks:

```tsx
{/* Show preferred selection for this turn */}
{currentUserMessage && (
  <PreferredSelectionPanel
    blocks={chatHistory.getPreferredBlocksWithMeta(currentUserMessage)}
    onRemove={(blockId) => {
      const pb = currentUserMessage.preferred_blocks?.find(
        p => p.block_id === blockId
      );
      if (pb) chatHistory.deselectBlock(pb.id);
    }}
    onReorder={(fromIndex, toIndex) => {
      // Implement reordering logic
    }}
    isCollapsed={false}
    onToggleCollapse={() => {}}
  />
)}
```

## Helper Functions to Add

```tsx
// Get selected block IDs for a message
function getSelectedBlockIds(messageId: string): string[] {
  const message = chatHistory.messages.find(m => m.id === messageId);
  return message?.preferred_blocks?.map(pb => pb.block_id) || [];
}

// Estimate tokens (rough)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Calculate cost
function calculateCost(provider: string, inputTokens: number, outputTokens: number): number {
  const pricing = CREDIT_PRICING[provider];
  if (!pricing) return 0;
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}
```

## Import Required Components

Already added at top of file:
```tsx
import { ChatHistorySidebar } from './components/chat/ChatHistorySidebar';
import { useChatHistory } from './hooks/useChatHistory';
```

Need to add:
```tsx
import { History } from 'lucide-react';
```

## State Already Added

```tsx
const [showChatHistory, setShowChatHistory] = useState(false);
const chatHistory = useChatHistory();
```

## Testing Checklist

- [ ] Sidebar opens/closes
- [ ] New conversation creates in database
- [ ] User messages stored
- [ ] Engine responses stored and parsed into blocks
- [ ] Blocks are selectable
- [ ] Preferred selection persists
- [ ] Context built from preferred blocks
- [ ] Follow-up messages use preferred context
- [ ] Conversation list shows all conversations
- [ ] Search works
- [ ] Date grouping works
- [ ] Mobile responsive

## Database Setup

Run migration first:
```bash
# In Supabase SQL Editor
-- Run: supabase/migrations/009_chat_history.sql
```

## Backend Setup

Already integrated:
- Routes mounted at `/api/chat`
- Requires `x-user-id` header from auth

## Next Steps

1. Test database migration
2. Test API endpoints
3. Test frontend integration
4. Fix any TypeScript errors
5. Test full user flow
6. Deploy to staging
