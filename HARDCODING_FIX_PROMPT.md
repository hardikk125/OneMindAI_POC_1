# COMPREHENSIVE HARDCODING FIX PROMPT

## Executive Summary

This document outlines all hardcoded values and dead code that bypass admin panel configuration. The fixes will wire admin panel settings (system_config, provider_config, ai_models) into the actual API call flow while preserving fallbacks for resilience.

**Key Principle:** Admin panel settings must flow through to API calls. Fallbacks are only used when admin config is unavailable.

---

## PART 1: CURRENT BROKEN FLOWS

### Issue #1: Provider max_output_cap NOT USED

**Current Flow (BROKEN):**
```
Admin Panel
  ↓
providerConfig.max_output_cap = 327 (Mistral)
  ↓
IGNORED ❌
  ↓
PROVIDER_MAX_OUTPUT['mistral'] = 32768 (HARDCODED)
  ↓
computeOutCap() → returns 32768
  ↓
API Call: max_tokens: 32768
  ↓
Mistral ignores admin setting, returns full response
```

**Expected Flow (FIXED):**
```
Admin Panel
  ↓
providerConfig.max_output_cap = 327 (Mistral)
  ↓
useAdminConfig() hook reads it
  ↓
computeOutCap(engine, inputTokens, providerConfig) uses it
  ↓
API Call: max_tokens: 327
  ↓
Mistral respects admin setting, returns ~327 tokens
```

**Evidence:**
- Location: `@c:\Projects\OneMindAI\src\OneMindAI.tsx:383-397`
- Code:
```typescript
const PROVIDER_MAX_OUTPUT: Record<string, number> = {
  openai: 16384,
  anthropic: 8192,
  gemini: 8192,
  deepseek: 8192,
  mistral: 32768,  // ← HARDCODED, ignores admin panel
  perplexity: 4096,
  // ...
};

function computeOutCap(e: Engine, inputTokens: number): number {
  const providerMax = PROVIDER_MAX_OUTPUT[e.provider] || 4096;  // ← Uses hardcoded
  const availableTokens = Math.max(0, e.contextLimit - inputTokens);
  return Math.min(providerMax, Math.floor(availableTokens * 0.9));
}
```

**Impact:** Admin panel max_output_cap settings have ZERO effect on API calls.

---

### Issue #2: max_prompt_length NOT USED FROM ADMIN CONFIG

**Current Flow (BROKEN):**
```
Admin Panel
  ↓
systemConfig.max_prompt_length = 170
  ↓
IGNORED ❌
  ↓
MAX_PROMPT_LENGTH = 7000 (HARDCODED)
  ↓
Prompt truncated at 7000 chars
  ↓
Admin setting (170) is completely bypassed
```

**Expected Flow (FIXED):**
```
Admin Panel
  ↓
systemConfig.max_prompt_length = 170
  ↓
useAdminConfig() hook reads it
  ↓
Prompt truncated at 170 chars
  ↓
Admin setting controls behavior
```

**Evidence:**
- Location: `@c:\Projects\OneMindAI\src\OneMindAI.tsx:1586-1590`
- Code:
```typescript
const MAX_PROMPT_LENGTH = 7000;  // ← HARDCODED! Ignores admin config
const originalPromptLength = prompt.length;
if (prompt.length > MAX_PROMPT_LENGTH) {
  prompt = prompt.substring(0, MAX_PROMPT_LENGTH) + "...truncated message...";
}
```

**Impact:** Admin panel max_prompt_length setting is dead code, never used.

---

### Issue #3: prompt_chunk_size DEAD CODE

**Current Status:**
- Defined at: `@c:\Projects\OneMindAI\src\hooks\useAdminConfig.ts:48`
- Loaded at: `@c:\Projects\OneMindAI\src\OneMindAI.tsx:538`
- Used at: **NOWHERE** ❌

**Evidence:**
- Location: `@c:\Projects\OneMindAI\src\OneMindAI.tsx:535-540`
- Code:
```typescript
const LIMITS = {
  PROMPT_SOFT_LIMIT: getSystemConfig<number>(systemConfig, 'prompt_soft_limit', 5000),
  PROMPT_HARD_LIMIT: getSystemConfig<number>(systemConfig, 'prompt_hard_limit', 10000),
  PROMPT_CHUNK_SIZE: getSystemConfig<number>(systemConfig, 'prompt_chunk_size', 4000), // ← DEAD CODE
};
```

**Impact:** Wastes database queries and admin panel configuration. No actual chunking happens.

---

### Issue #4: Backend Hardcoded Token Limits (ai-proxy.cjs)

**Current Flow (BROKEN):**
```
Frontend API Call: max_tokens: 32768 (from PROVIDER_MAX_OUTPUT)
  ↓
Backend ai-proxy.cjs receives it
  ↓
Backend has HARDCODED fallbacks:
  - Line 908: 8192 for Anthropic
  - Line 1017: 8192 for Gemini
  - Line 1019: 8192 for Mistral
  ↓
Backend may override frontend value
  ↓
Inconsistent behavior between frontend and backend
```

**Evidence:**
- Location: `@c:\Projects\OneMindAI\server\ai-proxy.cjs:908, 1017, 1019`
- Code:
```javascript
// Anthropic
const outCap = req.body.max_tokens || 8192;  // ← HARDCODED fallback

// Gemini
const outCap = req.body.max_tokens || 8192;  // ← HARDCODED fallback

// Mistral
const outCap = req.body.max_tokens || 8192;  // ← HARDCODED fallback
```

**Impact:** Backend doesn't respect frontend's max_tokens, uses hardcoded fallback instead.

---

### Issue #5: Backend Temperature Hardcoded

**Current Flow (BROKEN):**
```
Frontend: temperature: 0.7 (HARDCODED in multiple places)
  ↓
Backend receives it
  ↓
Backend has HARDCODED default: temperature: 0.7
  ↓
No way to change temperature without code deploy
```

**Evidence:**
- Frontend: `@c:\Projects\OneMindAI\src\OneMindAI.tsx:2038, 2216, etc.` (25+ instances)
- Backend: `@c:\Projects\OneMindAI\server\ai-proxy.cjs:798, 882, 986, 1117, 1196, 1272`

**Impact:** Temperature not configurable via admin panel or provider_config.

---

## PART 2: FILES TO MODIFY

### File 1: `src/OneMindAI.tsx`

**Changes Required:**

#### Change 1.1: Replace PROVIDER_MAX_OUTPUT with dynamic lookup

**Location:** Lines 383-397

**Current Code:**
```typescript
const PROVIDER_MAX_OUTPUT: Record<string, number> = {
  openai: 16384,
  anthropic: 8192,
  gemini: 8192,
  deepseek: 8192,
  mistral: 32768,
  perplexity: 4096,
  groq: 8192,
  xai: 8192,
  kimi: 8192,
  falcon: 4096,
  sarvam: 4096,
  huggingface: 4096,
  generic: 4096,
};
```

**Fixed Code:**
```typescript
// KEEP as fallback only - for when admin config is unavailable
const PROVIDER_MAX_OUTPUT_FALLBACK: Record<string, number> = {
  openai: 16384,
  anthropic: 8192,
  gemini: 8192,
  deepseek: 8192,
  mistral: 32768,
  perplexity: 4096,
  groq: 8192,
  xai: 8192,
  kimi: 8192,
  falcon: 4096,
  sarvam: 4096,
  huggingface: 4096,
  generic: 4096,
};

// Helper function to get max output from admin config with fallback
function getProviderMaxOutput(provider: string, adminConfig?: typeof providerConfig): number {
  // Priority 1: Use admin config if available
  if (adminConfig && adminConfig[provider]) {
    const adminCap = adminConfig[provider].max_output_cap;
    if (adminCap && adminCap > 0) {
      return adminCap;
    }
  }
  
  // Priority 2: Use fallback constant
  return PROVIDER_MAX_OUTPUT_FALLBACK[provider] || 4096;
}
```

**Why:** Admin panel settings take priority. Fallback only used when admin config unavailable.

---

#### Change 1.2: Update computeOutCap() to use admin config

**Location:** Lines 399-409

**Current Code:**
```typescript
function computeOutCap(e: Engine, inputTokens: number): number {
  if (e.outPolicy?.mode === "fixed" && e.outPolicy.fixedTokens) return e.outPolicy.fixedTokens;

  const providerMax = PROVIDER_MAX_OUTPUT[e.provider] || 4096;
  const availableTokens = Math.max(0, e.contextLimit - inputTokens);
  return Math.min(providerMax, Math.floor(availableTokens * 0.9));
}
```

**Fixed Code:**
```typescript
function computeOutCap(e: Engine, inputTokens: number, adminProviderConfig?: typeof providerConfig): number {
  // Priority 1: Use engine's fixed policy if set
  if (e.outPolicy?.mode === "fixed" && e.outPolicy.fixedTokens) {
    return e.outPolicy.fixedTokens;
  }

  // Priority 2: Use admin config max_output_cap
  const providerMax = getProviderMaxOutput(e.provider, adminProviderConfig);
  
  // Priority 3: Calculate available tokens with 10% buffer
  const availableTokens = Math.max(0, e.contextLimit - inputTokens);
  
  // Return minimum of provider max and available tokens
  return Math.min(providerMax, Math.floor(availableTokens * 0.9));
}
```

**Why:** Respects admin panel settings while preserving engine policy and fallback logic.

---

#### Change 1.3: Replace hardcoded MAX_PROMPT_LENGTH

**Location:** Lines 1586-1590

**Current Code:**
```typescript
const MAX_PROMPT_LENGTH = 7000;  // ← HARDCODED
const originalPromptLength = prompt.length;
if (prompt.length > MAX_PROMPT_LENGTH) {
  prompt = prompt.substring(0, MAX_PROMPT_LENGTH) + "...truncated message...";
}
```

**Fixed Code:**
```typescript
// Get from admin config, fallback to 7000
const MAX_PROMPT_LENGTH = getSystemConfig<number>(systemConfig, 'max_prompt_length', 7000);
const originalPromptLength = prompt.length;
if (prompt.length > MAX_PROMPT_LENGTH) {
  prompt = prompt.substring(0, MAX_PROMPT_LENGTH) + "...truncated message...";
}
```

**Why:** Uses admin panel setting with fallback to 7000 for safety.

---

#### Change 1.4: Remove dead code PROMPT_CHUNK_SIZE

**Location:** Lines 535-540

**Current Code:**
```typescript
const LIMITS = {
  PROMPT_SOFT_LIMIT: getSystemConfig<number>(systemConfig, 'prompt_soft_limit', 5000),
  PROMPT_HARD_LIMIT: getSystemConfig<number>(systemConfig, 'prompt_hard_limit', 10000),
  PROMPT_CHUNK_SIZE: getSystemConfig<number>(systemConfig, 'prompt_chunk_size', 4000), // ← DEAD CODE
};
```

**Fixed Code:**
```typescript
const LIMITS = {
  PROMPT_SOFT_LIMIT: getSystemConfig<number>(systemConfig, 'prompt_soft_limit', 5000),
  PROMPT_HARD_LIMIT: getSystemConfig<number>(systemConfig, 'prompt_hard_limit', 10000),
  // PROMPT_CHUNK_SIZE removed - not used anywhere in codebase
  // If chunking is needed in future, implement as separate feature with proper usage
};
```

**Why:** Removes dead code that wastes database queries.

---

#### Change 1.5: Update all computeOutCap() calls to pass admin config

**Location:** Multiple locations where computeOutCap is called

**Pattern:**
```typescript
// OLD
const outCap = computeOutCap(engine, inputTokens);

// NEW
const outCap = computeOutCap(engine, inputTokens, providerConfig);
```

**Search for all calls:**
- Use grep to find: `computeOutCap(`
- Update each call to pass `providerConfig` as third parameter

**Why:** Ensures admin config flows through to all API calls.

---

#### Change 1.6: Add temperature from provider_config

**Location:** All temperature defaults (25+ instances)

**Pattern:**
```typescript
// OLD
temperature: 0.7,

// NEW
temperature: providerConfig?.[provider]?.default_temperature ?? 0.7,
```

**Locations to update:**
- Line 2038: OpenAI temperature
- Line 2143: Gemini temperature
- Line 2218: Mistral temperature
- Line 2338: Perplexity temperature
- Line 2465: Kimi temperature
- Line 2584: DeepSeek temperature
- Plus all other provider temperature defaults

**Why:** Allows per-provider temperature configuration via admin panel.

---

### File 2: `server/ai-proxy.cjs`

**Changes Required:**

#### Change 2.1: Replace hardcoded token limit fallbacks

**Location:** Lines 908, 1017, 1019, etc.

**Current Code (Anthropic example):**
```javascript
const outCap = req.body.max_tokens || 8192;  // ← HARDCODED fallback
```

**Fixed Code:**
```javascript
// Get from database provider_config with fallback
const providerConfig = await getProviderConfig('anthropic');
const outCap = req.body.max_tokens || providerConfig?.max_output_cap || 8192;
```

**Why:** Uses admin panel setting with fallback to hardcoded value for safety.

---

#### Change 2.2: Replace hardcoded temperature defaults

**Location:** Lines 798, 882, 986, 1117, 1196, 1272, etc.

**Current Code (OpenAI example):**
```javascript
temperature: 0.7,  // ← HARDCODED
```

**Fixed Code:**
```javascript
// Get from database provider_config with fallback
const providerConfig = await getProviderConfig('openai');
temperature: providerConfig?.default_temperature ?? 0.7,
```

**Why:** Allows per-provider temperature configuration via admin panel.

---

#### Change 2.3: Create helper function to fetch provider config

**Location:** Top of file, after imports

**New Code:**
```javascript
// Helper function to get provider config from database
async function getProviderConfig(provider) {
  try {
    // Query provider_config table from Supabase
    const { data, error } = await supabase
      .from('provider_config')
      .select('*')
      .eq('provider', provider)
      .single();
    
    if (error || !data) {
      console.warn(`Provider config not found for ${provider}, using fallbacks`);
      return null;
    }
    
    return data;
  } catch (err) {
    console.error(`Error fetching provider config for ${provider}:`, err);
    return null;  // Fall back to hardcoded values
  }
}
```

**Why:** Centralizes database access with error handling and fallback.

---

### File 3: `server/ai-proxy-improved.cjs`

**Changes Required:**

#### Change 3.1: Same as ai-proxy.cjs

Apply the same changes as File 2 to maintain consistency between both proxy files.

**Locations:**
- Token limit fallbacks
- Temperature defaults
- Add helper function for provider config

**Why:** Both proxy files must have consistent behavior.

---

## PART 3: FALLBACK STRATEGY

### Fallback Hierarchy (DO NOT REMOVE)

**Priority Order:**
1. **Admin Panel Config** (highest priority)
   - `provider_config.max_output_cap`
   - `provider_config.default_temperature`
   - `system_config.max_prompt_length`

2. **Engine Policy** (if set)
   - `engine.outPolicy.fixedTokens`
   - `engine.outPolicy.mode`

3. **Hardcoded Constants** (fallback only)
   - `PROVIDER_MAX_OUTPUT_FALLBACK`
   - `temperature: 0.7`
   - `MAX_PROMPT_LENGTH: 7000`

4. **Safe Defaults** (last resort)
   - `4096` for unknown providers
   - `0.7` for temperature
   - `7000` for prompt length

**Code Pattern:**
```typescript
function getValue(adminValue, engineValue, fallbackValue, defaultValue) {
  // Priority 1: Admin config
  if (adminValue !== null && adminValue !== undefined) {
    return adminValue;
  }
  
  // Priority 2: Engine policy
  if (engineValue !== null && engineValue !== undefined) {
    return engineValue;
  }
  
  // Priority 3: Fallback constant
  if (fallbackValue !== null && fallbackValue !== undefined) {
    return fallbackValue;
  }
  
  // Priority 4: Safe default
  return defaultValue;
}
```

---

## PART 4: TESTING REQUIREMENTS

### Test Case 1: Admin Panel max_output_cap Controls API Call

**Setup:**
- Set `provider_config.max_output_cap['mistral'] = 327`

**Expected Behavior:**
- API call includes `max_tokens: 327`
- Mistral returns ~327 tokens
- Admin setting is respected

**Verification:**
- Check network tab: `max_tokens: 327`
- Check response: token count ≈ 327

---

### Test Case 2: max_prompt_length Truncates Correctly

**Setup:**
- Set `system_config.max_prompt_length = 170`

**Expected Behavior:**
- Prompt longer than 170 chars is truncated to 170
- Message shows "...truncated message..."

**Verification:**
- Input: 500 char prompt
- Actual sent: 170 chars + "...truncated message..."

---

### Test Case 3: Fallback Works When Admin Config Unavailable

**Setup:**
- Delete provider_config entry for a provider

**Expected Behavior:**
- Uses `PROVIDER_MAX_OUTPUT_FALLBACK`
- API call succeeds with fallback value

**Verification:**
- No errors in console
- API call uses fallback value

---

### Test Case 4: Temperature Configuration

**Setup:**
- Set `provider_config.default_temperature['openai'] = 0.3`

**Expected Behavior:**
- OpenAI API calls use `temperature: 0.3`
- Other providers use their configured temperature

**Verification:**
- Check network tab: `temperature: 0.3` for OpenAI
- Check network tab: correct temperature for other providers

---

## PART 5: DEAD CODE TO REMOVE

### Dead Code List

| File | Location | Code | Reason |
|------|----------|------|--------|
| OneMindAI.tsx | 535-540 | `PROMPT_CHUNK_SIZE` | Never used, no chunking implementation |
| OneMindAI.tsx | 430-432 | `PROMPT_SOFT_LIMIT`, `PROMPT_HARD_LIMIT` | Loaded but never referenced in code |
| OneMindAI.tsx | 383-397 | `PROVIDER_MAX_OUTPUT` | Rename to `PROVIDER_MAX_OUTPUT_FALLBACK` |
| Various | Multiple | Hardcoded `temperature: 0.7` | Replace with admin config lookup |
| Various | Multiple | Hardcoded `max_tokens || 4000` | Replace with admin config lookup |

### Dead Code Removal Process

1. **Search for unused variables:**
   ```bash
   grep -r "PROMPT_SOFT_LIMIT\|PROMPT_HARD_LIMIT\|PROMPT_CHUNK_SIZE" src/
   ```

2. **Verify no usage:**
   - If grep returns 0 results (except definition), it's dead code
   - If grep returns only definition line, it's dead code

3. **Remove safely:**
   - Keep fallback constants
   - Remove unused variable assignments
   - Update function signatures

---

## PART 6: IMPLEMENTATION ORDER

### Phase 1: Frontend (OneMindAI.tsx)
1. Rename `PROVIDER_MAX_OUTPUT` → `PROVIDER_MAX_OUTPUT_FALLBACK`
2. Add `getProviderMaxOutput()` helper function
3. Update `computeOutCap()` signature to accept `adminProviderConfig`
4. Update all `computeOutCap()` calls to pass `providerConfig`
5. Replace hardcoded `MAX_PROMPT_LENGTH` with admin config lookup
6. Remove `PROMPT_CHUNK_SIZE` from LIMITS object
7. Replace all hardcoded `temperature: 0.7` with admin config lookup

### Phase 2: Backend (ai-proxy.cjs)
1. Add `getProviderConfig()` helper function
2. Replace hardcoded token limit fallbacks with admin config lookup
3. Replace hardcoded temperature defaults with admin config lookup
4. Add error handling and logging

### Phase 3: Backend (ai-proxy-improved.cjs)
1. Apply same changes as ai-proxy.cjs
2. Ensure consistency between both proxy files

### Phase 4: Testing
1. Test admin panel max_output_cap flow
2. Test max_prompt_length truncation
3. Test temperature configuration
4. Test fallback behavior
5. Test error handling

---

## PART 7: ROLLBACK PLAN

If issues occur:

1. **Revert to hardcoded values:**
   - All fallback constants remain in code
   - Admin config lookups simply won't execute
   - System continues with fallback values

2. **No data loss:**
   - No database changes required
   - Only code changes
   - Can revert with git

3. **Gradual rollout:**
   - Deploy one provider at a time
   - Monitor for issues
   - Rollback individual provider if needed

---

## PART 8: SUCCESS CRITERIA

✅ **All of these must be true:**

- [ ] Admin panel `max_output_cap` controls API `max_tokens`
- [ ] Admin panel `max_prompt_length` controls prompt truncation
- [ ] Admin panel `default_temperature` controls API temperature
- [ ] Fallback constants still exist and are used when admin config unavailable
- [ ] No hardcoded values bypass admin panel (except fallbacks)
- [ ] Dead code (`PROMPT_CHUNK_SIZE`, etc.) removed
- [ ] All tests pass
- [ ] No console errors
- [ ] API calls include correct values from admin panel

---

## PART 9: EVIDENCE SUMMARY

| Issue | File | Line | Evidence | Impact |
|-------|------|------|----------|--------|
| PROVIDER_MAX_OUTPUT hardcoded | OneMindAI.tsx | 383-397 | Uses constant, ignores admin config | Admin max_output_cap ignored |
| MAX_PROMPT_LENGTH hardcoded | OneMindAI.tsx | 1586 | Uses 7000, ignores admin config | Admin max_prompt_length ignored |
| PROMPT_CHUNK_SIZE dead code | OneMindAI.tsx | 538 | Loaded but never used | Wastes DB queries |
| Temperature hardcoded | OneMindAI.tsx | 2038+ | 25+ instances of `0.7` | Admin temperature ignored |
| Backend token limits hardcoded | ai-proxy.cjs | 908, 1017, 1019 | Uses `\|\| 8192` fallback | Backend ignores frontend value |
| Backend temperature hardcoded | ai-proxy.cjs | 798, 882, etc. | Uses `0.7` constant | Admin temperature ignored |

---

## PART 10: QUESTIONS FOR CLARIFICATION

Before implementation, confirm:

1. **Should admin config be cached?**
   - Option A: Fetch every API call (slow but always fresh)
   - Option B: Cache for 5 minutes (fast but may be stale)
   - Option C: Cache with manual refresh button

2. **Should fallback be logged?**
   - Option A: Silent fallback (no logs)
   - Option B: Log as warning (visible in console)
   - Option C: Log as info (visible in debug mode only)

3. **Should invalid admin values be rejected?**
   - Option A: Use invalid value anyway (trust admin)
   - Option B: Reject and use fallback (safe but restrictive)
   - Option C: Clamp to valid range (e.g., 100-131072 tokens)

4. **Should this be feature-flagged?**
   - Option A: Deploy immediately (fast rollout)
   - Option B: Feature flag for gradual rollout (safer)
   - Option C: A/B test with subset of users

---

## CONCLUSION

This prompt provides:
- ✅ Detailed evidence of each issue
- ✅ Current broken flow diagrams
- ✅ Expected fixed flow diagrams
- ✅ Exact code changes needed
- ✅ Fallback preservation strategy
- ✅ Testing requirements
- ✅ Implementation order
- ✅ Rollback plan
- ✅ Success criteria

Ready to implement when approved.
