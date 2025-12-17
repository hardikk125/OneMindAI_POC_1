# OneMind AI - Page-by-Page Code Examination
## Step 1 (Role Selection) & Step 3 (Engine Selection)

**Generated:** December 9, 2025  
**Examiner:** Senior Code Examiner

---

# STEP 1: ROLE SELECTION

## Overview
Step 1 is the role selection screen shown when `storyMode === true && storyStep === 1`.

**Location:** `src/OneMindAI.tsx` (lines 5314-5668)

---

## FUNCTIONAL BUTTONS

| Button | Location | Functional? | Action | API Called? |
|--------|----------|-------------|--------|-------------|
| **Scroll Left** | Role carousel | YES | `container.scrollBy({ left: -300 })` | NO |
| **Scroll Right** | Role carousel | YES | `container.scrollBy({ left: 300 })` | NO |
| **Role Button** (12 roles) | Carousel | YES | `setSelectedRole(role.name)` | NO |
| **Add Role** | End of carousel | PARTIAL | `alert('Add Role feature coming soon!')` | NO |
| **Scroll Dots** | Below carousel | YES | `container.scrollTo({ left: i * 400 })` | NO |
| **Change Role** | Role details | YES | Clears `selectedRole`, `selectedRoleDetails`, `selectedFocusArea`, `selectedPromptPreview` | NO |
| **Focus Area Button** | Focus Areas panel | YES | `setSelectedFocusArea({id, title})` | NO |
| **Prompt Button** (A1, A2, B1...) | Focus Areas panel | YES | `setSelectedPromptPreview({id, title, template})` | NO |
| **Use This Prompt** | Prompt Preview | YES | `setPrompt(template); setStoryStep(2)` | NO |
| **Option 2 - Custom Prompt** | Footer | YES | `setPrompt(""); setStoryStep(2)` | NO |

---

## HARDCODED VALUES

### User Roles (HARDCODED - with Supabase fallback)
**File:** `src/hooks/useUIConfig.ts` (lines 72-85)

```typescript
const DEFAULT_USER_ROLES: UserRole[] = [
  { id: '1', name: 'CEO', title: 'Chief Executive Officer', category: 'Executive', ... },
  { id: '7', name: 'CDIO', title: 'Chief Digital & Information Officer', ... },
  { id: '12', name: 'Sales', title: 'Head of Sales', ... },
  { id: '2', name: 'CFO', title: 'Chief Financial Officer', ... },
  { id: '3', name: 'COO', title: 'Chief Operating Officer', ... },
  { id: '4', name: 'CTO', title: 'Chief Technology Officer', ... },
  { id: '5', name: 'CMO', title: 'Chief Marketing Officer', ... },
  { id: '6', name: 'CHRO', title: 'Chief Human Resources Officer', ... },
  { id: '8', name: 'CSO', title: 'Chief Strategy Officer', ... },
  { id: '9', name: 'CLO', title: 'Chief Legal Officer', ... },
  { id: '10', name: 'CRO', title: 'Chief Revenue Officer', ... },
  { id: '11', name: 'CPO', title: 'Chief Product Officer', ... },
]
```

**Status:** 12 roles hardcoded as fallback. If Supabase is configured, roles are fetched from `user_roles` table.

### Role Focus Areas (FULLY HARDCODED)
**File:** `src/OneMindAI.tsx` (lines 724-870+)

```typescript
const ROLE_FOCUS_AREAS: Record<string, Array<{id, title, prompts}>> = {
  "CEO": [
    { id: "strategy", title: "A. Strategic Vision & Planning", prompts: [...] },
    { id: "leadership", title: "B. Leadership & Culture", prompts: [...] },
    { id: "stakeholder", title: "C. Stakeholder Management", prompts: [...] },
  ],
  "CDIO": [
    { id: "digital", title: "A. Digital Transformation", prompts: [...] },
    { id: "data", title: "B. Data & AI Strategy", prompts: [...] },
    { id: "security", title: "C. Cybersecurity & Risk", prompts: [...] },
  ],
  "Sales": [
    { id: "market", title: "A. Market & Opportunity", prompts: [...] },
    { id: "prebid", title: "B. Pre-Bid Phase", prompts: [...] },
    { id: "bid", title: "C. Bid Phase", prompts: [...] },
    { id: "negotiation", title: "D. Negotiation & Closing", prompts: [...] },
    { id: "postwintransition", title: "E. Post-Win Transition", prompts: [...] },
  ],
  // ... more roles
}
```

**Status:** Focus areas and prompts are FULLY HARDCODED in OneMindAI.tsx. NOT from database.

### Role Display Order (HARDCODED)
```typescript
const order = ['Sales', 'CEO', 'CDIO'];
// Sales first, then CEO, then CDIO, then alphabetical
```

---

## DYNAMIC VALUES (from State)

| State Variable | Type | Initial Value | Source |
|---------------|------|---------------|--------|
| `selectedRole` | `string` | `""` | User selection |
| `selectedRoleDetails` | `{name, category} \| null` | `null` | User selection |
| `selectedFocusArea` | `{id, title} \| null` | `null` | User selection |
| `selectedPromptPreview` | `{id, title, template} \| null` | `null` | User selection |
| `userRoles` | `UserRole[]` | `DEFAULT_USER_ROLES` | Supabase or fallback |

---

## SUPABASE CONFIGURATION

### Tables Used

| Table | Used? | Purpose |
|-------|-------|---------|
| `user_roles` | YES | Role definitions (name, title, description) |
| `role_prompts` | YES | Prompt templates (NOT currently used in Step 1) |
| `mode_options` | YES | UI mode configuration |

### Data Flow
```typescript
// useUIConfig hook fetches from Supabase
const { userRoles } = useUIConfig();

// Roles displayed from userRoles state
{userRoles
  .filter(r => r.is_visible && r.is_enabled)
  .sort((a, b) => { /* custom order */ })
  .map((role) => (
    <button onClick={() => setSelectedRole(role.name)}>
      {role.name}
    </button>
  ))
}
```

### Real-time Subscription
```typescript
supabase.channel('role_prompts_changes')
  .on('postgres_changes', { event: '*', table: 'role_prompts' }, ...)
```

---

## API CALLS

**Step 1 makes NO external API calls.**

All data is either:
1. Fetched from Supabase on component mount (via `useUIConfig`)
2. Hardcoded in `ROLE_FOCUS_AREAS`

---

## COMPONENTS USED

### 1. Role Carousel (Inline)
Custom horizontal scrolling carousel with:
- Scroll buttons (left/right)
- Role buttons with silhouette icons
- Add Role button (placeholder)
- Scroll indicator dots

### 2. Focus Areas Panel (Inline)
Expandable accordion showing:
- Focus area headers (A, B, C...)
- Nested prompt buttons (A1, A2, B1...)

### 3. Prompt Preview Panel (Inline)
Shows selected prompt with:
- Title
- Template text with highlighted placeholders
- "Use This Prompt" button

---

## PROCESS FLOW DIAGRAM - STEP 1

```
┌─────────────────────────────────────────────────────────────────┐
│                      STEP 1: ROLE SELECTION                      │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  User arrives from Step 0 with:                                  │
│  - selectedCompany (from Step 0)                                 │
│                                                                  │
│  User sees:                                                      │
│  - "Choose Your Role And Tell Us What You'd Like To Do Next"    │
│  - Horizontal role carousel (12 roles)                           │
│  - Option 2: Custom prompt link                                  │
└─────────────────────────────────────────────────────────────────┘
                                │
            ┌───────────────────┴───────────────────┐
            ▼                                       ▼
┌─────────────────────────┐           ┌─────────────────────────┐
│  User clicks a ROLE     │           │ User clicks "Option 2"  │
│  (CEO, Sales, CDIO...)  │           │ Custom Prompt           │
└─────────────────────────┘           └─────────────────────────┘
            │                                       │
            ▼                                       ▼
┌─────────────────────────┐           ┌─────────────────────────┐
│ State updates:          │           │ setPrompt("")           │
│ - selectedRole = name   │           │ setStoryStep(2)         │
│ - selectedRoleDetails   │           │ → Go to Step 2          │
│ - clear focus/prompt    │           └─────────────────────────┘
└─────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│  ROLE DETAILS PANEL appears:                                     │
│  - Role name and title                                           │
│  - Description from userRoles                                    │
│  - "Change Role" button                                          │
└─────────────────────────────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────┐
│  FOCUS AREAS PANEL appears (from ROLE_FOCUS_AREAS):              │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ A. Strategic Vision & Planning  ▼                           │ │
│  │   └── A1. Growth Strategy Analysis                          │ │
│  │   └── A2. Market Expansion Strategy                         │ │
│  │   └── A3. Competitive Positioning                           │ │
│  │ B. Leadership & Culture  ▼                                  │ │
│  │ C. Stakeholder Management  ▼                                │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
            │
            ▼ (User clicks focus area)
┌─────────────────────────────────────────────────────────────────┐
│ setSelectedFocusArea({id, title})                                │
│ → Expands to show prompts                                        │
└─────────────────────────────────────────────────────────────────┘
            │
            ▼ (User clicks prompt A1, A2, etc.)
┌─────────────────────────────────────────────────────────────────┐
│ setSelectedPromptPreview({id, title, template})                  │
│                                                                  │
│ PROMPT PREVIEW PANEL shows:                                      │
│ - Prompt title                                                   │
│ - Template with [placeholders] highlighted                       │
│ - "Use This Prompt" button                                       │
└─────────────────────────────────────────────────────────────────┘
            │
            ▼ (User clicks "Use This Prompt")
┌─────────────────────────────────────────────────────────────────┐
│ setPrompt(selectedPromptPreview.template)                        │
│ setStoryStep(2)                                                  │
│ → Navigate to Step 2 with prompt pre-filled                      │
└─────────────────────────────────────────────────────────────────┘
```

---

# STEP 3: ENGINE SELECTION

## Overview
Step 3 is the AI engine selection screen shown when `storyMode === true && storyStep === 3`.

**Location:** `src/OneMindAI.tsx` (lines 5776-6345)

---

## FUNCTIONAL BUTTONS

| Button | Location | Functional? | Action | API Called? |
|--------|----------|-------------|--------|-------------|
| **"Choose your AI engines"** | Header | YES | `setShowRecommendedDropdown(false)` | NO |
| **"Run recommended engines"** | Header | YES | Auto-selects 6 engines, `setShowRecommendedDropdown(true)` | NO |
| **Engine Pill** (collapsed) | Engine grid | YES | `toggleExpand()` - expands engine card | NO |
| **Engine Checkbox** | Engine pill/card | YES | `toggleEngine(engine.id)` | NO |
| **Version Dropdown** | Expanded card | YES | `updateVersion(engine.id, version)` | NO |
| **API Key Input** | Expanded card | CONDITIONAL | `updateApiKey(engine.id, value)` | NO |
| **Show/Hide API Key** | Expanded card | YES | `setShowApiKey(prev => ...)` | NO |
| **Fetch Balance** | Expanded card | YES | `fetchBalance(engine)` | YES (provider API) |
| **Output Policy Dropdown** | Expanded card | CONDITIONAL | `updateOutPolicy(engine.id, mode)` | NO |
| **Price Override Inputs** | Expanded card | CONDITIONAL | `overridePrice(provider, version, type, value)` | NO |
| **Breakdown Details** | Cost summary | YES | Expands cost breakdown | NO |
| **Manage Balances** | Cost summary | YES | `setShowBalanceManager(true)` | NO |
| **Back** | Footer | YES | `setStoryStep(2)` | NO |
| **Run Engines** | Footer | YES | `setStoryStep(4); runAll()` | YES (AI APIs) |

---

## HARDCODED VALUES

### Engines Registry (FULLY HARDCODED)
**File:** `src/OneMindAI.tsx` (lines 172-185)

```typescript
const seededEngines: Engine[] = [
  { id: "openai", name: "ChatGPT", provider: "openai", tokenizer: "tiktoken", 
    contextLimit: 128_000, versions: ["gpt-4.1", "gpt-5-2025-08-07", "gpt-4o", ...], 
    selectedVersion: "gpt-4.1", outPolicy: { mode: "auto" } },
  { id: "claude", name: "Claude", provider: "anthropic", tokenizer: "sentencepiece", 
    contextLimit: 200_000, versions: ["claude-3.5-sonnet", ...], ... },
  { id: "gemini", name: "Gemini", provider: "gemini", tokenizer: "sentencepiece", 
    contextLimit: 1_000_000, versions: ["gemini-2.0-flash-exp", ...], ... },
  { id: "deepseek", name: "DeepSeek", provider: "deepseek", ... },
  { id: "mistral", name: "Mistral", provider: "mistral", ... },
  { id: "perplexity", name: "Perplexity", provider: "perplexity", ... },
  { id: "grok", name: "Grok", provider: "grok", ... },
  { id: "llama", name: "Llama", provider: "meta", ... },
  { id: "cohere", name: "Cohere", provider: "cohere", ... },
]
```

**Status:** 9 engines hardcoded. NOT from database.

### Recommended Engines (HARDCODED)
```typescript
const recommendedIds = ['openai', 'deepseek', 'mistral', 'perplexity', 'gemini', 'anthropic'];
```

### Default Selected Engines (HARDCODED)
```typescript
const defaultSelected = ['openai', 'deepseek', 'mistral'];
```

### Base Pricing (HARDCODED)
**File:** `src/OneMindAI.tsx` (lines ~100-170)

```typescript
const BASE_PRICING: Record<string, Record<string, { in: number; out: number; note?: string }>> = {
  openai: {
    "gpt-4.1": { in: 2.00, out: 8.00, note: "GPT-4.1 (latest)" },
    "gpt-4o": { in: 2.50, out: 10.00, note: "GPT-4o" },
    "gpt-4o-mini": { in: 0.15, out: 0.60, note: "GPT-4o Mini" },
    // ...
  },
  anthropic: {
    "claude-3.5-sonnet": { in: 3.00, out: 15.00, note: "Claude 3.5 Sonnet" },
    // ...
  },
  // ... other providers
}
```

### Provider Styles (HARDCODED)
```typescript
const providerStyles: Record<string, string> = {
  openai: 'bg-emerald-600',
  anthropic: 'bg-orange-600',
  gemini: 'bg-blue-600',
  deepseek: 'bg-indigo-600',
  mistral: 'bg-red-600',
  perplexity: 'bg-cyan-600',
  grok: 'bg-slate-800',
  meta: 'bg-blue-700',
  cohere: 'bg-purple-600',
}
```

### Engine UI Config (from Supabase Admin)
```typescript
const engineUiConfig = {
  showApiKeyField: boolean,      // Show/hide API key input
  showOutputPolicyField: boolean, // Show/hide output policy
  showPriceOverrideFields: boolean, // Show/hide price override
  infoDisplayMode: 'none' | 'compact' | 'detailed', // Engine info display
}
```

---

## DYNAMIC VALUES (from State)

| State Variable | Type | Initial Value | Source |
|---------------|------|---------------|--------|
| `engines` | `Engine[]` | `seededEngines` | Hardcoded |
| `selected` | `Record<string, boolean>` | `{openai: true, deepseek: true, mistral: true}` | User selection |
| `expandedEngines` | `Set<string>` | `new Set()` | User interaction |
| `showRecommendedDropdown` | `boolean` | `false` | User toggle |
| `priceOverrides` | `Record<...>` | `{}` | User input |
| `apiBalances` | `Record<string, {balance, loading, error}>` | `{}` | API response |

---

## SUPABASE CONFIGURATION

### Tables Used

| Table | Used? | Purpose |
|-------|-------|---------|
| `engine_ui_config` | YES | Controls which fields are visible |
| `engine_info_text` | YES | Engine descriptions and badges |
| `credits` | NO | Not used in Step 3 (used in Step 4) |

### Admin-Controlled UI
```typescript
// From Supabase admin panel
engineUiConfig.showApiKeyField      // Show API key input
engineUiConfig.showOutputPolicyField // Show output policy dropdown
engineUiConfig.showPriceOverrideFields // Show price override inputs
engineUiConfig.infoDisplayMode      // 'none' | 'compact' | 'detailed'
```

---

## API CALLS

### Balance Check (Per Engine)
**Triggered by:** "Fetch Balance" button (💰)

```typescript
async function fetchBalance(engine: Engine) {
  // Calls provider-specific balance endpoint
  // e.g., OpenAI: GET /api/openai/balance
  // Returns: { balance: "$X.XX remaining" } or error
}
```

### Run All Engines (Step 3 → Step 4)
**Triggered by:** "Run Engines" button

```typescript
async function runAll() {
  // For each selected engine:
  // POST /api/{provider}
  // Body: { prompt, model: engine.selectedVersion, ... }
  // Returns: AI response
}
```

**Backend:** `server/ai-proxy.cjs` handles all AI provider API calls

---

## COMPONENTS USED

### 1. Engine Grid (Inline)
Two-column grid of engine pills/cards:
- Collapsed: Pill with name, context, checkbox
- Expanded: Full card with version, API key, pricing, etc.

### 2. Cost Calculator (Inline)
Dynamic cost estimation showing:
- Estimated cost
- Engine count
- Input/output tokens
- Breakdown details

### 3. Summary Section (Inline)
Shows selected engines and navigation buttons.

---

## PROCESS FLOW DIAGRAM - STEP 3

```
┌─────────────────────────────────────────────────────────────────┐
│                      STEP 3: ENGINE SELECTION                    │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  User arrives from Step 2 with:                                  │
│  - selectedCompany (from Step 0)                                 │
│  - selectedRole (from Step 1)                                    │
│  - prompt (from Step 2)                                          │
│                                                                  │
│  User sees:                                                      │
│  - "Choose your AI engines" OR "Run recommended engines"         │
│  - 9 engine pills in 2-column grid                               │
│  - Cost calculator (if engines selected)                         │
└─────────────────────────────────────────────────────────────────┘
                                │
            ┌───────────────────┴───────────────────┐
            ▼                                       ▼
┌─────────────────────────┐           ┌─────────────────────────┐
│ "Choose your AI engines"│           │ "Run recommended"       │
│ (Manual selection)      │           │ (Auto-select 6)         │
└─────────────────────────┘           └─────────────────────────┘
            │                                       │
            ▼                                       ▼
┌─────────────────────────┐           ┌─────────────────────────┐
│ User clicks engine pill │           │ Auto-selects:           │
│ → Expands to full card  │           │ - ChatGPT               │
│                         │           │ - DeepSeek              │
│ User clicks checkbox    │           │ - Mistral               │
│ → Toggles selection     │           │ - Perplexity            │
└─────────────────────────┘           │ - Gemini                │
                                      │ - Claude                │
                                      └─────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  EXPANDED ENGINE CARD (if clicked):                              │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ [ChatGPT] ✓                                                 │ │
│  │ Version: [gpt-4.1 ▼]                                        │ │
│  │ API Key: [••••••••] 👁️ 💰                                   │ │
│  │ Output: [Auto ▼]                                            │ │
│  │ Price in: [2.00] Price out: [8.00]                          │ │
│  │ Context 128k • tiktoken                                     │ │
│  │ Min spend $0.01 • Max $0.05 • ETA 15s                       │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  COST CALCULATOR (updates dynamically):                          │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Est. Cost: $0.0234                                          │ │
│  │ Engines: 3 | In: 1,234 (500 chars) | Est. Out: ~2,000       │ │
│  │ [Breakdown ▼] [Manage Balances]                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
            ┌───────────────────┴───────────────────┐
            ▼                                       ▼
┌─────────────────────────┐           ┌─────────────────────────┐
│   "Back" Button         │           │  "Run Engines" Button   │
│   setStoryStep(2)       │           │  (disabled if 0 engines)│
│   → Return to Step 2    │           │                         │
└─────────────────────────┘           └─────────────────────────┘
                                                │
                                                ▼
                              ┌─────────────────────────────────┐
                              │ setStoryStep(4)                 │
                              │ runAll()                        │
                              │                                 │
                              │ For each selected engine:       │
                              │ → POST /api/{provider}          │
                              │ → Stream response               │
                              │ → Update results state          │
                              │                                 │
                              │ → Navigate to Step 4 (Results)  │
                              └─────────────────────────────────┘
```

---

## RUN ALL API FLOW

```
┌─────────────────┐
│ User clicks     │
│ "Run Engines"   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ runAll() function called                                         │
│                                                                  │
│ Validation:                                                      │
│ - selectedEngines.length > 0                                     │
│ - prompt.trim() !== ""                                           │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ For each selected engine (parallel):                             │
│                                                                  │
│ POST /api/{provider}                                             │
│ Headers: { Authorization: Bearer {apiKey} }                      │
│ Body: {                                                          │
│   model: engine.selectedVersion,                                 │
│   messages: [{ role: "user", content: prompt }],                 │
│   max_tokens: outCap,                                            │
│   stream: true                                                   │
│ }                                                                │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Backend: server/ai-proxy.cjs                                     │
│                                                                  │
│ Routes to provider:                                              │
│ - /api/openai → https://api.openai.com/v1/chat/completions      │
│ - /api/anthropic → https://api.anthropic.com/v1/messages        │
│ - /api/gemini → https://generativelanguage.googleapis.com/...   │
│ - /api/deepseek → https://api.deepseek.com/v1/chat/completions  │
│ - /api/mistral → https://api.mistral.ai/v1/chat/completions     │
│ - /api/perplexity → https://api.perplexity.ai/chat/completions  │
│ - /api/grok → https://api.x.ai/v1/chat/completions              │
│ - /api/meta → https://api.llama-api.com/chat/completions        │
│ - /api/cohere → https://api.cohere.ai/v1/chat                   │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Response streamed back to frontend                               │
│                                                                  │
│ setResults(prev => [...prev, {                                   │
│   engineId: engine.id,                                           │
│   response: streamedText,                                        │
│   tokens: { input, output },                                     │
│   cost: calculatedCost,                                          │
│   duration: elapsedMs                                            │
│ }])                                                              │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ Credit Deduction (after successful response):                    │
│                                                                  │
│ await deductCredits(userId, creditsUsed, provider, model, tokens)│
│                                                                  │
│ → Updates Supabase: credits, credit_transactions, api_usage      │
└─────────────────────────────────────────────────────────────────┘
```

---

## SUMMARY TABLE

| Category | Step 1 | Step 3 |
|----------|--------|--------|
| **Supabase Used** | YES (user_roles) | YES (engine_ui_config) |
| **API Calls** | NONE | Balance check, AI providers |
| **Hardcoded Data** | Focus areas, prompts | Engines, pricing, versions |
| **Dynamic Data** | Role selection | Engine selection, cost calc |
| **Functional Buttons** | 10+ | 12+ |
| **Non-functional UI** | "Add Role" button | None |

---

## RECOMMENDATIONS

### Step 1 Improvements
1. **Move ROLE_FOCUS_AREAS to Supabase** - Allow admin to manage focus areas and prompts
2. **Implement "Add Role" functionality** - Currently shows alert
3. **Add role icons** - Currently all roles use same silhouette
4. **Add role search/filter** - For organizations with many roles

### Step 3 Improvements
1. **Move engines to Supabase** - Allow admin to add/remove engines
2. **Add engine health monitoring** - Real-time status from providers
3. **Add cost history** - Show past usage and spending
4. **Add engine comparison** - Side-by-side capability comparison

---

## FILES REFERENCED

| File | Purpose |
|------|---------|
| `src/OneMindAI.tsx` | Main application component |
| `src/hooks/useUIConfig.ts` | Supabase config hook |
| `src/lib/supabase/client.ts` | Supabase client |
| `src/lib/supabase/credit-service.ts` | Credit operations |
| `server/ai-proxy.cjs` | Backend API proxy |
