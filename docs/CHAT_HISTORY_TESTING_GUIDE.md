# Chat History Testing Guide

## Prerequisites

### 1. Run Supabase Migration

**CRITICAL**: You must run the migration in Supabase before testing.

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to your project
3. Go to **SQL Editor**
4. Copy the contents of `supabase/migrations/009_chat_history.sql`
5. Paste and **Run** the SQL
6. Verify tables were created:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN (
     'conversations', 
     'folders', 
     'user_messages', 
     'engine_responses', 
     'response_blocks', 
     'preferred_blocks', 
     'conversation_engines'
   );
   ```

### 2. Verify Backend API is Running

The chat history API routes are mounted at `/api/chat` in `server/ai-proxy.cjs`.

Start the backend:
```bash
npm run dev:safe
```

Verify the routes are accessible:
```bash
curl http://localhost:3000/api/chat/conversations
```

---

## Testing Flow

### Test 1: First Conversation Creation

**Steps:**
1. Navigate to Story Mode
2. Complete Steps 1-3 (Role, Prompt, Engine Selection)
3. Click "Run Live" to reach Step 4
4. Wait for all engines to complete

**Expected Behavior:**
- Console logs: `[Chat History] Created new conversation`
- Console logs: `[Chat History] Saved user message`
- Console logs: `[Chat History] Saved response from [Engine Name]` (for each engine)
- Sidebar shows current conversation with prompt preview
- Conversation appears in sidebar under "Today"

**Verification:**
Check Supabase database:
```sql
-- Check conversation was created
SELECT * FROM conversations ORDER BY created_at DESC LIMIT 1;

-- Check user message was saved
SELECT * FROM user_messages ORDER BY created_at DESC LIMIT 1;

-- Check engine responses were saved
SELECT * FROM engine_responses ORDER BY created_at DESC LIMIT 5;

-- Check response blocks were parsed
SELECT * FROM response_blocks ORDER BY created_at DESC LIMIT 10;
```

---

### Test 2: Preferred Selection CTA

**Steps:**
1. After responses complete in Step 4
2. Scroll down past the engine response tabs

**Expected Behavior:**
- Blue/purple gradient panel appears with title "Select Your Preferred Response Blocks"
- Shows "0 blocks selected" initially
- Displays tip about using SelectableMarkdownRenderer

**Current Limitation:**
The SelectableMarkdownRenderer integration for block selection is not yet connected. This will be implemented in the next phase.

---

### Test 3: Follow-up Questions (Without Context)

**Steps:**
1. After initial responses complete
2. Scroll to bottom of Step 4
3. See the follow-up prompt box
4. Select/deselect engines using the pills
5. Type a follow-up question
6. Press Enter or click Send

**Expected Behavior:**
- New responses stream in
- Console logs: `[Chat History] Saved user message`
- Console logs: `[Chat History] Saved response from [Engine Name]`
- Conversation continues in same thread

**Verification:**
```sql
-- Check multiple messages in same conversation
SELECT 
  c.title,
  um.content,
  um.turn_number,
  um.created_at
FROM conversations c
JOIN user_messages um ON um.conversation_id = c.id
ORDER BY c.created_at DESC, um.turn_number ASC
LIMIT 10;
```

---

### Test 4: Follow-up Questions (With Context)

**Steps:**
1. Complete Test 1 (initial conversation)
2. **Manually** insert preferred blocks in Supabase:
   ```sql
   -- Get the IDs you need
   SELECT 
     um.id as message_id,
     rb.id as block_id,
     rb.content
   FROM user_messages um
   JOIN engine_responses er ON er.user_message_id = um.id
   JOIN response_blocks rb ON rb.engine_response_id = er.id
   ORDER BY um.created_at DESC
   LIMIT 5;
   
   -- Insert preferred blocks (use actual IDs from above)
   INSERT INTO preferred_blocks (user_message_id, block_id, selection_order)
   VALUES 
     ('[message_id]', '[block_id_1]', 1),
     ('[message_id]', '[block_id_2]', 2);
   ```
3. Refresh the page
4. Navigate back to Step 4
5. Type a follow-up question
6. Click Send

**Expected Behavior:**
- Console logs: `[Chat History] Using context from X previous messages`
- The contextual prompt includes previous message content
- Engines receive context in their prompt

**Verification:**
Check the network tab in browser DevTools:
- Look for POST to `/api/stream` or provider endpoints
- Inspect the request payload
- Verify prompt includes `[Previous user]:` and `[Previous assistant]:` sections

---

### Test 5: Sidebar Conversation List

**Steps:**
1. Create multiple conversations (repeat Test 1 multiple times)
2. Click hamburger menu to show/hide sidebar
3. Observe conversation list

**Expected Behavior:**
- Sidebar toggles on/off smoothly
- Current conversation highlighted in purple
- Shows engine indicator dots
- Grouped under "Today"
- Search bar present (not yet functional)

**Current Limitations:**
- Clicking on past conversations doesn't load them yet
- Search is not implemented
- Date grouping only shows "Today"

---

## Known Issues & Limitations

### 1. Block Selection Not Connected
The preferred selection CTA appears, but clicking on response sections doesn't actually select blocks yet. The SelectableMarkdownRenderer needs to be integrated with the chat history API.

**Workaround:** Manually insert preferred blocks via SQL (see Test 4).

### 2. Sidebar Conversation Loading
Clicking on past conversations in the sidebar doesn't load them yet. The `loadConversation` function needs to be connected to the UI.

### 3. Context Building
The context building works but uses a simple format. It may need refinement based on token limits and provider requirements.

### 4. New Engines as Context
When adding new engines in a follow-up, they should use the preferred selection as context. This is implemented but needs testing with actual block selections.

---

## Debugging

### Enable Verbose Logging

The code includes extensive logging. Check browser console for:
- `[Chat History]` prefixed messages
- Network requests to `/api/chat/*`
- Supabase client errors

### Common Issues

**Issue:** "Failed to save" errors
- **Cause:** Migration not run or RLS policies blocking
- **Fix:** Run migration, check Supabase logs

**Issue:** No conversation created
- **Cause:** User not authenticated or not on Step 4
- **Fix:** Ensure `user?.id` exists and `storyStep === 4`

**Issue:** Context not included in follow-ups
- **Cause:** No preferred blocks selected
- **Fix:** Manually insert preferred blocks (see Test 4)

---

## Next Steps

1. **Integrate SelectableMarkdownRenderer** with block selection API
2. **Implement conversation loading** from sidebar
3. **Add search functionality** to sidebar
4. **Implement date grouping** (Yesterday, Last 7 days, etc.)
5. **Add conversation management** (rename, delete, pin, archive)
6. **Optimize context building** with token limits
7. **Add conversation export** functionality

---

## API Endpoints Reference

All endpoints are prefixed with `/api/chat`:

- `GET /conversations` - List all conversations
- `POST /conversations` - Create new conversation
- `GET /conversations/:id` - Get conversation details
- `POST /conversations/:id/messages` - Send message
- `POST /conversations/:id/messages/:messageId/responses` - Store engine response
- `POST /conversations/:id/messages/:messageId/blocks/:blockId/select` - Select block
- `DELETE /conversations/:id/messages/:messageId/blocks/:blockId/select` - Deselect block
- `GET /conversations/:id/context` - Get context for follow-ups

See `server/routes/chat-history.cjs` for full API documentation.
