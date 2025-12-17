# Phase 6: System Diagram - Config Fetching Architecture

**Created:** 2025-12-15 | **Version:** 1.0

---

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     SUPABASE DATABASE                           │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  provider_config Table (Single Source of Truth)          │  │
│  │  ┌────────────┬────────────┬──────────────┬──────────┐   │  │
│  │  │ provider   │ is_enabled │ max_output   │ rate_    │   │  │
│  │  │            │            │ _cap         │ limit_   │   │  │
│  │  ├────────────┼────────────┼──────────────┼──────────┤   │  │
│  │  │ openai     │ true       │ 16384        │ 3500     │   │  │
│  │  │ anthropic  │ true       │ 8192         │ 3500     │   │  │
│  │  │ gemini     │ true       │ 8192         │ 3600     │   │  │
│  │  │ mistral    │ true       │ 32768        │ 3600     │   │  │
│  │  │ ...        │ ...        │ ...          │ ...      │   │  │
│  │  └────────────┴────────────┴──────────────┴──────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         ↑                                      ↑
         │                                      │
    (Read)                                  (Read)
         │                                      │
         │                                      │
┌────────┴──────────────┐          ┌───────────┴──────────────┐
│   FRONTEND (React)    │          │   BACKEND (Node.js)      │
│                       │          │                          │
│ Phase 5 Complete ✅   │          │ Phase 6 (Minimal) ⏳     │
└───────────────────────┘          └──────────────────────────┘
```

---

## Frontend Data Flow (Phase 5 - Already Complete)

```
┌──────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React Component)                    │
│                                                                  │
│  src/OneMindAI.tsx                                               │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ const { systemConfig, providerConfig } = useAdminConfig()  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                            ↓                                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ useAdminConfig Hook (src/hooks/useAdminConfig.ts)          │ │
│  │                                                            │ │
│  │ 1. Check localStorage cache (5 min TTL)                   │ │
│  │    ↓ (if expired or missing)                              │ │
│  │ 2. Query Supabase: SELECT * FROM provider_config          │ │
│  │    ↓ (if error or offline)                                │ │
│  │ 3. Use DEFAULT_PROVIDER_CONFIG (hardcoded fallback)       │ │
│  │                                                            │ │
│  │ 4. Save to localStorage cache                             │ │
│  │ 5. Set up real-time listeners (auto-refresh on DB change) │ │
│  └────────────────────────────────────────────────────────────┘ │
│                            ↓                                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Use in Component:                                          │ │
│  │                                                            │ │
│  │ const maxTokens = getProviderMaxOutput(                    │ │
│  │   providerConfig,                                          │ │
│  │   'anthropic'  // Returns: 8192 (from DB or fallback)      │ │
│  │ );                                                         │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Cache Location: localStorage (browser storage)                 │
│  Cache Duration: 5 minutes                                      │
│  Fallback: DEFAULT_PROVIDER_CONFIG array                        │
└──────────────────────────────────────────────────────────────────┘
```

---

## Backend Data Flow (Phase 6 - New, Minimal)

```
┌──────────────────────────────────────────────────────────────────┐
│                  BACKEND (Node.js/Express)                       │
│                                                                  │
│  server/ai-proxy.cjs                                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ POST /api/anthropic                                        │ │
│  │                                                            │ │
│  │ const maxTokenLimit = await getProviderLimit(             │ │
│  │   'anthropic',                                             │ │
│  │   'max_output_cap',                                        │ │
│  │   8192  // ← Fallback value (hardcoded)                   │ │
│  │ );                                                         │ │
│  │                                                            │ │
│  │ max_tokens: Math.min(max_tokens, maxTokenLimit)            │ │
│  └────────────────────────────────────────────────────────────┘ │
│                            ↓                                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ getProviderLimit() Function (in ai-proxy.cjs)              │ │
│  │                                                            │ │
│  │ 1. Check in-memory cache (5 min TTL)                      │ │
│  │    ✅ Found? Return cached value                           │ │
│  │    ❌ Not found or expired? → Step 2                       │ │
│  │                                                            │ │
│  │ 2. Query Supabase:                                         │ │
│  │    SELECT * FROM provider_config WHERE provider = 'anthropic' │
│  │    ✅ Success? Cache + Return value                        │ │
│  │    ❌ Error/Offline? → Step 3                              │ │
│  │                                                            │ │
│  │ 3. Return Fallback (hardcoded):                            │ │
│  │    return fallback (8192)                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  Cache Location: In-memory variable (providerCache)             │
│  Cache Duration: 5 minutes                                      │
│  Fallback: Hardcoded in function call (e.g., 8192)              │
└──────────────────────────────────────────────────────────────────┘
```

---

## Complete Request Flow: Frontend → Backend → Database

```
User sends prompt in OneMindAI.tsx
    ↓
Frontend checks: What's max_tokens for anthropic?
    ↓
useAdminConfig() reads from localStorage cache
    ↓ (if cache valid)
Returns: 8192 (from cache)
    ↓
Frontend sends to backend: POST /api/anthropic with max_tokens=1000
    ↓
Backend receives request
    ↓
Backend checks: What's max_output_cap for anthropic?
    ↓
getProviderLimit() checks in-memory cache
    ↓ (if cache valid)
Returns: 8192 (from cache)
    ↓
Backend enforces: Math.min(1000, 8192) = 1000
    ↓
Backend sends to Anthropic API with max_tokens=1000
    ↓
Anthropic returns response
    ↓
Frontend displays result
```

---

## Cache & Fallback Comparison

### Frontend (Phase 5 - Already Done ✅)

| Aspect | Details |
|--------|---------|
| **Cache Type** | localStorage (browser storage) |
| **Cache Key** | `onemindai-admin-config` |
| **Cache Duration** | 5 minutes |
| **Fallback Source** | `DEFAULT_PROVIDER_CONFIG` array (hardcoded) |
| **Real-time Updates** | Yes - Supabase listeners auto-refresh |
| **Code Location** | `src/hooks/useAdminConfig.ts` |

**Example Fallback:**
```typescript
const DEFAULT_PROVIDER_CONFIG: ProviderConfigItem[] = [
  { provider: 'anthropic', is_enabled: true, max_output_cap: 8192, ... },
  { provider: 'openai', is_enabled: true, max_output_cap: 16384, ... },
  // ... more providers
];
```

---

### Backend (Phase 6 - New ⏳)

| Aspect | Details |
|--------|---------|
| **Cache Type** | In-memory variable (Node.js process) |
| **Cache Variable** | `providerCache` object |
| **Cache Duration** | 5 minutes |
| **Fallback Source** | Hardcoded in function call (e.g., `8192`) |
| **Real-time Updates** | No (cache expires, then refetches) |
| **Code Location** | `server/ai-proxy.cjs` |

**Example Fallback:**
```javascript
// In each route:
const maxTokenLimit = await getProviderLimit('anthropic', 'max_output_cap', 8192);
//                                                                              ↑
//                                                                    Fallback value
```

---

## Why Different Fallback Strategies?

| Layer | Why | Fallback Type |
|-------|-----|---------------|
| **Frontend** | React component needs all config at once | Full array (`DEFAULT_PROVIDER_CONFIG`) |
| **Backend** | Each route only needs one value | Inline hardcoded value (e.g., `8192`) |

---

## Database Queries

### Frontend Query (Phase 5)
```sql
-- useAdminConfig.ts, line 164-166
SELECT provider, is_enabled, max_output_cap, rate_limit_rpm, 
       timeout_seconds, retry_count
FROM provider_config
ORDER BY provider ASC;
```

### Backend Query (Phase 6)
```sql
-- ai-proxy.cjs, getProviderLimit() function
SELECT *
FROM provider_config
WHERE provider = 'anthropic';  -- Dynamic based on route
```

---

## What Happens When Admin Changes a Value?

### Scenario: Admin changes Anthropic max_output_cap from 8192 → 12000

```
1. Admin updates database:
   UPDATE provider_config SET max_output_cap = 12000 WHERE provider = 'anthropic'
   
2. Frontend (Real-time):
   ✅ Supabase listener triggers immediately
   ✅ localStorage cache cleared
   ✅ New value fetched and cached
   ✅ Component re-renders with new value
   
3. Backend (Polling):
   ⏳ Waits for cache to expire (5 minutes)
   ⏳ Next request triggers getProviderLimit()
   ✅ Queries database, gets 12000
   ✅ Caches new value
   ✅ Uses 12000 for future requests
```

---

## Fallback Scenarios

### Scenario 1: Database is Down

```
Frontend:
  useAdminConfig() tries to query Supabase
  ❌ Error: Connection refused
  ✅ Falls back to DEFAULT_PROVIDER_CONFIG
  ✅ Component works with hardcoded defaults

Backend:
  getProviderLimit() tries to query Supabase
  ❌ Error: Connection refused
  ✅ Returns fallback value (8192)
  ✅ Request continues with hardcoded limit
```

### Scenario 2: Supabase Not Configured

```
Frontend:
  isSupabaseConfigured() = false
  ✅ Skips database query
  ✅ Uses DEFAULT_PROVIDER_CONFIG immediately

Backend:
  supabase = null
  ✅ getProviderLimit() returns fallback (8192)
  ✅ Request continues with hardcoded limit
```

### Scenario 3: Cache is Valid

```
Frontend:
  localStorage has valid cache (< 5 min old)
  ✅ Returns cached value immediately
  ✅ No database query

Backend:
  providerCache has valid data (< 5 min old)
  ✅ Returns cached value immediately
  ✅ No database query
```

---

## Summary Table

| Component | Cache | Fallback | Real-time | Location |
|-----------|-------|----------|-----------|----------|
| **Frontend** | localStorage | DEFAULT array | ✅ Yes | Browser |
| **Backend** | In-memory | Hardcoded | ❌ No (5 min) | Server RAM |
| **Database** | N/A | N/A | N/A | Supabase |

---

## Code Locations

| File | Purpose | Status |
|------|---------|--------|
| `src/hooks/useAdminConfig.ts` | Frontend config fetching | ✅ DONE (Phase 3) |
| `src/OneMindAI.tsx` | Uses config values | ✅ DONE (Phase 5) |
| `server/ai-proxy.cjs` | Backend config fetching | ⏳ TODO (Phase 6) |
| `supabase/migrations/001_initial_schema.sql` | Database tables | ✅ DONE (Phase 1) |

---

## Next Step: Phase 6 Implementation

Add to `server/ai-proxy.cjs`:

```javascript
// ~20 lines of code
const { createClient } = require('@supabase/supabase-js');

const supabase = process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)
  : null;

let providerCache = null;
let cacheTime = 0;

async function getProviderLimit(provider, field, fallback) {
  if (!supabase) return fallback;
  if (providerCache && Date.now() - cacheTime < 300000) {
    return providerCache[provider]?.[field] ?? fallback;
  }
  try {
    const { data } = await supabase.from('provider_config').select('*');
    providerCache = Object.fromEntries(data.map(r => [r.provider, r]));
    cacheTime = Date.now();
    return providerCache[provider]?.[field] ?? fallback;
  } catch {
    return fallback;
  }
}
```

Then use in each route:
```javascript
const maxTokenLimit = await getProviderLimit('anthropic', 'max_output_cap', 8192);
max_tokens: Math.min(max_tokens || 8192, maxTokenLimit)
```

---

**End of Diagram**
