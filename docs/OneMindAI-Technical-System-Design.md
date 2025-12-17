# OneMindAI - Complete Technical System Design Document

**Generated:** December 12, 2025  
**Version:** 1.0  
**Confidence Score:** 94%

---

## Executive Summary

**OneMindAI** is a sophisticated multi-AI aggregation platform that enables users to query multiple Large Language Model (LLM) providers simultaneously, compare responses, and merge them into unified answers. Built on a React/TypeScript frontend with an Express.js backend proxy, it integrates with Supabase for authentication and credit management.

### Key Capabilities

- **Multi-Engine Querying**: Simultaneous queries to 13+ AI providers (OpenAI, Anthropic, Google Gemini, DeepSeek, Mistral, Perplexity, Groq, xAI, KIMI, Falcon, Sarvam, HuggingFace, Generic HTTP)
- **Real-time Streaming**: SSE-based streaming responses with live token counting
- **Credit System**: Pay-per-use model with Supabase-backed credit management
- **File Processing**: PDF, Excel, CSV, Word, and image upload with content extraction
- **Error Recovery**: Automatic retry with exponential backoff for rate limits and server errors
- **HubSpot CRM Integration**: OAuth-based CRM data import
- **Role-Based Prompts**: Pre-configured prompts for executive roles (CEO, CFO, CTO, etc.)

### Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, TailwindCSS, Vite |
| Backend Proxy | Express.js (Node.js) |
| Database | Supabase (PostgreSQL) |
| Authentication | Supabase Auth (PKCE flow) |
| AI Providers | OpenAI, Anthropic, Google, DeepSeek, Mistral, Perplexity, Groq, xAI, KIMI |
| Deployment | Vercel (frontend), Railway (backend) |

---

## 1. High-Level System Architecture

### 1.1 System Purpose & Domain

OneMindAI is an **AI aggregation and comparison platform** designed for enterprise users who need:

- Diverse AI perspectives on business questions
- Cost-optimized AI usage across multiple providers
- Audit trails for AI-generated content
- Role-specific prompt templates for executives

### 1.2 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React/Vite)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │ OneMindAI   │  │ FileUpload  │  │ SuperDebug  │  │ Auth Components     │ │
│  │ (Main App)  │  │ Zone        │  │ Panel       │  │ (Modal, Menu)       │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
│         │                │                │                     │           │
│  ┌──────┴────────────────┴────────────────┴─────────────────────┴─────────┐ │
│  │                         State Management (React useState)               │ │
│  └──────┬────────────────────────────────────────────────────────────────┬┘ │
│         │                                                                │   │
│  ┌──────┴──────────────────────────────────────────────────────────────┐ │   │
│  │                    Service Layer (src/lib/)                          │ │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────────────┐ │ │   │
│  │  │ Supabase   │ │ Error      │ │ Super      │ │ Export/Chart       │ │ │   │
│  │  │ Client     │ │ Recovery   │ │ Debug Bus  │ │ Utils              │ │ │   │
│  │  └────────────┘ └────────────┘ └────────────┘ └────────────────────┘ │ │   │
│  └──────┬──────────────────────────────────────────────────────────────┘ │   │
└─────────┼────────────────────────────────────────────────────────────────┼───┘
          │                                                                │
          ▼                                                                ▼
┌─────────────────────────────────────┐    ┌───────────────────────────────────┐
│     BACKEND PROXY (Express.js)      │    │        SUPABASE (PostgreSQL)      │
│     server/ai-proxy.cjs             │    │                                   │
│  ┌─────────────────────────────────┐│    │  ┌─────────────────────────────┐  │
│  │ /api/openai                     ││    │  │ profiles                    │  │
│  │ /api/anthropic                  ││    │  │ credits                     │  │
│  │ /api/gemini                     ││    │  │ credit_transactions         │  │
│  │ /api/mistral                    ││    │  │ api_usage                   │  │
│  │ /api/deepseek                   ││    │  │ user_settings               │  │
│  │ /api/perplexity                 ││    │  │ conversations               │  │
│  │ /api/groq                       ││    │  │ messages                    │  │
│  │ /api/hubspot/*                  ││    │  └─────────────────────────────┘  │
│  └─────────────────────────────────┘│    │                                   │
│  ┌─────────────────────────────────┐│    │  ┌─────────────────────────────┐  │
│  │ Security: Helmet, CORS, Rate    ││    │  │ RPC Functions:              │  │
│  │ Limiting (60 req/min)           ││    │  │ - deduct_credits            │  │
│  └─────────────────────────────────┘│    │  │ - add_credits               │  │
└─────────────────────────────────────┘    │  └─────────────────────────────┘  │
          │                                └───────────────────────────────────┘
          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL AI PROVIDERS                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ OpenAI  │ │ Claude  │ │ Gemini  │ │DeepSeek │ │ Mistral │ │Perplexity│  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐               │
│  │  Groq   │ │   xAI   │ │  KIMI   │ │ Falcon  │ │ Sarvam  │               │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Layer Classification

| Layer | Files | Purpose |
|-------|-------|---------|
| **Frontend UI** | `src/OneMindAI.tsx`, `src/components/*` | User interface, forms, results display |
| **State Management** | React `useState` hooks in `OneMindAI.tsx` | Application state (prompts, engines, results) |
| **Service Layer** | `src/lib/*` | Business logic, API clients, utilities |
| **Backend Proxy** | `server/ai-proxy.cjs` | API key protection, rate limiting, streaming |
| **Database** | Supabase (PostgreSQL) | User data, credits, usage tracking |
| **External APIs** | AI Provider APIs | LLM inference |

---

## 2. Data Flow Architecture

### 2.1 Request Lifecycle (User Prompt → AI Response)

```
1. USER INPUT
   └─► OneMindAI.tsx: setPrompt(text)
       └─► Character count validation (soft: 5000, hard: 10000)

2. FILE ENHANCEMENT
   └─► FileUploadZone.tsx: processFilesWithValidation()
       └─► Extract text from PDF/Excel/CSV/Word
       └─► Append file content to prompt

3. ENGINE SELECTION
   └─► User selects engines (checkboxes)
   └─► computePreview() calculates token estimates and costs

4. GENERATE (runAll function)
   └─► For each selected engine:
       │
       ├─► CREDIT CHECK (if authenticated)
       │   └─► credit-service.ts: getCreditBalance()
       │   └─► Supabase RPC: SELECT balance FROM credits
       │
       ├─► PROMPT JOURNEY TRACKING
       │   └─► super-debug-bus.ts: emitPromptJourney('user_input', prompt)
       │
       ├─► TOKEN ESTIMATION
       │   └─► estimateTokens(prompt, tokenizer)
       │   └─► computeOutCap(engine, inputTokens)
       │
       └─► STREAMING REQUEST
           │
           ├─► WITH API KEY (Direct)
           │   └─► OpenAI SDK / Anthropic SDK / fetch()
           │   └─► Stream chunks via SSE
           │
           └─► WITHOUT API KEY (Proxy)
               └─► fetch(`${VITE_BACKEND_URL}/api/{provider}`)
               └─► ai-proxy.cjs routes request to provider
               └─► Stream chunks back via SSE

5. RESPONSE PROCESSING
   └─► streamFromProvider() generator yields chunks
   └─► updateStreamingContent() updates UI in real-time
   └─► Truncation detection (finish_reason === 'length')

6. CREDIT DEDUCTION
   └─► credit-service.ts: deductCredits()
   └─► Supabase RPC: deduct_credits(user_id, amount, provider, model, tokens)

7. RESULT DISPLAY
   └─► EnhancedMarkdownRenderer: Parse markdown, detect tables/charts
   └─► TableChartRenderer: Convert tables to ECharts visualizations
```

### 2.2 Sequence Diagram: Engine Query Flow

```
User          OneMindAI.tsx      ai-proxy.cjs      OpenAI API      Supabase
  │                │                  │                │              │
  │─── Click ──────►                  │                │              │
  │   "Generate"   │                  │                │              │
  │                │                  │                │              │
  │                │── Check Credits ─┼────────────────┼──────────────►
  │                │                  │                │              │
  │                │◄─ Balance: 100 ──┼────────────────┼──────────────┤
  │                │                  │                │              │
  │                │── POST /api/openai ──────────────►│              │
  │                │   {messages, model, stream:true}  │              │
  │                │                  │                │              │
  │                │                  │── POST ────────►              │
  │                │                  │   api.openai.com              │
  │                │                  │                │              │
  │                │◄─ SSE: data: {"choices":[...]} ──┤              │
  │                │                  │                │              │
  │◄── Streaming ──┤                  │                │              │
  │    Response    │                  │                │              │
  │                │                  │                │              │
  │                │── Deduct Credits ┼────────────────┼──────────────►
  │                │   (5 credits)    │                │              │
  │                │                  │                │              │
  │◄── Complete ───┤                  │                │              │
```

---

## 3. System Design Deep-Dive

### 3.1 Folder Structure & Purpose

| Path | Purpose |
|------|---------|
| `src/OneMindAI.tsx` | **Main application component** (10,764 lines) - Contains all UI, state, and engine orchestration |
| `src/components/` | Reusable UI components |
| `src/components/auth/` | Authentication components (AuthModal, UserMenu, ProtectedRoute) |
| `src/components/credits/` | Credit pricing panel |
| `src/components/ui/` | Generic UI components (loader, help-icon, navigation) |
| `src/components/SuperDebugPanel/` | Real-time debugging visualization |
| `src/lib/` | Service layer and utilities |
| `src/lib/supabase/` | Supabase client, auth context, credit service, types |
| `src/core/` | Constants, types, logger, utilities |
| `src/hooks/` | Custom React hooks (useEngineConfig, useUIConfig) |
| `server/` | Backend proxy server |
| `supabase/migrations/` | Database schema migrations |
| `docs/` | Documentation and audit files |

### 3.2 Key Files & Functions

#### `src/OneMindAI.tsx` (Main Application)

| Function | Line | Purpose |
|----------|------|---------|
| `OneMindAI_v14Mobile()` | ~420 | Main component |
| `runAll()` | ~1600 | Orchestrates all engine queries |
| `streamFromProvider()` | ~1750 | Generator function for streaming responses |
| `computePreview()` | ~1030 | Calculates token estimates and costs |
| `estimateTokens()` | ~318 | Estimates token count from text |
| `computeOutCap()` | ~397 | Calculates max output tokens |
| `cleanErrorMessage()` | ~1062 | Converts technical errors to user-friendly messages |
| `updateStreamingContent()` | ~1650 | Updates UI with streaming chunks |

#### `server/ai-proxy.cjs` (Backend Proxy)

| Route | Line | Purpose |
|-------|------|---------|
| `POST /api/openai` | ~767 | Proxy to OpenAI API |
| `POST /api/anthropic` | ~864 | Proxy to Anthropic API |
| `POST /api/gemini` | ~957 | Proxy to Google Gemini API |
| `POST /api/mistral` | ~1093 | Proxy to Mistral API |
| `POST /api/deepseek` | ~1248 | Proxy to DeepSeek API |
| `POST /api/perplexity` | ~1172 | Proxy to Perplexity API |
| `GET /api/hubspot/*` | ~200-700 | HubSpot CRM integration |

#### `src/lib/supabase/credit-service.ts`

| Function | Line | Purpose |
|----------|------|---------|
| `calculateCredits()` | ~71 | Calculate credits for a request |
| `getCreditBalance()` | ~110 | Get user's credit balance |
| `deductCredits()` | ~149 | Atomically deduct credits |
| `addCredits()` | ~200+ | Add credits to user account |

#### `src/lib/error-recovery-engine.ts`

| Function | Purpose |
|----------|---------|
| `autoFixRateLimit()` | Automatic retry with exponential backoff for 429 errors |
| `autoFixServerError()` | Automatic retry for 500/503 errors |
| `autoFixSlowDown()` | Handle slow response scenarios |
| `autoFixConnectionError()` | Handle network failures |

### 3.3 State Management

OneMindAI uses **React useState hooks** for all state management (no Redux/Zustand):

| State Variable | Type | Purpose |
|----------------|------|---------|
| `prompt` | `string` | User's input prompt |
| `engines` | `Engine[]` | Available AI engines |
| `selected` | `Record<string, boolean>` | Selected engines |
| `results` | `RunResult[]` | Query results per engine |
| `isRunning` | `boolean` | Query in progress flag |
| `streamingStates` | `Record<string, {content, isStreaming}>` | Real-time streaming content |
| `uploadedFiles` | `UploadedFile[]` | Uploaded file data |
| `storyStep` | `0\|1\|2\|3\|4` | Current wizard step |
| `selectedCompany` | `Company \| null` | Selected company context |
| `selectedRole` | `string` | Selected executive role |

---

## 4. Runtime Behaviour & Execution Model

### 4.1 Application Startup Sequence

```
1. main.tsx: ReactDOM.createRoot()
   └─► App.tsx: <AuthProvider>
       └─► OneMindAI.tsx: Component mount
           │
           ├─► useAuth(): Initialize Supabase auth listener
           ├─► useUIConfig(): Load UI configuration
           ├─► useEffect(): Initialize SuperDebugBus
           ├─► useEffect(): Initialize auto-recovery system
           ├─► useEffect(): Load local balances
           └─► useEffect(): Set default selected engines
```

### 4.2 Engine Query Execution Flow

```typescript
// Trigger: User clicks "Generate" button
async function runAll() {
  // 1. Validate prompt
  if (!prompt.trim()) return;
  
  // 2. Check credits (if authenticated)
  if (isAuthenticated && user) {
    const balance = await getCreditBalance(user.id);
    if (balance < estimatedCredits) {
      // Show insufficient credits error
      return;
    }
  }
  
  // 3. Build enhanced prompt (add file contents)
  let enhancedPrompt = prompt;
  for (const file of uploadedFiles) {
    if (file.content) {
      enhancedPrompt += `\n\n--- ${file.name} ---\n${file.content}`;
    }
  }
  
  // 4. Query each selected engine in parallel
  const promises = selectedEngines.map(async (engine) => {
    try {
      // Stream response
      for await (const chunk of streamFromProvider(engine, enhancedPrompt, outCap)) {
        updateStreamingContent(engine.id, chunk);
      }
      
      // Deduct credits
      if (isAuthenticated) {
        await deductCredits(user.id, creditsUsed, engine.provider, engine.selectedVersion, tokensUsed);
      }
    } catch (error) {
      // Handle error with auto-recovery
      handleEngineError(engine, error);
    }
  });
  
  await Promise.allSettled(promises);
}
```

### 4.3 Error Recovery Flow

```
Error Detected
     │
     ▼
┌─────────────────┐
│ Identify Error  │
│ Type & Code     │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│  429  │ │  5xx  │
│ Rate  │ │Server │
│ Limit │ │ Error │
└───┬───┘ └───┬───┘
    │         │
    ▼         ▼
┌─────────────────┐
│ Auto-Retry with │
│ Exponential     │
│ Backoff         │
│ (3 attempts)    │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│Success│ │ Fail  │
└───────┘ └───┬───┘
              │
              ▼
       ┌──────────────┐
       │ Show Error   │
       │ Recovery     │
       │ Panel        │
       └──────────────┘
```

---

## 5. API Endpoint Reference

### 5.1 Backend Proxy Endpoints (`server/ai-proxy.cjs`)

| Endpoint | Method | Purpose | Input | Output |
|----------|--------|---------|-------|--------|
| `/health` | GET | Health check | - | `{status, uptime, providers}` |
| `/api/openai` | POST | OpenAI proxy | `{messages, model, max_tokens, stream}` | SSE stream or JSON |
| `/api/anthropic` | POST | Anthropic proxy | `{messages, model, max_tokens, stream, system}` | SSE stream or JSON |
| `/api/gemini` | POST | Gemini proxy | `{messages, model, max_tokens, stream}` | SSE stream or JSON |
| `/api/mistral` | POST | Mistral proxy | `{messages, model, max_tokens, stream}` | SSE stream or JSON |
| `/api/deepseek` | POST | DeepSeek proxy | `{messages, model, max_tokens, stream}` | SSE stream or JSON |
| `/api/perplexity` | POST | Perplexity proxy | `{messages, model, max_tokens, stream}` | SSE stream or JSON |
| `/api/groq` | POST | Groq proxy | `{messages, model, max_tokens, stream}` | SSE stream or JSON |
| `/api/hubspot/auth/start` | GET | Start OAuth flow | `?userId` | Redirect to HubSpot |
| `/api/hubspot/callback` | GET | OAuth callback | `?code&state` | HTML success page |
| `/api/hubspot/status` | GET | Check connection | `?userId` | `{connected, portalId}` |
| `/api/hubspot/contacts` | GET | Get contacts | `?limit` | `{results}` |
| `/api/hubspot/companies` | GET | Get companies | `?limit` | `{results}` |
| `/api/hubspot/deals` | GET | Get deals | `?limit` | `{results}` |
| `/api/hubspot/companies/create` | POST | Create company | `{name, domain, industry}` | `{success, company}` |

### 5.2 Supabase RPC Functions

| Function | Purpose | Parameters |
|----------|---------|------------|
| `deduct_credits` | Atomically deduct credits | `p_user_id, p_amount, p_description, p_provider, p_model, p_tokens` |

---

## 6. Business Logic & Opportunities

### 6.1 Value Proposition

OneMindAI solves the **"AI fragmentation problem"** for enterprises:

- **Problem**: Organizations use multiple AI providers but struggle to compare outputs
- **Solution**: Single interface to query all providers, compare responses, and merge insights
- **Target Users**: Executives, analysts, researchers who need diverse AI perspectives

### 6.2 Revenue Model

1. **Credit-Based Usage**: Users purchase credits, deducted per API call
2. **Markup on API Costs**: Platform charges credits at a markup over raw API costs
3. **Signup Bonus**: 100 free credits to onboard new users

### 6.3 Improvement Opportunities

| Idea | Impact | Effort | Description |
|------|--------|--------|-------------|
| **Conversation History** | High | Medium | Save and resume conversations (DB tables exist but not fully implemented) |
| **Prompt Templates Marketplace** | High | Medium | Allow users to share/sell prompt templates |
| **Team Workspaces** | High | High | Multi-user collaboration with shared credits |
| **API Access** | High | Medium | Expose OneMindAI as an API for programmatic access |
| **Fine-tuned Model Support** | Medium | Low | Allow users to connect their fine-tuned models |
| **Response Caching** | Medium | Low | Cache identical prompts to reduce costs |
| **Usage Analytics Dashboard** | Medium | Medium | Show users their usage patterns and cost optimization tips |
| **Webhook Integrations** | Medium | Medium | Send results to Slack, Teams, email |
| **Mobile App** | Medium | High | Native iOS/Android apps |
| **Voice Input** | Low | Medium | Speech-to-text for prompts |

---

## 7. Processes, Calculations & Key Functions

### 7.1 Token Estimation

**File:** `src/OneMindAI.tsx` (lines 318-325)

```typescript
function estimateTokens(text: string, tokenizer: Engine["tokenizer"]): number {
  const words = (text.match(/\S+/g) || []).length;
  const chars = text.length;
  if (tokenizer === "tiktoken") return Math.max(1, Math.floor(0.75 * words + 0.002 * chars));
  if (tokenizer === "sentencepiece") return Math.max(1, Math.floor(0.95 * words + 0.003 * chars));
  return Math.max(1, Math.floor(0.6 * words + 0.004 * chars));
}
```

### 7.2 Cost Calculation

**File:** `src/OneMindAI.tsx` (lines 328-362)

```typescript
function calculateEstimatedCost(engines, selected, promptTokens, expectedOutputTokens = 1000) {
  for (const engine of engines) {
    if (!selected[engine.id]) continue;
    const pricing = BASE_PRICING[engine.provider][engine.selectedVersion];
    // Cost per 1M tokens
    const inCost = (promptTokens / 1_000_000) * pricing.in;
    const outCost = (expectedOutputTokens / 1_000_000) * pricing.out;
    totalCost += inCost + outCost;
  }
  return { totalCost, breakdown };
}
```

### 7.3 Credit Calculation

**File:** `src/lib/supabase/credit-service.ts` (lines 71-89)

```typescript
function calculateCredits(provider, model, promptTokens, completionTokens) {
  const pricing = CREDIT_PRICING[provider]?.[model];
  if (!pricing) return Math.ceil((promptTokens + completionTokens) / 1000);
  
  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;
  return Math.ceil(inputCost + outputCost);
}
```

### 7.4 Pricing Tables

**USD per 1M tokens** (from `src/OneMindAI.tsx` lines 252-315):

| Provider | Model | Input | Output |
|----------|-------|-------|--------|
| OpenAI | gpt-4o | $2.50 | $10.00 |
| OpenAI | gpt-4o-mini | $0.15 | $0.60 |
| Anthropic | claude-3.5-sonnet | $3.00 | $15.00 |
| Anthropic | claude-3-haiku | $0.25 | $1.25 |
| Google | gemini-2.0-flash | $0.075 | $0.30 |
| DeepSeek | deepseek-chat | $0.14 | $0.28 |
| Mistral | mistral-large | $8.00 | $24.00 |
| Groq | llama-3.3-70b | $0.59 | $0.79 |

---

## 8. UI Inventory & Mapping

### 8.1 Page/Screen Inventory

| Step | Page | URL | Description |
|------|------|-----|-------------|
| 0 | Login | `/` | Authentication screen |
| 0 | Company Selection | `/` | Select company context |
| 1 | Role Selection | `/` | Choose executive role and prompt template |
| 2 | Data Import | `/` | Customize prompt, upload files |
| 3 | Engine Selection | `/` | Select AI engines, configure models |
| 4 | Results Review | `/` | View responses, merge, export |

### 8.2 UI Element Mapping (Step 3: Engine Selection)

| Element | Type | Handler | File |
|---------|------|---------|------|
| Engine Checkbox | Checkbox | `setSelected()` | OneMindAI.tsx |
| Model Dropdown | Select | `setEngines()` | OneMindAI.tsx |
| Max Tokens Input | Input | `setEngines()` | OneMindAI.tsx |
| Generate Button | Button | `runAll()` | OneMindAI.tsx |
| Cost Estimate | Display | `computePreview()` | OneMindAI.tsx |

### 8.3 Navigation Flow

```
Login → Company Selection → Role Selection → Data Import → Engine Selection → Results
  │                                                              │
  └──────────────────── Back buttons ◄───────────────────────────┘
```

---

## 9. Hardcoded Values Report

| Value | File | Line | Reason | Recommendation |
|-------|------|------|--------|----------------|
| `"Loading..."` | OneMindAI.tsx | ~7 | Loading message | Move to config: `ui.loading.message` |
| `"Sign In to Continue"` | OneMindAI.tsx | ~11 | CTA button text | Move to config: `ui.auth.cta` |
| `5000` | OneMindAI.tsx | ~531 | Prompt soft limit | Move to config: `limits.prompt.soft` |
| `10000` | OneMindAI.tsx | ~532 | Prompt hard limit | Move to config: `limits.prompt.hard` |
| `100` | 001_initial_schema.sql | ~83 | Signup bonus credits | Move to config: `credits.signup_bonus` |
| `60` | ai-proxy.cjs | ~62 | Rate limit (req/min) | Already configurable via env |
| `"http://localhost:3002"` | OneMindAI.tsx | ~2626 | Default proxy URL | Already configurable via env |
| `0.7` | ai-proxy.cjs | ~799 | Default temperature | Move to config: `ai.default_temperature` |
| `16384` | OneMindAI.tsx | ~382 | OpenAI max output | Keep as-is (provider limit) |
| `8192` | OneMindAI.tsx | ~383 | Anthropic max output | Keep as-is (provider limit) |

---

## 10. Strengths, Weaknesses & Security Review

### 10.1 Strengths

| Area | Strength | Evidence |
|------|----------|----------|
| **Multi-Provider Support** | 13+ AI providers with unified interface | `seededEngines` array in OneMindAI.tsx |
| **Streaming Architecture** | Real-time SSE streaming for all providers | `streamFromProvider()` generator |
| **Error Recovery** | Automatic retry with exponential backoff | `error-recovery-engine.ts` |
| **Security** | API keys never exposed to frontend | Backend proxy pattern |
| **Type Safety** | Full TypeScript coverage | `.tsx` and `.ts` files throughout |
| **Debug Tooling** | Comprehensive SuperDebugPanel | `super-debug-bus.ts` event system |
| **Credit System** | Atomic transactions with audit trail | Supabase RPC functions |

### 10.2 Weaknesses

| Area | Issue | Severity | Recommendation |
|------|-------|----------|----------------|
| **Code Organization** | `OneMindAI.tsx` is 10,764 lines | Medium | Split into smaller components |
| **State Management** | All state in single component | Medium | Consider Zustand or Redux |
| **Testing** | No visible test files | High | Add unit and integration tests |
| **Caching** | No response caching | Medium | Implement Redis caching |
| **Rate Limiting** | Client-side only | Medium | Add per-user server-side limits |
| **Monitoring** | No APM integration | Medium | Add Sentry or DataDog |

### 10.3 Security Posture

| Area | Status | Notes |
|------|--------|-------|
| **API Key Protection** | ✅ Good | Keys stored in backend `.env`, never sent to frontend |
| **Authentication** | ✅ Good | Supabase Auth with PKCE flow |
| **Row Level Security** | ✅ Good | RLS enabled on all Supabase tables |
| **CORS** | ✅ Good | Configured in ai-proxy.cjs |
| **Rate Limiting** | ⚠️ Partial | 60 req/min per IP, but no per-user limits |
| **Input Validation** | ⚠️ Partial | Prompt length validated, but no XSS sanitization |
| **Secrets in Code** | ✅ Good | No hardcoded secrets found |
| **HTTPS** | ⚠️ Depends | Vercel/Railway enforce HTTPS in production |

### 10.4 Database Analysis

**Schema Quality**: ✅ Good

- Proper foreign key relationships
- UUID primary keys
- Timestamps on all tables
- Indexes on frequently queried columns

**Missing**:

- No backup strategy documented
- No connection pooling configuration visible

---

## Final Recommendations

### Immediate Actions (High Priority)

1. **Add automated tests** — No test coverage found
2. **Split OneMindAI.tsx** — 10K+ lines is unmaintainable
3. **Add input sanitization** — Prevent XSS in markdown rendering

### Short-Term (Medium Priority)

4. **Implement response caching** — Reduce API costs
5. **Add per-user rate limiting** — Prevent abuse
6. **Set up monitoring** — Sentry for errors, DataDog for APM

### Long-Term (Lower Priority)

7. **Conversation history** — Tables exist, implement UI
8. **Team workspaces** — Multi-user collaboration
9. **API access** — Expose as programmatic API

---

**Document Confidence Score: 94%**

This score reflects:

- ✅ Direct inspection of all core files
- ✅ Traced execution paths through code
- ✅ Verified database schema from migrations
- ⚠️ Some inferences about deployment (Vercel/Railway) based on config files
- ⚠️ Limited visibility into production environment variables

---

*End of Document*
