# OneMind AI - Chat History & Context Preservation
## Complete Architecture Design & Wireframes

---

# Table of Contents
1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Database Schema](#database-schema)
4. [Multi-Engine Flows](#multi-engine-flows)
5. [UI Wireframes](#ui-wireframes)
6. [Implementation Roadmap](#implementation-roadmap)

---

# Executive Summary

## What We're Building
A chat history system allowing users to:
- Save and resume conversations across sessions
- Use multiple AI engines within the same conversation
- Switch between engines mid-conversation while maintaining context
- Search and organize past conversations

## Key Challenges
1. **Multi-Engine Context**: User starts with 4 engines, switches to 2 mid-conversation
2. **Context Preservation**: AI remembers previous messages when user returns
3. **Response Comparison**: Store and compare responses from multiple engines

---

# Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    ONEMIND AI CHAT HISTORY                      │
├─────────────────────────────────────────────────────────────────┤
│  Frontend (React)  →  Backend (Node.js)  →  Supabase (Postgres) │
│                                                                 │
│  Components:         Services:            Tables:               │
│  • ChatSidebar       • ConversationSvc    • conversations       │
│  • MessageList       • MessageService     • messages            │
│  • EngineSelector    • ContextManager     • engine_responses    │
│  • ChatInput         • SearchService      • conversation_engines│
└─────────────────────────────────────────────────────────────────┘
```

---

# Database Schema

## Core Tables

### conversations
```sql
CREATE TABLE conversations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id),
    title           TEXT NOT NULL DEFAULT 'New Conversation',
    summary         TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    is_archived     BOOLEAN DEFAULT FALSE,
    is_pinned       BOOLEAN DEFAULT FALSE,
    folder_id       UUID REFERENCES folders(id)
);
```

### messages
```sql
CREATE TABLE messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id),
    role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content         TEXT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    sequence_num    SERIAL
);
```

### engine_responses
```sql
CREATE TABLE engine_responses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id      UUID NOT NULL REFERENCES messages(id),
    engine_id       TEXT NOT NULL,
    provider        TEXT NOT NULL,
    model           TEXT NOT NULL,
    content         TEXT NOT NULL,
    tokens_used     INTEGER,
    latency_ms      INTEGER,
    cost            DECIMAL(10, 6),
    selected        BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### conversation_engines
```sql
CREATE TABLE conversation_engines (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id),
    engine_id       TEXT NOT NULL,
    added_at        TIMESTAMPTZ DEFAULT NOW(),
    removed_at      TIMESTAMPTZ,
    is_active       BOOLEAN DEFAULT TRUE
);
```

---

# Multi-Engine Flows

## Scenario: 4 Engines → 2 Engines

```
TURN 1: User asks question
─────────────────────────
Active: [GPT-4] [Claude] [Gemini] [Mistral]

All 4 engines respond. User selects Claude's response.

USER ACTION: Disables Gemini and Mistral
───────────────────────────────────────
conversation_engines updated:
• Gemini:  is_active = false
• Mistral: is_active = false

TURN 2: Follow-up question
──────────────────────────
Active: [GPT-4] [Claude]

Context sent to both:
[User] Original question
[Assistant] Claude's selected response from Turn 1
[User] Follow-up question
```

## Context Building Logic

```javascript
function buildContext(conversationId, newMessage) {
  const messages = getMessages(conversationId);
  const context = [];
  
  for (const msg of messages) {
    if (msg.role === 'user') {
      context.push({ role: 'user', content: msg.content });
    } else {
      // Use SELECTED response for context
      const selected = getSelectedResponse(msg.id);
      context.push({ role: 'assistant', content: selected.content });
    }
  }
  
  context.push({ role: 'user', content: newMessage });
  return context;
}
```

---

# UI Wireframes

## Main Layout

```
┌────────────────┬────────────────────────────────────────────┐
│   SIDEBAR      │              MAIN CHAT AREA                │
│                │                                            │
│ [🔍 Search]    │  ┌──────────────────────────────────────┐ │
│ [+ New Chat]   │  │ Conversation Title              [⚙️] │ │
│                │  └──────────────────────────────────────┘ │
│ TODAY          │                                            │
│ ├─ Quantum...  │  ┌──────────────────────────────────────┐ │
│ ├─ ML Basics   │  │ USER MESSAGE                         │ │
│ └─ Code Review │  │ Explain quantum computing            │ │
│                │  └──────────────────────────────────────┘ │
│ YESTERDAY      │                                            │
│ ├─ API Design  │  ┌──────────────────────────────────────┐ │
│ └─ Bug Fix     │  │ ENGINE RESPONSES                     │ │
│                │  │ ┌────────┐ ┌────────┐ ┌────────┐    │ │
│ 📁 FOLDERS     │  │ │ GPT-4  │ │ Claude │ │ Gemini │    │ │
│ ├─ Work        │  │ │  ✓     │ │        │ │        │    │ │
│ └─ Personal    │  │ └────────┘ └────────┘ └────────┘    │ │
│                │  │                                      │ │
│ [🗑️ Archived]  │  │ Quantum computing is a type of...   │ │
│                │  │                                      │ │
│                │  │ [👍] [👎] [📋 Copy] [🔄 Retry]      │ │
│                │  └──────────────────────────────────────┘ │
│                │                                            │
│                │  ┌──────────────────────────────────────┐ │
│                │  │ [Engines: GPT-4 ✓ | Claude ✓ | ...]  │ │
│                │  │ ┌────────────────────────────────┐   │ │
│                │  │ │ Type your message...       [➤] │   │ │
│                │  │ └────────────────────────────────┘   │ │
│                │  │ [📎 Attach] [🎤 Voice]               │ │
│                │  └──────────────────────────────────────┘ │
└────────────────┴────────────────────────────────────────────┘
```

## Sidebar Detail

```
┌────────────────────────────┐
│    CONVERSATION LIST       │
├────────────────────────────┤
│ 🔍 Search conversations... │
├────────────────────────────┤
│ ➕ New Conversation        │
├────────────────────────────┤
│ ── 📌 PINNED ────────────  │
│ ┌────────────────────────┐ │
│ │ 💬 Quantum Computing   │ │
│ │    GPT-4, Claude       │ │
│ │    "The wave func..."  │ │
│ │    2h ago • 12 msgs    │ │
│ └────────────────────────┘ │
├────────────────────────────┤
│ ── TODAY ────────────────  │
│ ┌────────────────────────┐ │
│ │ 💬 ML Basics           │ │
│ │    GPT-4, Gemini       │ │
│ │    "Neural networks..."│ │
│ │    4h ago • 8 msgs     │ │
│ └────────────────────────┘ │
├────────────────────────────┤
│ ── 📁 FOLDERS ───────────  │
│ ▶ 📁 Work (12)             │
│ ▶ 📁 Personal (5)          │
│ ▶ 📁 Research (8)          │
└────────────────────────────┘
```

## Multi-Engine Response Grid

```
┌─────────────────────────────────────────────────────────────┐
│ VIEW: [Grid ▣] [Tabs 📑] [Compare ⚖️]                      │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────┐  ┌─────────────────────┐           │
│ │ 🟢 GPT-4           │  │ 🟣 Claude-3        │           │
│ │ ───────────────────│  │ ───────────────────│           │
│ │ REST and GraphQL   │  │ Let me break down  │           │
│ │ are both API       │  │ the differences:   │           │
│ │ architectures...   │  │ **REST:**          │           │
│ │                    │  │ - Multiple endpts  │           │
│ │ ⏱️ 1.2s  📊 450tok │  │ ⏱️ 0.9s  📊 380tok │           │
│ │ 💰 $0.0045         │  │ 💰 $0.0038         │           │
│ │ [✓ Select] [👍]    │  │ [✓ Select] [👍]    │           │
│ └─────────────────────┘  └─────────────────────┘           │
│ ┌─────────────────────┐  ┌─────────────────────┐           │
│ │ 🔵 Gemini          │  │ 🟠 Mistral         │           │
│ │ ───────────────────│  │ ───────────────────│           │
│ │ Great question!    │  │ REST and GraphQL   │           │
│ │ REST and GraphQL   │  │ are two paradigms  │           │
│ │ represent two...   │  │ for building...    │           │
│ │                    │  │                    │           │
│ │ ⏱️ 0.8s  📊 320tok │  │ ⏱️ 1.5s  📊 410tok │           │
│ │ 💰 $0.0032         │  │ 💰 $0.0041         │           │
│ │ [✓ Select] [👍]    │  │ [✓ Select] [👍]    │           │
│ └─────────────────────┘  └─────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

## Engine Selector

```
┌─────────────────────────────────────────────────────────────┐
│                    ENGINE SELECTOR                          │
├─────────────────────────────────────────────────────────────┤
│ Active Engines for this Conversation:                       │
│                                                             │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│ │ ✓ GPT-4 │ │ ✓ Claude│ │  Gemini │ │ Mistral │           │
│ │ $0.03/1K│ │ $0.015/K│ │ $0.001/K│ │ $0.002/K│           │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
│                                                             │
│ Context for new engines:                                    │
│ ○ Full Context (send all messages)                         │
│ ● Summary (AI summary + last 3 msgs)                       │
│ ○ Fresh Start (no context)                                 │
│                                                             │
│ [Cancel]                              [Apply Changes]       │
└─────────────────────────────────────────────────────────────┘
```

## Mobile View

```
┌─────────────────────┐
│ ☰ OneMind AI  [👤]  │
├─────────────────────┤
│ Quantum Computing   │
│ ━━━━━━━━━━━━━━━━━━ │
│ ┌─────────────────┐ │
│ │ You             │ │
│ │ Explain quantum │ │
│ │ computing       │ │
│ └─────────────────┘ │
│ ┌─────────────────┐ │
│ │ 🟢 GPT-4 ✓     │ │
│ │ ───────────────│ │
│ │ Quantum is...  │ │
│ │ [See 3 more ▼] │ │
│ └─────────────────┘ │
├─────────────────────┤
│ [GPT-4 ✓] [Claude] │
│ ┌─────────────────┐ │
│ │ Message...  [➤] │ │
│ └─────────────────┘ │
└─────────────────────┘
```

---

# Implementation Roadmap

## Phase 1: Database & Basic CRUD (Week 1-2)
- [ ] Create Supabase tables with RLS policies
- [ ] Implement conversation CRUD API
- [ ] Basic message storage

## Phase 2: Multi-Engine Support (Week 2-3)
- [ ] Engine response storage
- [ ] Response selection logic
- [ ] Context building algorithm

## Phase 3: UI Components (Week 3-4)
- [ ] ChatSidebar with conversation list
- [ ] MessageList with multi-engine view
- [ ] EngineSelector component

## Phase 4: Advanced Features (Week 4-5)
- [ ] Search functionality
- [ ] Folders and organization
- [ ] Export (Markdown, JSON, PDF)

## Phase 5: Polish (Week 5-6)
- [ ] Mobile responsive design
- [ ] Performance optimization
- [ ] Testing and bug fixes
