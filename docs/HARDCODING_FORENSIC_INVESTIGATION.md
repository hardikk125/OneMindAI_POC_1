# 🔍 HARDCODING FORENSIC INVESTIGATION REPORT

**Date:** December 17, 2025  
**Investigator:** Cascade AI Systems Architect  
**Scope:** Full codebase analysis - Frontend, Backend, Integrations  
**Purpose:** Diagnostic & Accountability Exercise

---

## 🔎 PHASE 1: ROOT CAUSE ANALYSIS — WHY HARDCODING STILL EXISTS

Despite explicit architectural intent to externalize configuration via `system_config`, `provider_config`, and now `ai_models` tables, hardcoded values persist throughout the codebase. This section explains **why** this continues to happen.

### 1.1 AI Wipe-Coding Behavior

**Observation:** AI-assisted coding tools (Windsurf, Cursor, etc.) optimize for **immediate functionality** over **architectural consistency**.

- When generating new code, AI tools default to embedding values directly in logic
- AI lacks persistent memory of architectural decisions across sessions
- Each new feature request starts from scratch, re-introducing hardcoded patterns
- AI prioritizes "working code" over "configurable code"

**Evidence:** The `temperature: 0.7` value appears 25+ times across `OneMindAI.tsx`, `proxy-client.ts`, `streaming-client.ts`, `universal-ai-client.ts` — each instance added during different coding sessions.

### 1.2 Partial Refactors Without Cross-Layer Propagation

**Observation:** Refactors address one layer but leave other layers unchanged.

- Database tables (`system_config`, `provider_config`) were created
- Frontend hooks (`useAdminConfig`, `useAIModels`) were created
- **But:** The actual API call logic in `OneMindAI.tsx` still uses hardcoded values
- **But:** Backend proxy (`ai-proxy.cjs`) has its own hardcoded limits
- **But:** Multiple files define the same constants independently

**Evidence:**
- `PROVIDER_MAX_OUTPUT` in `OneMindAI.tsx` (lines 389-402) — hardcoded
- `BACKEND_CAPS` in `OneMindAI.tsx` (lines 1670-1677) — hardcoded
- `getProviderLimit()` in `ai-proxy.cjs` — fetches from DB but has fallback
- `DEFAULT_PROVIDER_CONFIG` in `useAdminConfig.ts` — hardcoded fallbacks

### 1.3 Frontend Assumptions Diverging from Backend Reality

**Observation:** Frontend and backend evolved independently with no shared contract.

- Frontend calculates `outCap` using `PROVIDER_MAX_OUTPUT`
- Backend caps using its own `getProviderLimit()` with different fallbacks
- No validation that frontend expectations match backend behavior
- Super Debug Panel was created specifically to expose these mismatches

**Evidence:** The `BACKEND_CAPS` object (line 1670) was added as a **workaround** to display what the backend might do — rather than having a single source of truth.

### 1.4 Hidden Defaults Disguised as "Safe Fallbacks"

**Observation:** Every database fetch has a fallback, creating shadow configuration.

Pattern observed throughout codebase:
```typescript
const value = getSystemConfig(config, 'key', 8192); // 8192 is a hidden default
```

- Fallbacks are necessary for resilience
- **But:** Fallbacks become the de facto configuration when DB is unavailable
- **But:** Fallbacks are scattered across 20+ files with no central registry
- **But:** Fallbacks are often copy-pasted with different values

**Evidence:**
- `DEFAULT_TOKEN_LIMIT = 8192` in `OneMindAI.tsx`
- `DEFAULT_TOKEN_LIMIT = 8192` in `useAIModels.ts` (different constant, same value)
- `max_output_cap: 8192` in `DEFAULT_PROVIDER_CONFIG` array
- `|| 8192` fallback in `getProviderLimit()` in `ai-proxy.cjs`

### 1.5 Time-Pressure Coding Patterns

**Observation:** Quick fixes become permanent fixtures.

- `MAX_PROMPT_LENGTH = 7000` was added to fix a 400 error
- Comment says "CRITICAL: Limit prompt length to avoid API 400 errors"
- This was a quick fix that never got migrated to database
- The database has `max_prompt_length` in `system_config` — but it's not used here

**Evidence:** Line 1625 in `OneMindAI.tsx`:
```typescript
const MAX_PROMPT_LENGTH = 7000; // Hardcoded despite DB config existing
```

### 1.6 Absence of Single Source of Truth (SSOT)

**Observation:** Configuration exists in multiple locations with no clear owner.

| Configuration | Location 1 | Location 2 | Location 3 |
|--------------|------------|------------|------------|
| Token Limits | `MODEL_TOKEN_LIMITS` (OneMindAI.tsx) | `ai_models` table | `FALLBACK_MODELS` (useAIModels.ts) |
| Pricing | `BASE_PRICING` (OneMindAI.tsx) | `ai_models` table | `BASE_PRICING` (core/constants.ts) |
| Provider Limits | `PROVIDER_MAX_OUTPUT` | `provider_config` table | `DEFAULT_PROVIDER_CONFIG` |
| Prompt Limits | `MAX_PROMPT_LENGTH` | `system_config` table | `LIMITS` object |

### 1.7 No Enforcement Mechanisms

**Observation:** Nothing prevents hardcoding from being introduced.

- No ESLint rules for magic numbers
- No CI checks for hardcoded values
- No architectural review process
- No config ownership documentation
- AI tools have no guardrails against hardcoding

---

## 🔬 PHASE 2: HARDCODING FORENSIC INVENTORY

### Complete Inventory Table

| # | Layer | File | Line/Function | Hardcoded Value | Category | Why Dangerous | Current Impact |
|---|-------|------|---------------|-----------------|----------|---------------|----------------|
| 1 | Frontend | `OneMindAI.tsx` | 193-250 | `MODEL_TOKEN_LIMITS` object | 🔴 CAT 1: Token Limits | Overrides database values | Admin panel settings ignored |
| 2 | Frontend | `OneMindAI.tsx` | 260-340 | `BASE_PRICING` object | 🟡 CAT 2: Pricing | Duplicate of database data | Pricing changes require code deploy |
| 3 | Frontend | `OneMindAI.tsx` | 389-402 | `PROVIDER_MAX_OUTPUT` object | 🔴 CAT 1: Token Limits | Ignores `provider_config.max_output_cap` | Admin settings have no effect |
| 4 | Frontend | `OneMindAI.tsx` | 1625 | `MAX_PROMPT_LENGTH = 7000` | 🟡 CAT 3: Prompt Limits | Ignores `system_config.max_prompt_length` | Admin setting unused |
| 5 | Frontend | `OneMindAI.tsx` | 1670-1677 | `BACKEND_CAPS` object | 🔴 CAT 1: Token Limits | Duplicates backend logic in frontend | Frontend/backend mismatch |
| 6 | Frontend | `OneMindAI.tsx` | 254 | `DEFAULT_TOKEN_LIMIT = 8192` | 🔴 CAT 1: Token Limits | Magic number fallback | Unknown models get arbitrary limit |
| 7 | Frontend | `OneMindAI.tsx` | 2038, 2216, etc. | `temperature: 0.7` (25+ instances) | 🟡 CAT 10: Temperature | Not configurable per provider | Users can't adjust creativity |
| 8 | Frontend | `OneMindAI.tsx` | 409 | `|| 4096` fallback | 🔴 CAT 1: Token Limits | Silent fallback | Unknown providers get low limit |
| 9 | Frontend | `OneMindAI.tsx` | 375 | `Math.round(((inTok + outTok) / 1000) * 3 + 2)` | 🟢 CAT 4: Token Estimation | Magic multipliers | Time estimates may be wrong |
| 10 | Frontend | `OneMindAI.tsx` | 1093 | `Math.min(1500, Math.max(300, ...))` | 🟢 CAT 4: Token Estimation | Output estimation bounds | Cost estimates may be wrong |
| 11 | Frontend | `OneMindAI.tsx` | 6573, 9458 | `excludedModels` array | 🟢 CAT 8: UI Config | Hardcoded model exclusions | Can't change without deploy |
| 12 | Frontend | `useAdminConfig.ts` | 44-77 | `DEFAULT_SYSTEM_CONFIG` array | 🟢 CAT 15: Correct (Fallback) | Necessary fallback | Acceptable pattern |
| 13 | Frontend | `useAdminConfig.ts` | 68-77 | `DEFAULT_PROVIDER_CONFIG` array | 🟢 CAT 15: Correct (Fallback) | Necessary fallback | Acceptable pattern |
| 14 | Frontend | `useAdminConfig.ts` | 84 | `CACHE_DURATION_MS = 5 * 60 * 1000` | 🟢 CAT 6: Cache Duration | Should be configurable | 5 min may be too long/short |
| 15 | Frontend | `useAIModels.ts` | 58-72 | `FALLBACK_MODELS` array | 🟢 CAT 15: Correct (Fallback) | Necessary fallback | Acceptable pattern |
| 16 | Frontend | `useAIModels.ts` | 79 | `CACHE_DURATION_MS = 5 * 60 * 1000` | 🟢 CAT 6: Cache Duration | Duplicate of #14 | Inconsistency risk |
| 17 | Frontend | `proxy-client.ts` | 9 | `'http://localhost:3002'` fallback | 🟢 CAT 11: Server Config | Dev URL in production code | Works but not ideal |
| 18 | Frontend | `proxy-client.ts` | 66, 82, 120, 136 | `temperature ?? 0.7` | 🟡 CAT 10: Temperature | Repeated default | Should be centralized |
| 19 | Frontend | `proxy-client.ts` | 66, 83, 120, 137 | `max_tokens || 4000` | 🔴 CAT 1: Token Limits | Arbitrary fallback | May truncate responses |
| 20 | Frontend | `balance-tracker.ts` | 23 | `'http://localhost:3001/api'` | 🟢 CAT 11: Server Config | Hardcoded dev URL | Breaks in production |
| 21 | Frontend | `balance-tracker.ts` | 28 | `CACHE_TTL = 5000` | 🟢 CAT 6: Cache Duration | 5 second cache | May cause stale data |
| 22 | Frontend | `error-recovery-engine.ts` | 378 | `15 * 60 * 1000` (15 min throttle) | 🟢 CAT 7: API Config | Throttle duration | May be too long |
| 23 | Frontend | `error-recovery-engine.ts` | 385 | `setTimeout(resolve, 5000)` | 🟢 CAT 7: API Config | 5 second wait | Arbitrary delay |
| 24 | Frontend | `request-throttler.ts` | 50 | `1000` (1 second window) | 🟢 CAT 7: API Config | Rate limit window | Should be configurable |
| 25 | Frontend | `request-throttler.ts` | 65 | `15 * 60 * 1000` default | 🟢 CAT 7: API Config | Throttle duration | Duplicate of #22 |
| 26 | Frontend | `streaming-client.ts` | 54, 76, 93, 120 | `temperature || 0.7` | 🟡 CAT 10: Temperature | Repeated default | Should be centralized |
| 27 | Frontend | `universal-ai-client.ts` | 96, 144, 184, 238 | `temperature || 0.7` | 🟡 CAT 10: Temperature | Repeated default | Should be centralized |
| 28 | Frontend | `claude-client.ts` | 49 | `temperature || 0.7` | 🟡 CAT 10: Temperature | Repeated default | Should be centralized |
| 29 | Frontend | `super-debug-bus.ts` | 1151 | `> 10000` (display truncation) | 🟢 CAT 5: UI Thresholds | Display limit | May hide important data |
| 30 | Frontend | `super-debug-bus.ts` | 1210 | `> 5000` (response truncation) | 🟢 CAT 5: UI Thresholds | Display limit | May hide important data |
| 31 | Frontend | `FileUploadZone.tsx` | 178, 600 | `'http://localhost:3005'` | 🟢 CAT 11: Server Config | Echo Intelligence URL | Hardcoded dev URL |
| 32 | Frontend | `HubSpotModal.tsx` | 128, 150 | `'http://localhost:3002/api/hubspot/...'` | 🟢 CAT 12: HubSpot | Hardcoded API URLs | Breaks in production |
| 33 | Frontend | `HubSpotSendButton.tsx` | 43 | `'http://localhost:3002/api/hubspot/...'` | 🟢 CAT 12: HubSpot | Hardcoded API URL | Breaks in production |
| 34 | Frontend | `CreditPricingPanel.tsx` | 84 | `PROFIT_MARKUP = 0.30` | 🟡 CAT 2: Pricing | Business-critical markup | Should be in DB |
| 35 | Frontend | `CreditPricingPanel.tsx` | 87 | `CREDITS_PER_USD = 100` | 🟡 CAT 2: Pricing | Exchange rate | Should be in DB |
| 36 | Frontend | `core/constants.ts` | 186-251 | `BASE_PRICING` object | 🟡 CAT 2: Pricing | Duplicate of OneMindAI.tsx | Two sources of truth |
| 37 | Frontend | `core/constants.ts` | 33-180 | `SEEDED_ENGINES` array | 🟢 CAT 9: Default Models | Engine definitions | Acceptable for bootstrap |
| 38 | Frontend | `config/constants.ts` | 40-64 | `TOKENIZER_CONFIG` | 🟢 CAT 4: Token Estimation | Tokenizer ratios | Empirically derived, OK |
| 39 | Frontend | Various | Multiple | `setTimeout(..., 3000)` | 🟢 CAT 5: UI Thresholds | UI feedback delays | Low impact |
| 40 | Frontend | Various | Multiple | `setTimeout(..., 5000)` | 🟢 CAT 5: UI Thresholds | Warning auto-clear | Low impact |
| 41 | Backend | `ai-proxy.cjs` | 25 | `CACHE_TTL = 5 * 60 * 1000` | 🟢 CAT 6: Cache Duration | Provider config cache | Should match frontend |
| 42 | Backend | `ai-proxy.cjs` | 46 | `PORT = 3002` | 🟢 CAT 11: Server Config | Server port | Uses env var with fallback |
| 43 | Backend | `ai-proxy.cjs` | 153 | `expires_in - 60` (60s buffer) | 🟢 CAT 7: API Config | Token refresh buffer | Magic number |
| 44 | Backend | `ai-proxy.cjs` | 908 | `8192` fallback for anthropic | 🔴 CAT 1: Token Limits | Fallback limit | May not match admin setting |
| 45 | Backend | `ai-proxy.cjs` | 1017 | `8192` fallback for gemini | 🔴 CAT 1: Token Limits | Fallback limit | May not match admin setting |
| 46 | Backend | `ai-proxy.cjs` | 1019 | `temperature: 0.7` | 🟡 CAT 10: Temperature | Default temperature | Not configurable |
| 47 | Backend | `ai-proxy-improved.cjs` | 26 | `PORT = 3002` | 🟢 CAT 11: Server Config | Server port | Uses env var |
| 48 | Backend | `ai-proxy-improved.cjs` | 38 | `RATE_LIMIT_WINDOW_MS = 60 * 1000` | 🟢 CAT 7: API Config | Rate limit window | Uses env var |
| 49 | Backend | `ai-proxy-improved.cjs` | 39 | `RATE_LIMIT_MAX = 60` | 🟢 CAT 7: API Config | Rate limit max | Uses env var |
| 50 | Backend | `code-guardian/llm-judge.cjs` | 144 | `maxContentLength = 8000` | 🟢 CAT 3: Prompt Limits | Content truncation | Code Guardian specific |
| 51 | Backend | `code-guardian/llm-judge.cjs` | 190, 246 | `temperature: 0.3` | 🟡 CAT 10: Temperature | Lower temp for judging | Intentional for consistency |
| 52 | Backend | `code-guardian/index.cjs` | 36 | `PORT = 4000` | 🟢 CAT 11: Server Config | Code Guardian port | Uses env var |
| 53 | Backend | `code-guardian/index.cjs` | 338 | `count = 100` default | 🟢 CAT 7: API Config | Default query param | Low impact |
| 54 | Backend | `balance-api.cjs` | 14 | `PORT = 3001` | 🟢 CAT 11: Server Config | Balance API port | Should use env var |
| 55 | Backend | `server-monitor.cjs` | 43 | `RESTART_WINDOW = 60000` | 🟢 CAT 7: API Config | Restart window | Should be configurable |

---

## 🧭 PHASE 3: DESTINATION MAPPING

### Where Each Value Should Live

| Hardcoded Value | Current Location | Correct Destination | Migration Priority |
|-----------------|------------------|---------------------|-------------------|
| `MODEL_TOKEN_LIMITS` | OneMindAI.tsx | `ai_models.max_output_tokens` | ✅ DONE (migration 007) |
| `BASE_PRICING` | OneMindAI.tsx, core/constants.ts | `ai_models.input_price_per_million`, `output_price_per_million` | ✅ DONE (migration 007) |
| `PROVIDER_MAX_OUTPUT` | OneMindAI.tsx | `provider_config.max_output_cap` | 🔴 HIGH - Still hardcoded |
| `MAX_PROMPT_LENGTH = 7000` | OneMindAI.tsx | `system_config.max_prompt_length` | 🔴 HIGH - Config exists but unused |
| `temperature: 0.7` | 25+ locations | `provider_config.default_temperature` | 🟡 MEDIUM - New column needed |
| `BACKEND_CAPS` | OneMindAI.tsx | DELETE - Use `provider_config` | 🔴 HIGH - Redundant |
| `CACHE_DURATION_MS` | useAdminConfig.ts, useAIModels.ts | `system_config.cache_duration_ms` | 🟢 LOW - Acceptable as is |
| `localhost:3002` | Multiple files | `env.VITE_BACKEND_URL` | 🟡 MEDIUM - Already uses env fallback |
| `localhost:3001` | balance-tracker.ts | `env.VITE_BALANCE_API_URL` | 🟡 MEDIUM - Needs env var |
| `localhost:3005` | FileUploadZone.tsx | `env.VITE_ECHO_INTELLIGENCE_URL` | 🟢 LOW - Feature-specific |
| `PROFIT_MARKUP = 0.30` | CreditPricingPanel.tsx | `system_config.profit_markup_percentage` | 🟡 MEDIUM - Business critical |
| `CREDITS_PER_USD = 100` | CreditPricingPanel.tsx | `system_config.credits_per_usd` | 🟡 MEDIUM - Business critical |
| `excludedModels` array | OneMindAI.tsx | `ai_models.is_live_streaming_supported` | 🟢 LOW - UI preference |
| Retry counts (4) | error-recovery-engine.ts | `system_config.max_retry_count` | 🟢 LOW - Acceptable default |
| Throttle duration (15 min) | error-recovery-engine.ts | `system_config.throttle_duration_ms` | 🟢 LOW - Acceptable default |

---

## 🧱 PHASE 4: ROOT FIX vs PATCHWORK ANALYSIS

### Critical Hardcoding Instances

#### 1. `PROVIDER_MAX_OUTPUT` (OneMindAI.tsx:389-402)

**Type:** 🔴 PATCHWORK

**Original Problem:** Needed to know provider-specific output limits to calculate `outCap`.

**Why It Became Permanent:** 
- Added before `provider_config` table existed
- When `provider_config` was created, this wasn't updated
- `computeOutCap()` function still references this constant

**What Would Break If Removed:**
- `computeOutCap()` would fail with undefined values
- All API calls would use fallback of 4096 tokens
- Response quality would degrade significantly

**True Root Fix:**
```typescript
// Replace PROVIDER_MAX_OUTPUT usage with:
const providerMax = getProviderMaxOutput(providerConfig, e.provider);
```

#### 2. `MAX_PROMPT_LENGTH = 7000` (OneMindAI.tsx:1625)

**Type:** 🔴 PATCHWORK

**Original Problem:** API was returning 400 errors for long prompts.

**Why It Became Permanent:**
- Quick fix added with "CRITICAL" comment
- `system_config.max_prompt_length` exists but wasn't wired up
- Developer didn't know the config existed

**What Would Break If Removed:**
- Long prompts would hit API limits
- 400 errors would return

**True Root Fix:**
```typescript
const MAX_PROMPT_LENGTH = getSystemConfig(systemConfig, 'max_prompt_length', 7000);
```

#### 3. `temperature: 0.7` (25+ locations)

**Type:** 🟡 PATCHWORK (but acceptable)

**Original Problem:** Every API call needs a temperature value.

**Why It Became Permanent:**
- No `temperature` column in `provider_config`
- Each API integration added its own default
- Copy-paste pattern propagated the value

**What Would Break If Removed:**
- API calls would fail (temperature is required)

**True Root Fix:**
1. Add `default_temperature` column to `provider_config`
2. Create `getProviderTemperature()` helper
3. Replace all hardcoded values

#### 4. `BACKEND_CAPS` object (OneMindAI.tsx:1670-1677)

**Type:** 🔴 PATCHWORK (should be deleted)

**Original Problem:** Frontend needed to display what backend would do.

**Why It Became Permanent:**
- Created for Super Debug Panel
- Duplicates backend logic in frontend
- No shared contract between layers

**What Would Break If Removed:**
- Super Debug Panel would show incorrect mismatch warnings
- Actually, this is GOOD — it would force proper integration

**True Root Fix:**
- DELETE this object entirely
- Have backend return its actual limits in response headers
- Or fetch `provider_config` in frontend (already done via `useAdminConfig`)

#### 5. `BASE_PRICING` duplication (OneMindAI.tsx AND core/constants.ts)

**Type:** 🔴 PATCHWORK

**Original Problem:** Needed pricing data for cost estimation.

**Why It Became Permanent:**
- Created before `ai_models` table
- Duplicated in two files during refactoring
- Neither file was cleaned up after DB migration

**What Would Break If Removed:**
- Nothing if `useAIModels` hook is used
- Fallback would use empty pricing (shows $0.00)

**True Root Fix:**
- Keep ONE fallback in `useAIModels.ts` (already done)
- Remove from `OneMindAI.tsx` (marked as fallback)
- Remove from `core/constants.ts` (duplicate)

---

## 🧨 PHASE 5: SYSTEMIC FAILURES POSTMORTEM

### Why This Keeps Happening

#### 1. No Config Contract Between Frontend & Backend

**Failure:** Frontend and backend evolved independently with no shared schema.

**Evidence:**
- Frontend has `PROVIDER_MAX_OUTPUT` with 13 providers
- Backend has `getProviderLimit()` with different fallbacks
- No TypeScript types shared between layers
- No API endpoint to fetch backend's actual configuration

**Impact:** Frontend displays one thing, backend does another. Users see incorrect estimates.

#### 2. No Enforcement Layer

**Failure:** Nothing prevents hardcoded values from being introduced.

**Evidence:**
- No ESLint rule for magic numbers
- No pre-commit hook checking for hardcoded values
- No CI/CD gate for configuration changes
- AI tools freely generate hardcoded values

**Impact:** Every new feature potentially introduces new hardcoding.

#### 3. No Config Ownership Rules

**Failure:** No documentation of which system owns which configuration.

**Evidence:**
- Token limits exist in 4 places
- Pricing exists in 3 places
- No CODEOWNERS file for config
- No architectural decision records (ADRs)

**Impact:** Developers don't know where to look or where to add new config.

#### 4. No CI Checks for Hardcoded Values

**Failure:** Build passes regardless of hardcoding.

**Evidence:**
- `npm run build` succeeds with 50+ hardcoded values
- No static analysis for configuration patterns
- No diff visibility for config changes

**Impact:** Hardcoding accumulates silently over time.

#### 5. AI Tools Optimizing for Speed Over Architecture

**Failure:** AI assistants prioritize working code over maintainable code.

**Evidence:**
- Each AI session regenerates defaults
- AI doesn't remember previous architectural decisions
- AI copies patterns from existing code (including bad patterns)
- No AI prompt guardrails for configuration

**Impact:** AI-assisted development accelerates hardcoding accumulation.

#### 6. No Runtime Observability of Config Flow

**Failure:** Can't see which config values are actually being used.

**Evidence:**
- Super Debug Panel was created as a workaround
- No logging of config source (DB vs fallback)
- No metrics on config cache hits/misses
- No alerts when fallbacks are used

**Impact:** Config failures are silent. Problems only discovered when users report issues.

#### 7. Silent Fallbacks Hiding Config Failures

**Failure:** Every config fetch has a fallback that masks failures.

**Evidence:**
- `getSystemConfig(config, 'key', 8192)` — if DB fails, 8192 is used silently
- No logging when fallback is used
- No distinction between "DB returned 8192" and "DB failed, using 8192"

**Impact:** Database configuration issues go unnoticed. Admin changes appear to have no effect.

---

## 🛡️ PHASE 6: PREVENTION RECOMMENDATIONS

### Enforceable Controls (Not Suggestions)

#### 1. ESLint Rule: No Magic Numbers

```javascript
// .eslintrc.js
rules: {
  'no-magic-numbers': ['error', {
    ignore: [0, 1, -1, 100],
    ignoreArrayIndexes: true,
    enforceConst: true,
    detectObjects: true
  }]
}
```

**Enforcement:** Build fails if magic numbers detected.

#### 2. Config Ownership Matrix

Create `CONFIG_OWNERS.md`:

| Config Category | Owner Table | Fallback Location | Code Owner |
|----------------|-------------|-------------------|------------|
| Token Limits | `ai_models` | `useAIModels.ts` | @ai-team |
| Pricing | `ai_models` | `useAIModels.ts` | @billing-team |
| Provider Settings | `provider_config` | `useAdminConfig.ts` | @platform-team |
| System Settings | `system_config` | `useAdminConfig.ts` | @platform-team |
| UI Settings | `ui_config` | `useUIConfig.ts` | @frontend-team |

**Enforcement:** PRs touching config require owner approval.

#### 3. Pre-Merge Architectural Checklist

Add to PR template:

```markdown
## Configuration Checklist
- [ ] No new hardcoded values introduced
- [ ] New config added to appropriate database table
- [ ] Fallback value documented in hook
- [ ] Config change tested via Admin Panel
- [ ] Frontend and backend use same config source
```

**Enforcement:** PR blocked until checklist completed.

#### 4. Config Diff Visibility

Add CI step to show config changes:

```yaml
- name: Config Diff Check
  run: |
    grep -rn "const.*=.*[0-9]{4,}" src/ --include="*.ts" --include="*.tsx" > config-snapshot.txt
    diff config-baseline.txt config-snapshot.txt || echo "⚠️ New hardcoded values detected"
```

**Enforcement:** Diff shown in PR, reviewer must acknowledge.

#### 5. Runtime Config Logging

```typescript
function getSystemConfig<T>(config: SystemConfigItem[], key: string, fallback: T): T {
  const item = config.find(c => c.key === key);
  if (!item) {
    console.warn(`[Config] Using fallback for ${key}: ${fallback}`);
    return fallback;
  }
  return item.value as T;
}
```

**Enforcement:** Fallback usage visible in console/logs.

#### 6. AI Prompt Guardrails

Add to AI assistant instructions:

```
CONFIGURATION RULES:
1. Never hardcode numeric values > 100
2. Always check for existing config in useAdminConfig, useAIModels, useUIConfig
3. New configuration must be added to database tables
4. Fallbacks must be in dedicated FALLBACK_* constants
5. Ask user before adding new hardcoded values
```

**Enforcement:** AI behavior modified at prompt level.

#### 7. Config Validation on Startup

```typescript
// src/lib/config-validator.ts
export function validateConfigIntegrity() {
  const warnings: string[] = [];
  
  // Check for config mismatches
  if (PROVIDER_MAX_OUTPUT.openai !== getProviderMaxOutput(providerConfig, 'openai')) {
    warnings.push('OpenAI max output mismatch between hardcoded and DB');
  }
  
  if (warnings.length > 0) {
    console.error('[Config Validation Failed]', warnings);
  }
}
```

**Enforcement:** Warnings visible in development console.

---

## 🎯 FINAL MANDATORY QUESTION

### "Is this hardcoding a root fix or patchwork — and what would break if we removed it today?"

**Answer: This is predominantly PATCHWORK with some acceptable fallbacks.**

#### Breakdown:

| Category | Count | Assessment |
|----------|-------|------------|
| 🔴 Critical Patchwork (must fix) | 8 | Token limits, prompt limits, backend caps |
| 🟡 Medium Patchwork (should fix) | 12 | Temperature, pricing markup, some URLs |
| 🟢 Acceptable Fallbacks | 35 | Cache durations, UI thresholds, server ports |

#### What Would Break If Removed Today:

1. **If `PROVIDER_MAX_OUTPUT` removed:** All API calls would use 4096 token limit. Responses would be truncated.

2. **If `MAX_PROMPT_LENGTH` removed:** Long prompts would cause 400 errors from APIs.

3. **If `temperature: 0.7` removed:** API calls would fail (required parameter).

4. **If `BASE_PRICING` removed:** Cost estimates would show $0.00 until DB loads.

5. **If `BACKEND_CAPS` removed:** Super Debug Panel would show incorrect warnings (actually beneficial).

6. **If `localhost:*` URLs removed:** App would fail to connect to backend in development.

#### Safe to Remove Today:

1. `BACKEND_CAPS` — Redundant, should use `provider_config`
2. `BASE_PRICING` in `core/constants.ts` — Duplicate, keep only in `useAIModels.ts`
3. `excludedModels` arrays — Should be in database

#### Requires Migration First:

1. `PROVIDER_MAX_OUTPUT` → Wire up `provider_config.max_output_cap`
2. `MAX_PROMPT_LENGTH` → Wire up `system_config.max_prompt_length`
3. `temperature: 0.7` → Add column to `provider_config`, create helper

---

## ✅ SUCCESS CRITERIA VERIFICATION

| Criteria | Status |
|----------|--------|
| New engineer can understand why system behaves this way | ✅ Phase 1 explains root causes |
| No hardcoded value remains unexplained | ✅ 55 values catalogued in Phase 2 |
| Every constant has a clear owner | ✅ Phase 3 maps destinations |
| Future AI-assisted changes become safer | ✅ Phase 6 provides guardrails |

---

**Report Complete.**

*This investigation identified 55 hardcoded values across 25+ files, explained why they exist despite architectural intent, and provided actionable remediation paths. The system is functional but fragile — admin panel changes often have no effect because hardcoded values take precedence.*
