# OneMind AI - Complete Hardcoded Values Audit

**Date:** December 18, 2025  
**Status:** Full Audit Complete

---

## Summary

| Layer | File Count | Hardcoded Values | Move to Admin? |
|-------|------------|------------------|----------------|
| Layer 1: Frontend Core | 1 | 25+ | Partial |
| Layer 2: Frontend Components | 10+ | 50+ | Partial |
| Layer 3: Backend Services | 2 | 30+ | Partial |
| Layer 4: Backend API | 1 | 20+ | Partial |
| Layer 5: Database | 2 | 15+ | N/A (defaults) |
| Layer 6: Infrastructure | 1 | 10+ | Yes (env vars) |
| Layer 7: Documentation | 4 | N/A | N/A |

---

## LAYER 1: FRONTEND CORE

### File: `src/OneMindAI.tsx`

| Line | Value | Function/Context | Reason Still There | Move to Admin? |
|------|-------|------------------|-------------------|----------------|
| 571 | `{ openai: true, deepseek: true, mistral: true }` | Default selected engines | Fallback when admin config not loaded | ✅ Yes - use provider_config |
| 545 | `MOCK_FAIL_AFTER_RETRIES = 2` | Mock error testing | Development/testing only | ❌ No - dev only |

### File: `src/core/constants.ts`

| Line | Value | Function/Context | Reason Still There | Move to Admin? |
|------|-------|------------------|-------------------|----------------|
| 39-44 | `contextLimit: 128_000` | OpenAI context limit | Engine registry definition | ⚠️ Partial - could be in ai_models table |
| 49-55 | `contextLimit: 200_000` | Claude context limit | Engine registry definition | ⚠️ Partial - could be in ai_models table |
| 61 | `contextLimit: 1_000_000` | Gemini context limit | Engine registry definition | ⚠️ Partial - could be in ai_models table |
| 72 | `contextLimit: 128_000` | DeepSeek context limit | Engine registry definition | ⚠️ Partial - could be in ai_models table |
| 83 | `contextLimit: 64_000` | Mistral context limit | Engine registry definition | ⚠️ Partial - could be in ai_models table |
| 94 | `contextLimit: 32_000` | Perplexity context limit | Engine registry definition | ⚠️ Partial - could be in ai_models table |
| 105 | `contextLimit: 128_000` | Kimi context limit | Engine registry definition | ⚠️ Partial - could be in ai_models table |
| 116 | `contextLimit: 128_000` | xAI context limit | Engine registry definition | ⚠️ Partial - could be in ai_models table |
| 128 | `contextLimit: 128_000` | Groq context limit | Engine registry definition | ⚠️ Partial - could be in ai_models table |
| 139 | `contextLimit: 128_000` | Falcon context limit | Engine registry definition | ⚠️ Partial - could be in ai_models table |
| 150 | `contextLimit: 32_000` | Sarvam context limit | Engine registry definition | ⚠️ Partial - could be in ai_models table |
| 161 | `contextLimit: 64_000` | HuggingFace context limit | Engine registry definition | ⚠️ Partial - could be in ai_models table |
| 173 | `contextLimit: 64_000` | Generic context limit | Engine registry definition | ⚠️ Partial - could be in ai_models table |
| 186-251 | `BASE_PRICING` object | All pricing per model | Pricing configuration | ✅ Yes - should be in database |
| 257-263 | `DEFAULT_SELECTED_ENGINES` | Default engine selection | UI default state | ✅ Yes - use provider_config |
| 269-281 | `STREAMING_PROVIDERS` array | List of streaming-capable providers | Feature flag | ⚠️ Partial - could be provider_config column |

---

## LAYER 2: FRONTEND COMPONENTS

### File: `src/hooks/useAdminConfig.ts`

| Line | Value | Function/Context | Reason Still There | Move to Admin? |
|------|-------|------------------|-------------------|----------------|
| 46 | `prompt_soft_limit: 5000` | Default soft limit | Fallback when DB unavailable | ❌ No - is fallback |
| 47 | `prompt_hard_limit: 10000` | Default hard limit | Fallback when DB unavailable | ❌ No - is fallback |
| 48 | `prompt_chunk_size: 4000` | Default chunk size | Fallback when DB unavailable | ❌ No - is fallback |
| 49 | `max_prompt_length: 7000` | Default max prompt | Fallback when DB unavailable | ❌ No - is fallback |
| 52 | `stream_timeout_ms: 30000` | Stream timeout | Fallback when DB unavailable | ❌ No - is fallback |
| 53 | `request_timeout_ms: 60000` | Request timeout | Fallback when DB unavailable | ❌ No - is fallback |
| 56 | `expected_output_tokens: 1000` | Default output estimate | Fallback when DB unavailable | ❌ No - is fallback |
| 57 | `signup_bonus_credits: 100` | Signup bonus | Fallback when DB unavailable | ❌ No - is fallback |
| 58 | `markup_percentage: 30` | Markup % | Fallback when DB unavailable | ❌ No - is fallback |
| 61 | `debounce_ms: 300` | Input debounce | Fallback when DB unavailable | ❌ No - is fallback |
| 62 | `animation_duration_ms: 200` | Animation duration | Fallback when DB unavailable | ❌ No - is fallback |
| 63 | `update_interval_ms: 15` | Streaming refresh rate | Fallback when DB unavailable | ❌ No - is fallback |
| 64 | `toast_duration_ms: 5000` | Toast display time | Fallback when DB unavailable | ❌ No - is fallback |
| 68 | `max_output_cap: 16384` | OpenAI max output | Fallback when DB unavailable | ❌ No - is fallback |
| 69 | `max_output_cap: 8192` | Anthropic max output | Fallback when DB unavailable | ❌ No - is fallback |
| 70 | `max_output_cap: 8192` | Gemini max output | Fallback when DB unavailable | ❌ No - is fallback |
| 71 | `max_output_cap: 8192` | DeepSeek max output | Fallback when DB unavailable | ❌ No - is fallback |
| 72 | `max_output_cap: 32768` | Mistral max output | Fallback when DB unavailable | ❌ No - is fallback |
| 73 | `max_output_cap: 4096` | Perplexity max output | Fallback when DB unavailable | ❌ No - is fallback |
| 74 | `max_output_cap: 8192` | Groq max output | Fallback when DB unavailable | ❌ No - is fallback |
| 75 | `max_output_cap: 16384` | xAI max output | Fallback when DB unavailable | ❌ No - is fallback |
| 76 | `max_output_cap: 8192` | Kimi max output | Fallback when DB unavailable | ❌ No - is fallback |
| 84 | `CACHE_DURATION_MS = 5 * 60 * 1000` | 5 minute cache | Performance optimization | ❌ No - technical constant |

### File: `src/lib/supabase/credit-service.ts`

| Line | Value | Function/Context | Reason Still There | Move to Admin? |
|------|-------|------------------|-------------------|----------------|
| 16-59 | `CREDIT_PRICING` object | All credit pricing | Credit calculation | ✅ Yes - should be in database |
| 62 | `SIGNUP_BONUS_CREDITS = 100` | Signup bonus | User onboarding | ✅ Yes - already in system_config |
| 81 | `1000` | Default tokens for unknown models | Fallback calculation | ❌ No - is fallback |
| 98 | `1000` | Default estimated completion tokens | Estimation default | ⚠️ Partial - could be configurable |

### File: `src/lib/error-recovery-engine.ts`

| Line | Value | Function/Context | Reason Still There | Move to Admin? |
|------|-------|------------------|-------------------|----------------|
| 287 | `maxRetries: 4` | Retry manager config | Error recovery | ⚠️ Partial - could be system_config |
| 288 | `baseDelay: 1000` | Base delay (1 second) | Error recovery | ⚠️ Partial - could be system_config |
| 289 | `maxDelay: 32000` | Max delay (32 seconds) | Error recovery | ⚠️ Partial - could be system_config |
| 290 | `backoffMultiplier: 2` | Exponential backoff | Error recovery | ⚠️ Partial - could be system_config |
| 296 | `maxRequestsPerSecond: 10` | Rate limiting | Throttling | ⚠️ Partial - could be system_config |

### File: `src/config/constants.ts`

| Line | Value | Function/Context | Reason Still There | Move to Admin? |
|------|-------|------------------|-------------------|----------------|
| 17 | `TOKENS_PER_MILLION: 1_000_000` | Mathematical constant | Industry standard | ❌ No - mathematical constant |
| 20 | `CENTS_PER_DOLLAR: 100` | Mathematical constant | Industry standard | ❌ No - mathematical constant |
| 23 | `CONTEXT_RESERVE_RATIO: 0.9` | 90% context usage | Safety margin | ⚠️ Partial - could be configurable |
| 44 | `charsPerToken: 0.75` | tiktoken ratio | Tokenizer config | ❌ No - empirically derived |
| 46 | `adjustment: 0.002` | tiktoken adjustment | Tokenizer config | ❌ No - empirically derived |
| 51 | `charsPerToken: 0.95` | sentencepiece ratio | Tokenizer config | ❌ No - empirically derived |
| 54 | `adjustment: 0.003` | sentencepiece adjustment | Tokenizer config | ❌ No - empirically derived |
| 60 | `charsPerToken: 0.6` | bytebpe ratio | Tokenizer config | ❌ No - empirically derived |
| 63 | `adjustment: 0.004` | bytebpe adjustment | Tokenizer config | ❌ No - empirically derived |

---

## LAYER 3: BACKEND SERVICES

### File: `server/ai-proxy.cjs` - OneMind API

| Line | Value | Function/Context | Reason Still There | Move to Admin? |
|------|-------|------------------|-------------------|----------------|
| 1608 | `'deepseek'` | Default fallback provider | Fallback when Supabase unavailable | ❌ No - is fallback |
| 1608 | `'deepseek-chat'` | Default DeepSeek model | Fallback when Supabase unavailable | ❌ No - is fallback |
| 1609 | `'mistral'` | Default fallback provider | Fallback when Supabase unavailable | ❌ No - is fallback |
| 1609 | `'mistral-large-latest'` | Default Mistral model | Fallback when Supabase unavailable | ❌ No - is fallback |
| 1624-1627 | Fallback providers array | Error fallback | Fallback when DB query fails | ❌ No - is fallback |
| 1643 | `'gpt-4o'` | Default OpenAI model | Fallback when model not specified | ❌ No - is fallback |
| 1656 | `'claude-3-5-sonnet-20241022'` | Default Claude model | Fallback when model not specified | ❌ No - is fallback |
| 1667 | `'gemini-2.0-flash-exp'` | Default Gemini model | Fallback when model not specified | ❌ No - is fallback |
| 1681 | `'mistral-large-latest'` | Default Mistral model | Fallback when model not specified | ❌ No - is fallback |
| 1700 | `'llama-3.1-sonar-large-128k-online'` | Default Perplexity model | Fallback when model not specified | ❌ No - is fallback |
| 1719 | `'deepseek-chat'` | Default DeepSeek model | Fallback when model not specified | ❌ No - is fallback |
| 1738 | `'llama-3.3-70b-versatile'` | Default Groq model | Fallback when model not specified | ❌ No - is fallback |
| 1757 | `'grok-beta'` | Default xAI model | Fallback when model not specified | ❌ No - is fallback |
| 1773 | `4` | Token estimation divisor | Rough character-to-token ratio | ❌ No - estimation constant |
| 1807 | `max_tokens = 4096` | Default max tokens | Request default | ⚠️ Partial - could be system_config |
| 1809 | `timeout = 60000` | Default timeout (60s) | Request default | ⚠️ Partial - could be system_config |

---

## LAYER 4: BACKEND API

### File: `server/ai-proxy.cjs` - Server Config

| Line | Value | Function/Context | Reason Still There | Move to Admin? |
|------|-------|------------------|-------------------|----------------|
| 25 | `CACHE_TTL = 5 * 60 * 1000` | 5 minute cache | Performance optimization | ⚠️ Partial - could be env var |
| 46 | `PORT = 3002` | Default server port | Server config | ✅ Yes - use env var (already supports) |
| 62-67 | `allowedOrigins` array | CORS origins | Security config | ✅ Yes - use env var (already supports) |
| 89 | `limit: '10mb'` | Body parser limit | Request size limit | ⚠️ Partial - could be env var |
| 93 | `windowMs: 60 * 1000` | Rate limit window (1 min) | Rate limiting | ✅ Yes - use env var (already supports) |
| 94 | `max: 60` | Max requests per window | Rate limiting | ✅ Yes - use env var (already supports) |
| 97 | `retryAfter: 60` | Retry-After header value | Rate limit response | ⚠️ Partial - could be dynamic |
| 820 | `'gpt-4o'` | Default OpenAI model | API default | ❌ No - is fallback |
| 824 | `128000` | GPT-5 max output fallback | Provider limit | ❌ No - is fallback |
| 825 | `16384` | GPT-4 max output fallback | Provider limit | ❌ No - is fallback |

### File: `server/balance-api.cjs`

| Line | Value | Function/Context | Reason Still There | Move to Admin? |
|------|-------|------------------|-------------------|----------------|
| ~10 | `PORT = 3001` | Balance API port | Server config | ✅ Yes - use env var |

---

## LAYER 5: DATABASE (Fallback Defaults)

### File: `supabase/migrations/006_system_and_provider_config.sql`

These are database seed values - they ARE the admin-configurable values:

| Table | Key | Value | Purpose |
|-------|-----|-------|---------|
| system_config | prompt_soft_limit | 5000 | Warning threshold |
| system_config | prompt_hard_limit | 10000 | Hard block threshold |
| system_config | max_prompt_length | 7000 | Truncation point |
| system_config | stream_timeout_ms | 30000 | Stream timeout |
| system_config | request_timeout_ms | 60000 | Request timeout |
| system_config | signup_bonus_credits | 100 | New user bonus |
| system_config | markup_percentage | 30 | Pricing markup |
| provider_config | max_output_cap | varies | Per-provider limits |
| provider_config | rate_limit_rpm | varies | Per-provider rate limits |
| provider_config | timeout_seconds | 30 | Per-provider timeout |
| provider_config | retry_count | 3 | Per-provider retries |

---

## LAYER 6: INFRASTRUCTURE

### Environment Variables (`.env`)

| Variable | Default Value | Purpose | Move to Admin? |
|----------|---------------|---------|----------------|
| `PORT` | 3002 | Server port | ❌ No - infrastructure |
| `RATE_LIMIT_WINDOW_MS` | 60000 | Rate limit window | ⚠️ Partial - could be system_config |
| `RATE_LIMIT_MAX` | 60 | Max requests | ⚠️ Partial - could be system_config |
| `ALLOWED_ORIGINS` | localhost:5173,5176,3000 | CORS origins | ❌ No - security/infrastructure |

---

## LAYER 7: DOCUMENTATION

Documentation files contain example values but these are not runtime constants.

---

## Recommendations

### HIGH PRIORITY - Should Move to Admin

| Current Location | Value | Recommended Location |
|------------------|-------|---------------------|
| `src/core/constants.ts` | `BASE_PRICING` | `ai_models` table (pricing columns) |
| `src/lib/supabase/credit-service.ts` | `CREDIT_PRICING` | `ai_models` table (credit_pricing columns) |
| `src/core/constants.ts` | `SEEDED_ENGINES` context limits | `ai_models` table (context_limit column) |
| `src/core/constants.ts` | `DEFAULT_SELECTED_ENGINES` | `provider_config` table (is_default column) |

### MEDIUM PRIORITY - Could Move to Admin

| Current Location | Value | Recommended Location |
|------------------|-------|---------------------|
| `src/lib/error-recovery-engine.ts` | Retry config (maxRetries, delays) | `system_config` table |
| `server/ai-proxy.cjs` | Default max_tokens (4096) | `system_config` table |
| `server/ai-proxy.cjs` | Default timeout (60000) | `system_config` table |
| `src/config/constants.ts` | `CONTEXT_RESERVE_RATIO` (0.9) | `system_config` table |

### LOW PRIORITY - Keep as Code Constants

| Location | Value | Reason to Keep |
|----------|-------|----------------|
| `src/config/constants.ts` | `TOKENS_PER_MILLION` | Mathematical constant |
| `src/config/constants.ts` | `CENTS_PER_DOLLAR` | Mathematical constant |
| `src/config/constants.ts` | Tokenizer ratios | Empirically derived, rarely change |
| All fallback defaults | Various | Required for offline/error scenarios |

---

## Summary Statistics

| Category | Count | Action |
|----------|-------|--------|
| **Should move to admin** | 4 major objects | Migrate to database |
| **Could move to admin** | 10-15 values | Consider for future |
| **Keep as constants** | 20+ values | Mathematical/technical constants |
| **Fallback defaults** | 50+ values | Required for resilience |

---

## Implementation Priority

1. **Phase 1:** Move `BASE_PRICING` and `CREDIT_PRICING` to `ai_models` table
2. **Phase 2:** Move `SEEDED_ENGINES` context limits to `ai_models` table
3. **Phase 3:** Add retry/timeout config to `system_config` table
4. **Phase 4:** Add streaming provider flags to `provider_config` table

---

**Document Created:** December 18, 2025  
**Total Hardcoded Values Identified:** ~150+  
**Recommended for Admin Migration:** ~20-30 values
