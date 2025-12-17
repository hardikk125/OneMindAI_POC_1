# IMPLEMENTATION PROMPT: Fix Hardcoded Values & Dead Code

## OBJECTIVE
Wire admin panel settings (system_config, provider_config, ai_models) into actual API call flows. Remove dead code. Preserve all fallbacks.

---

## TASK 1: Fix OneMindAI.tsx

### 1.1 Rename PROVIDER_MAX_OUTPUT to PROVIDER_MAX_OUTPUT_FALLBACK

**File:** `c:\Projects\OneMindAI\src\OneMindAI.tsx`
**Lines:** 383-397

**Action:** Rename constant from `PROVIDER_MAX_OUTPUT` to `PROVIDER_MAX_OUTPUT_FALLBACK`

**Before:**
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

**After:**
```typescript
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
```

---

### 1.2 Add getProviderMaxOutput() Helper Function

**File:** `c:\Projects\OneMindAI\src\OneMindAI.tsx`
**Location:** After PROVIDER_MAX_OUTPUT_FALLBACK definition (around line 398)

**Add this function:**
```typescript
// Helper function to get max output from admin config with fallback
function getProviderMaxOutput(provider: string, adminProviderConfig?: Record<string, any>): number {
  // Priority 1: Use admin config if available
  if (adminProviderConfig && adminProviderConfig[provider]) {
    const adminCap = adminProviderConfig[provider].max_output_cap;
    if (adminCap && adminCap > 0) {
      return adminCap;
    }
  }
  
  // Priority 2: Use fallback constant
  return PROVIDER_MAX_OUTPUT_FALLBACK[provider] || 4096;
}
```

---

### 1.3 Update computeOutCap() Function Signature

**File:** `c:\Projects\OneMindAI\src\OneMindAI.tsx`
**Lines:** 399-409

**Before:**
```typescript
function computeOutCap(e: Engine, inputTokens: number): number {
  if (e.outPolicy?.mode === "fixed" && e.outPolicy.fixedTokens) return e.outPolicy.fixedTokens;

  const providerMax = PROVIDER_MAX_OUTPUT[e.provider] || 4096;
  const availableTokens = Math.max(0, e.contextLimit - inputTokens);
  return Math.min(providerMax, Math.floor(availableTokens * 0.9));
}
```

**After:**
```typescript
function computeOutCap(e: Engine, inputTokens: number, adminProviderConfig?: Record<string, any>): number {
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

---

### 1.4 Update All computeOutCap() Calls

**File:** `c:\Projects\OneMindAI\src\OneMindAI.tsx`

**Action:** Find all calls to `computeOutCap()` and add `providerConfig` parameter

**Search for:** `computeOutCap(`

**Pattern to replace:**
```typescript
// OLD
const outCap = computeOutCap(engine, inputTokens);

// NEW
const outCap = computeOutCap(engine, inputTokens, providerConfig);
```

**Common locations:**
- Around line 1600-1700 (in API call functions)
- Around line 2000-2100 (in streaming functions)
- Around line 2500-2600 (in provider-specific functions)

**Verify:** After changes, search for `computeOutCap(` and ensure all calls have 3 parameters.

---

### 1.5 Replace Hardcoded MAX_PROMPT_LENGTH

**File:** `c:\Projects\OneMindAI\src\OneMindAI.tsx`
**Lines:** 1586-1590

**Before:**
```typescript
const MAX_PROMPT_LENGTH = 7000;  // ← HARDCODED
const originalPromptLength = prompt.length;
if (prompt.length > MAX_PROMPT_LENGTH) {
  prompt = prompt.substring(0, MAX_PROMPT_LENGTH) + "...truncated message...";
}
```

**After:**
```typescript
// Get from admin config, fallback to 7000
const MAX_PROMPT_LENGTH = getSystemConfig<number>(systemConfig, 'max_prompt_length', 7000);
const originalPromptLength = prompt.length;
if (prompt.length > MAX_PROMPT_LENGTH) {
  prompt = prompt.substring(0, MAX_PROMPT_LENGTH) + "...truncated message...";
}
```

---

### 1.6 Remove Dead Code: PROMPT_CHUNK_SIZE

**File:** `c:\Projects\OneMindAI\src\OneMindAI.tsx`
**Lines:** 535-540

**Before:**
```typescript
const LIMITS = {
  PROMPT_SOFT_LIMIT: getSystemConfig<number>(systemConfig, 'prompt_soft_limit', 5000),
  PROMPT_HARD_LIMIT: getSystemConfig<number>(systemConfig, 'prompt_hard_limit', 10000),
  PROMPT_CHUNK_SIZE: getSystemConfig<number>(systemConfig, 'prompt_chunk_size', 4000), // ← DEAD CODE
};
```

**After:**
```typescript
const LIMITS = {
  PROMPT_SOFT_LIMIT: getSystemConfig<number>(systemConfig, 'prompt_soft_limit', 5000),
  PROMPT_HARD_LIMIT: getSystemConfig<number>(systemConfig, 'prompt_hard_limit', 10000),
  // PROMPT_CHUNK_SIZE removed - not used anywhere in codebase
  // If chunking is needed in future, implement as separate feature with proper usage
};
```

---

### 1.7 Replace Hardcoded Temperature Defaults

**File:** `c:\Projects\OneMindAI\src\OneMindAI.tsx`

**Action:** Find all instances of `temperature: 0.7` and replace with admin config lookup

**Search for:** `temperature: 0.7` or `temperature: 0.7,`

**Pattern to replace:**
```typescript
// OLD
temperature: 0.7,

// NEW
temperature: providerConfig?.[provider]?.default_temperature ?? 0.7,
```

**Key locations to update:**
- Line 2038: OpenAI temperature
- Line 2143: Gemini temperature
- Line 2218: Mistral temperature
- Line 2338: Perplexity temperature
- Line 2465: Kimi temperature
- Line 2584: DeepSeek temperature
- Plus any other provider temperature defaults

**Verify:** Search for `temperature: 0.7` and ensure all are replaced (except in comments).

---

## TASK 2: Fix ai-proxy.cjs

### 2.1 Add getProviderConfig() Helper Function

**File:** `c:\Projects\OneMindAI\server\ai-proxy.cjs`
**Location:** After imports, before main route handlers (around line 50-100)

**Add this function:**
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

---

### 2.2 Replace Hardcoded Token Limit Fallbacks

**File:** `c:\Projects\OneMindAI\server\ai-proxy.cjs`

**Search for:** `const outCap = req.body.max_tokens ||` or `max_tokens || 8192`

**Pattern to replace:**

**Before (Anthropic example - Line 908):**
```javascript
const outCap = req.body.max_tokens || 8192;
```

**After:**
```javascript
// Get from database provider_config with fallback
const providerConfig = await getProviderConfig('anthropic');
const outCap = req.body.max_tokens || providerConfig?.max_output_cap || 8192;
```

**Locations to update:**
- Line 908: Anthropic
- Line 1017: Gemini
- Line 1019: Mistral
- Line 1116: Mistral (if duplicate)
- Line 1195: Perplexity
- Line 1271: DeepSeek
- Any other hardcoded token limits

---

### 2.3 Replace Hardcoded Temperature Defaults

**File:** `c:\Projects\OneMindAI\server\ai-proxy.cjs`

**Search for:** `temperature: 0.7` or `temperature: 0.7,`

**Pattern to replace:**

**Before (OpenAI example - Line 798):**
```javascript
temperature: 0.7,
```

**After:**
```javascript
// Get from database provider_config with fallback
const providerConfig = await getProviderConfig('openai');
temperature: providerConfig?.default_temperature ?? 0.7,
```

**Locations to update:**
- Line 798: OpenAI
- Line 882: Anthropic
- Line 986: Gemini
- Line 1117: Mistral
- Line 1196: Perplexity
- Line 1272: DeepSeek
- Any other hardcoded temperature defaults

---

## TASK 3: Fix ai-proxy-improved.cjs

### 3.1 Apply Same Changes as ai-proxy.cjs

**File:** `c:\Projects\OneMindAI\server\ai-proxy-improved.cjs`

**Action:** Apply the exact same changes as TASK 2 (ai-proxy.cjs)

1. Add `getProviderConfig()` helper function
2. Replace hardcoded token limit fallbacks
3. Replace hardcoded temperature defaults

**Verify:** Both proxy files have identical changes for consistency.

---

## TASK 4: Verification Checklist

After all changes, verify:

- [ ] `PROVIDER_MAX_OUTPUT` renamed to `PROVIDER_MAX_OUTPUT_FALLBACK`
- [ ] `getProviderMaxOutput()` function added
- [ ] `computeOutCap()` signature updated to accept `adminProviderConfig`
- [ ] All `computeOutCap()` calls pass `providerConfig` parameter
- [ ] Hardcoded `MAX_PROMPT_LENGTH = 7000` replaced with admin config lookup
- [ ] `PROMPT_CHUNK_SIZE` removed from LIMITS object
- [ ] All hardcoded `temperature: 0.7` replaced with admin config lookup
- [ ] `getProviderConfig()` helper added to ai-proxy.cjs
- [ ] Token limit fallbacks in ai-proxy.cjs updated
- [ ] Temperature defaults in ai-proxy.cjs updated
- [ ] Same changes applied to ai-proxy-improved.cjs
- [ ] No syntax errors in any file
- [ ] All imports are present
- [ ] Code compiles/runs without errors

---

## TASK 5: Testing

### Test 1: Admin max_output_cap Controls API Call
```
Setup: Set provider_config.max_output_cap['mistral'] = 327
Expected: API call includes max_tokens: 327
Verify: Check network tab for max_tokens value
```

### Test 2: max_prompt_length Truncates Correctly
```
Setup: Set system_config.max_prompt_length = 170
Input: 500 character prompt
Expected: Truncated to 170 chars + "...truncated message..."
Verify: Check actual prompt sent to API
```

### Test 3: Temperature Configuration
```
Setup: Set provider_config.default_temperature['openai'] = 0.3
Expected: OpenAI API calls use temperature: 0.3
Verify: Check network tab for temperature value
```

### Test 4: Fallback Works
```
Setup: Delete provider_config entry for a provider
Expected: Uses PROVIDER_MAX_OUTPUT_FALLBACK value
Verify: No errors in console, API call succeeds
```

---

## TASK 6: Commit & Rollback

### Commit Changes
```bash
git add -A
git commit -m "Fix: Wire admin panel settings to API calls, remove dead code

- Replace hardcoded PROVIDER_MAX_OUTPUT with admin config lookup
- Update computeOutCap() to use provider_config.max_output_cap
- Replace hardcoded MAX_PROMPT_LENGTH with system_config lookup
- Remove dead code PROMPT_CHUNK_SIZE
- Replace hardcoded temperature defaults with admin config lookup
- Add getProviderConfig() helper to backend proxy files
- Preserve all fallbacks for resilience
- All admin panel settings now control API behavior"
```

### Rollback Plan
```bash
# If issues occur, revert to previous commit:
git revert HEAD
git push
```

---

## SUCCESS CRITERIA

✅ All of these must be true:

1. Admin panel `max_output_cap` controls API `max_tokens`
2. Admin panel `max_prompt_length` controls prompt truncation
3. Admin panel `default_temperature` controls API temperature
4. Fallback constants still exist and are used when admin config unavailable
5. No hardcoded values bypass admin panel (except fallbacks)
6. Dead code (`PROMPT_CHUNK_SIZE`, etc.) removed
7. All tests pass
8. No console errors
9. API calls include correct values from admin panel
10. Both proxy files (ai-proxy.cjs and ai-proxy-improved.cjs) have identical changes

---

## IMPLEMENTATION NOTES

- **Do NOT remove fallback constants** - they are essential for resilience
- **Do NOT skip any computeOutCap() calls** - all must pass providerConfig
- **Do NOT modify database schema** - only use existing tables
- **Do NOT change function signatures** - only add optional parameters
- **Do NOT remove error handling** - keep try/catch blocks
- **Do NOT hardcode any new values** - use admin config with fallback pattern

---

## READY TO IMPLEMENT

This prompt provides exact code changes needed to fix all hardcoding issues. Proceed with implementation following the tasks in order.
