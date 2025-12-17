# Admin Config System - Comprehensive Test Cases

**Document Version:** 1.0  
**Date:** 2025-12-15  
**System:** OneMindAI Admin Config System (Phases 1-8)  
**Author:** HP

---

## Table of Contents

1. [Database Layer Tests](#1-database-layer-tests)
2. [Frontend Hook Tests](#2-frontend-hook-tests)
3. [Backend API Tests](#3-backend-api-tests)
4. [Admin Panel UI Tests](#4-admin-panel-ui-tests)
5. [Real-time Subscription Tests](#5-real-time-subscription-tests)
6. [Integration Tests](#6-integration-tests)
7. [Edge Case Tests](#7-edge-case-tests)
8. [Performance Tests](#8-performance-tests)
9. [Security Tests](#9-security-tests)

---

## 1. DATABASE LAYER TESTS

### 1.1 system_config Table

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| DB-SYS-001 | Verify table exists | Run `SELECT * FROM system_config LIMIT 1` | Returns data without error | □ |
| DB-SYS-002 | Verify all seed data present | Run `SELECT COUNT(*) FROM system_config` | Returns 13 rows (limits: 4, api: 2, pricing: 3, technical: 4) | □ |
| DB-SYS-003 | Verify categories | Run `SELECT DISTINCT category FROM system_config` | Returns: limits, api, pricing, technical | □ |
| DB-SYS-004 | Update value | Run `UPDATE system_config SET value = '6000'::jsonb WHERE key = 'prompt_soft_limit'` | Row updated, updated_at changes | □ |
| DB-SYS-005 | Verify key uniqueness | Try to insert duplicate key | Should fail with unique constraint error | □ |
| DB-SYS-006 | Verify default values | Check `prompt_soft_limit` | Should be 5000 | □ |
| DB-SYS-007 | Verify sensitive flag | Check `markup_percentage` | Should have `is_sensitive = true` | □ |

### 1.2 provider_config Table

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| DB-PRV-001 | Verify table exists | Run `SELECT * FROM provider_config LIMIT 1` | Returns data without error | □ |
| DB-PRV-002 | Verify all providers present | Run `SELECT COUNT(*) FROM provider_config` | Returns 9 rows | □ |
| DB-PRV-003 | Verify provider list | Run `SELECT provider FROM provider_config ORDER BY provider` | Returns: anthropic, deepseek, gemini, groq, kimi, mistral, openai, perplexity, xai | □ |
| DB-PRV-004 | Update max_output_cap | Run `UPDATE provider_config SET max_output_cap = 20000 WHERE provider = 'openai'` | Row updated | □ |
| DB-PRV-005 | Toggle is_enabled | Run `UPDATE provider_config SET is_enabled = false WHERE provider = 'kimi'` | Row updated | □ |
| DB-PRV-006 | Verify default OpenAI config | Check openai row | max_output_cap: 16384, rate_limit_rpm: 3500 | □ |
| DB-PRV-007 | Verify provider uniqueness | Try to insert duplicate provider | Should fail with unique constraint error | □ |

---

## 2. FRONTEND HOOK TESTS

### 2.1 useAdminConfig Hook

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| HOOK-001 | Initial load | Mount component using hook | `isLoading` true initially, then false | □ |
| HOOK-002 | Data fetch success | Mount component | `systemConfig` and `providerConfig` arrays populated | □ |
| HOOK-003 | Error handling | Disconnect Supabase, mount component | `error` state set, fallback values used | □ |
| HOOK-004 | Cache hit | Load page, reload within 5 minutes | Data served from localStorage cache | □ |
| HOOK-005 | Cache miss | Load page, wait 5+ minutes, reload | Fresh data fetched from database | □ |
| HOOK-006 | Refetch function | Call `refetch()` | Data reloaded from database | □ |
| HOOK-007 | Real-time update | Change DB value externally | Hook receives update, state changes | □ |
| HOOK-008 | Fallback values | Remove all DB data | DEFAULT_SYSTEM_CONFIG and DEFAULT_PROVIDER_CONFIG used | □ |

### 2.2 Cache Verification

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| CACHE-001 | Cache key | Check localStorage | Key: `onemindai-admin-config` | □ |
| CACHE-002 | Cache structure | Parse cached JSON | Contains: systemConfig, providerConfig, timestamp | □ |
| CACHE-003 | Cache expiry | Check timestamp vs current time | Expires after 5 minutes (300000ms) | □ |
| CACHE-004 | Cache clear on RT update | Trigger real-time update | localStorage cache cleared | □ |

---

## 3. BACKEND API TESTS

### 3.1 Provider Config in ai-proxy.cjs

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| API-001 | OpenAI max_tokens | Send request with max_tokens: 50000 | Capped to DB value (default 16384) | □ |
| API-002 | Anthropic max_tokens | Send request with max_tokens: 50000 | Capped to DB value (default 8192) | □ |
| API-003 | Gemini maxOutputTokens | Send request with max_tokens: 50000 | Capped to DB value (default 8192) | □ |
| API-004 | Mistral max_tokens | Send request with max_tokens: 50000 | Capped to DB value (default 32768) | □ |
| API-005 | Perplexity max_tokens | Send request with max_tokens: 50000 | Capped to DB value (default 4096) | □ |
| API-006 | DeepSeek max_tokens | Send request with max_tokens: 50000 | Capped to DB value (default 8192) | □ |
| API-007 | Groq max_tokens | Send request with max_tokens: 50000 | Capped to DB value (default 8192) | □ |
| API-008 | xAI max_tokens | Send request with max_tokens: 50000 | Capped to DB value (default 16384) | □ |
| API-009 | Kimi max_tokens | Send request with max_tokens: 50000 | Capped to DB value (default 8192) | □ |

### 3.2 Backend Cache

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| API-CACHE-001 | Cache hit | Make 2 requests within 5 minutes | Second request uses cached config | □ |
| API-CACHE-002 | Cache miss | Make request, wait 5+ minutes, make another | Fresh config fetched | □ |
| API-CACHE-003 | Fallback on error | Disconnect Supabase, make request | Hardcoded fallback values used | □ |
| API-CACHE-004 | Console logging | Check server logs | "[Config] Provider config loaded from database" logged | □ |

---

## 4. ADMIN PANEL UI TESTS

### 4.1 System Config Tab

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| UI-SYS-001 | Tab navigation | Click "System Config" tab | Tab becomes active, data loads | □ |
| UI-SYS-002 | Category grouping | View System Config tab | Items grouped by: limits, api, pricing, technical | □ |
| UI-SYS-003 | Edit button | Click edit icon on any row | Input field appears with current value | □ |
| UI-SYS-004 | Save edit | Edit value, click save | Value updated, success toast shown | □ |
| UI-SYS-005 | Cancel edit | Click edit, then cancel | Original value restored, input hidden | □ |
| UI-SYS-006 | Sensitive badge | View markup_percentage row | Red "sensitive" badge displayed | □ |
| UI-SYS-007 | Description display | View any row | Description text shown below key | □ |
| UI-SYS-008 | Refresh button | Click refresh button | Data reloaded from database | □ |
| UI-SYS-009 | Error handling | Disconnect Supabase, try to save | Error toast shown | □ |
| UI-SYS-010 | Number input | Edit prompt_soft_limit | Input type is number | □ |

### 4.2 Provider Config Tab

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| UI-PRV-001 | Tab navigation | Click "Provider Config" tab | Tab becomes active, data loads | □ |
| UI-PRV-002 | Table display | View Provider Config tab | All 9 providers shown in table | □ |
| UI-PRV-003 | Toggle enable | Click toggle for any provider | is_enabled toggled, success toast shown | □ |
| UI-PRV-004 | Disabled visual | Disable a provider | Row shows reduced opacity | □ |
| UI-PRV-005 | Edit max_output_cap | Click on max_output value | Inline edit appears | □ |
| UI-PRV-006 | Save max_output_cap | Edit value, click save | Value updated, success toast shown | □ |
| UI-PRV-007 | Edit rate_limit_rpm | Click on rate_limit value | Inline edit appears | □ |
| UI-PRV-008 | Save rate_limit_rpm | Edit value, click save | Value updated, success toast shown | □ |
| UI-PRV-009 | Refresh button | Click refresh button | Data reloaded from database | □ |
| UI-PRV-010 | Column headers | View table | Headers: Provider, Enabled, Max Output, Rate Limit (RPM), Timeout (s), Retries | □ |

---

## 5. REAL-TIME SUBSCRIPTION TESTS

### 5.1 Admin Panel Real-time

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| RT-001 | System config update | Open 2 tabs, edit in Tab A | Tab B auto-updates, shows toast | □ |
| RT-002 | Provider config update | Open 2 tabs, toggle provider in Tab A | Tab B auto-updates, shows toast | □ |
| RT-003 | Toast message | Trigger real-time update | Toast shows "🔄 System Config updated by another admin" | □ |
| RT-004 | Toast duration | Trigger real-time update | Toast disappears after 3 seconds | □ |
| RT-005 | Console logging | Trigger real-time update | Console shows "[Realtime] system_config changed: UPDATE" | □ |
| RT-006 | Subscription cleanup | Navigate away from page | Subscriptions unsubscribed (no memory leak) | □ |
| RT-007 | Multiple updates | Make 3 rapid changes | All 3 updates received in other tab | □ |

### 5.2 useAdminConfig Real-time

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| RT-HOOK-001 | System config subscription | Change DB value via SQL | Hook receives update, state changes | □ |
| RT-HOOK-002 | Provider config subscription | Change DB value via SQL | Hook receives update, state changes | □ |
| RT-HOOK-003 | Cache invalidation | Trigger real-time update | localStorage cache cleared | □ |
| RT-HOOK-004 | Change tracking | Trigger real-time update | trackChange() called with event details | □ |

---

## 6. INTEGRATION TESTS

### 6.1 End-to-End Flow

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| E2E-001 | Admin changes max_output_cap | 1. Admin edits OpenAI max_output_cap to 20000 in UI<br>2. Wait 5 minutes for cache expiry<br>3. User sends OpenAI request with max_tokens: 50000 | Request capped to 20000 | □ |
| E2E-002 | Admin disables provider | 1. Admin disables Kimi in UI<br>2. User tries to use Kimi | (Future: 503 Service Unavailable) | □ |
| E2E-003 | Admin changes prompt_soft_limit | 1. Admin changes prompt_soft_limit to 3000<br>2. User types 4000 char prompt | Warning shown at 3000 chars | □ |
| E2E-004 | Multi-admin sync | 1. Admin A and Admin B both open UI<br>2. Admin A changes value<br>3. Admin B sees change | Admin B sees update instantly | □ |

### 6.2 Data Consistency

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| CONS-001 | Frontend-Backend sync | Compare useAdminConfig values with ai-proxy values | Same values (after cache expiry) | □ |
| CONS-002 | DB-Frontend sync | Compare DB values with UI display | Exact match | □ |
| CONS-003 | Fallback consistency | Compare DEFAULT_SYSTEM_CONFIG with hardcoded backend values | Same defaults | □ |

---

## 7. EDGE CASE TESTS

### 7.1 Error Scenarios

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| EDGE-001 | Supabase unavailable | Disconnect Supabase | Fallback values used, app doesn't crash | □ |
| EDGE-002 | Empty database | Delete all rows from system_config | Fallback values used | □ |
| EDGE-003 | Invalid value type | Try to save string in number field | Validation error or type coercion | □ |
| EDGE-004 | Concurrent edits | Two admins edit same value simultaneously | Last write wins, both see final value | □ |
| EDGE-005 | Network timeout | Slow network during save | Error toast shown, retry possible | □ |
| EDGE-006 | Large value | Set max_output_cap to 999999999 | Value saved (or validation error) | □ |
| EDGE-007 | Negative value | Set max_output_cap to -1 | Validation error or handled gracefully | □ |
| EDGE-008 | Zero value | Set rate_limit_rpm to 0 | Value saved or validation error | □ |

### 7.2 Browser Edge Cases

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| BROWSER-001 | localStorage disabled | Disable localStorage in browser | App works without cache | □ |
| BROWSER-002 | Multiple tabs | Open 5 tabs of admin panel | All tabs sync via real-time | □ |
| BROWSER-003 | Tab close during edit | Start edit, close tab | No orphaned subscriptions | □ |
| BROWSER-004 | Browser refresh | Refresh during data load | Data loads correctly | □ |
| BROWSER-005 | Back/forward navigation | Use browser back/forward | State preserved correctly | □ |

---

## 8. PERFORMANCE TESTS

### 8.1 Load Time

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| PERF-001 | Initial load (cold) | Clear cache, load admin panel | < 2 seconds to display data | □ |
| PERF-002 | Initial load (warm) | Load with cache | < 500ms to display data | □ |
| PERF-003 | Tab switch | Switch between tabs | < 200ms to display data | □ |
| PERF-004 | Save operation | Save a value | < 1 second to complete | □ |

### 8.2 Memory

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| PERF-MEM-001 | Memory leak check | Open/close admin panel 10 times | No memory increase | □ |
| PERF-MEM-002 | Subscription cleanup | Navigate away and back 10 times | No orphaned WebSocket connections | □ |
| PERF-MEM-003 | Long session | Keep admin panel open for 1 hour | Memory stable | □ |

---

## 9. SECURITY TESTS

### 9.1 Access Control

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| SEC-001 | Unauthenticated access | Try to access admin panel without login | Redirected to login | □ |
| SEC-002 | Non-admin access | Login as regular user, try to access admin | Access denied | □ |
| SEC-003 | Direct API access | Try to call Supabase directly without auth | RLS blocks access | □ |

### 9.2 Data Validation

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| SEC-VAL-001 | XSS in value | Try to save `<script>alert('xss')</script>` | Sanitized or rejected | □ |
| SEC-VAL-002 | SQL injection | Try to save `'; DROP TABLE system_config; --` | Parameterized query prevents injection | □ |
| SEC-VAL-003 | Sensitive data exposure | Check network tab for markup_percentage | Value transmitted securely | □ |

---

## Test Execution Summary

### Quick Smoke Test (5 minutes)

Run these tests first to verify basic functionality:

```
□ DB-SYS-001 - system_config table exists
□ DB-PRV-001 - provider_config table exists
□ HOOK-002 - useAdminConfig fetches data
□ UI-SYS-001 - System Config tab loads
□ UI-PRV-001 - Provider Config tab loads
□ UI-SYS-004 - Can edit and save system config
□ UI-PRV-003 - Can toggle provider
□ RT-001 - Real-time updates work
```

### Full Regression Test (30 minutes)

Run all tests in order:
1. Database Layer Tests (5 min)
2. Frontend Hook Tests (5 min)
3. Backend API Tests (5 min)
4. Admin Panel UI Tests (10 min)
5. Real-time Subscription Tests (5 min)

### Pre-Release Checklist

```
□ All smoke tests pass
□ All critical tests pass (marked with *)
□ No console errors
□ Build passes
□ Performance within acceptable limits
```

---

## Test Environment Setup

### Prerequisites

1. **Supabase Project** - With system_config and provider_config tables
2. **Seed Data** - All default values populated
3. **Environment Variables** - VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY set
4. **Backend Running** - `npm run dev:server` on port 3001
5. **Frontend Running** - `npm run dev` on port 5173

### Test Data Reset

```sql
-- Reset system_config to defaults
UPDATE system_config SET value = 5000 WHERE key = 'prompt_soft_limit';
UPDATE system_config SET value = 10000 WHERE key = 'prompt_hard_limit';
-- ... (repeat for all keys)

-- Reset provider_config to defaults
UPDATE provider_config SET is_enabled = true, max_output_cap = 16384 WHERE provider = 'openai';
UPDATE provider_config SET is_enabled = true, max_output_cap = 8192 WHERE provider = 'anthropic';
-- ... (repeat for all providers)
```

---

## Defect Tracking

| Defect ID | Test ID | Description | Severity | Status |
|-----------|---------|-------------|----------|--------|
| | | | | |

---

**End of Test Cases Document**
