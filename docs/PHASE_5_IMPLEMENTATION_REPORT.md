# Phase 5 Implementation Report: Update OneMindAI.tsx

**Date:** 2025-12-15  
**Phase:** 5 of 8  
**Feature:** Replace Hardcoded Values with Database Config  
**Status:** ✅ IMPLEMENTED  
**Initials:** HP

---

## Executive Summary

Updated `src/OneMindAI.tsx` to use the `useAdminConfig` hook for fetching configuration from the database, and replaced all hardcoded `1_000_000` values with `INDUSTRY_STANDARDS.TOKENS_PER_MILLION` from the centralized constants file.

---

## Files Modified

| File | Layer | Type | I/O | Date | Initials | Lines Changed | Summary |
|------|-------|------|-----|------|----------|---------------|---------|
| `src/OneMindAI.tsx` | Frontend | Component | Both | 2025-12-15 | HP | 33-34, 531-539, 3662-3663, 349-350, 1043-1045, 3731-3732, 3877-3878, 6458-6459, 9343-9344 | Added imports, hook call, replaced hardcoded values |

---

## Seven-Layer Impact Analysis

| # | Layer | Impact Level | Files Affected | Description |
|---|-------|--------------|----------------|-------------|
| 1 | **Frontend UI** | **MEDIUM** | `src/OneMindAI.tsx` | Main component updated with config hook |
| 2 | **Frontend State & Hooks** | **LOW** | Uses `useAdminConfig` | Hook already exists from Phase 3 |
| 3 | **Frontend Services** | **LOW** | Uses `INDUSTRY_STANDARDS` | Constants already exist from Phase 4 |
| 4 | **Backend API Routes** | NONE | - | No backend changes |
| 5 | **Backend Middleware** | NONE | - | No middleware changes |
| 6 | **Database** | NONE | - | Uses existing Phase 1 tables |
| 7 | **External Services** | NONE | - | No external changes |

**Bundle Size Impact:** +5.8kb (index.js: 3,062.20 → 3,068.00 kB)  
**Performance Impact:** MINIMAL (config is cached for 5 minutes)

---

## Cross-Phase Data Validation

| Source | Target | Data Type | Validation |
|--------|--------|-----------|------------|
| Phase 1: `stream_timeout_ms = 30000` | Phase 5: `getSystemConfig('stream_timeout_ms', 30000)` | Number | ✅ MATCH |
| Phase 1: `update_interval_ms = 15` | Phase 5: `getSystemConfig('update_interval_ms', 15)` | Number | ✅ MATCH |
| Phase 1: `prompt_soft_limit = 5000` | Phase 5: `getSystemConfig('prompt_soft_limit', 5000)` | Number | ✅ MATCH |
| Phase 1: `prompt_hard_limit = 10000` | Phase 5: `getSystemConfig('prompt_hard_limit', 10000)` | Number | ✅ MATCH |
| Phase 1: `prompt_chunk_size = 4000` | Phase 5: `getSystemConfig('prompt_chunk_size', 4000)` | Number | ✅ MATCH |
| Phase 4: `TOKENS_PER_MILLION = 1_000_000` | Phase 5: `INDUSTRY_STANDARDS.TOKENS_PER_MILLION` | Number | ✅ MATCH |

---

## Implementation Details

### 1. New Imports Added (lines 33-34)

```typescript
import { useAdminConfig, getSystemConfig } from './hooks/useAdminConfig';
import { INDUSTRY_STANDARDS } from './config/constants';
```

### 2. Hook Call Added (line 532)

```typescript
const { systemConfig, isLoading: adminConfigLoading } = useAdminConfig();
```

### 3. LIMITS Now From Database (lines 535-539)

**BEFORE:**
```typescript
const LIMITS = {
  PROMPT_SOFT_LIMIT: 5000,    // Warning
  PROMPT_HARD_LIMIT: 10000,   // Block
  PROMPT_CHUNK_SIZE: 4000,    // For chunking
};
```

**AFTER:**
```typescript
const LIMITS = {
  PROMPT_SOFT_LIMIT: getSystemConfig<number>(systemConfig, 'prompt_soft_limit', 5000),
  PROMPT_HARD_LIMIT: getSystemConfig<number>(systemConfig, 'prompt_hard_limit', 10000),
  PROMPT_CHUNK_SIZE: getSystemConfig<number>(systemConfig, 'prompt_chunk_size', 4000),
};
```

### 4. Streaming Config From Database (lines 3662-3663)

**BEFORE:**
```typescript
const UPDATE_INTERVAL = 16; // ~60fps for smooth rendering
const STREAM_TIMEOUT = 30000; // 30 seconds without chunks = timeout
```

**AFTER:**
```typescript
const UPDATE_INTERVAL = getSystemConfig<number>(systemConfig, 'update_interval_ms', 15); // ~67fps for smooth rendering
const STREAM_TIMEOUT = getSystemConfig<number>(systemConfig, 'stream_timeout_ms', 30000); // 30 seconds without chunks = timeout
```

### 5. Token Pricing Calculations (12 replacements)

**BEFORE:**
```typescript
const inCost = (promptTokens / 1_000_000) * versionPricing.in;
```

**AFTER:**
```typescript
const inCost = (promptTokens / INDUSTRY_STANDARDS.TOKENS_PER_MILLION) * versionPricing.in;
```

**Locations Updated:**
- Line 349-350: `calculateEstimatedCost()` function
- Line 1043-1045: `computePreview()` function
- Line 3731-3732: Credit deduction after streaming
- Line 3877-3878: Credit deduction after auto-retry
- Line 6458-6459: Engine selection UI calculation
- Line 9343-9344: Mobile engine selection UI calculation

---

## Build Verification

| Check | Status |
|-------|--------|
| Pre-flight build | ✅ PASSING |
| Post-change build | ✅ PASSING |
| TypeScript errors | ✅ NONE |
| Lint errors | ✅ NONE |
| Bundle size change | +5.8kb (acceptable) |

---

## Testing Checklist

- [ ] App loads without errors
- [ ] LIMITS.PROMPT_SOFT_LIMIT shows warning at 5000 chars
- [ ] LIMITS.PROMPT_HARD_LIMIT blocks at 10000 chars
- [ ] Streaming works with UPDATE_INTERVAL from database
- [ ] Stream timeout works with STREAM_TIMEOUT from database
- [ ] Token cost calculations are correct
- [ ] Credit deduction works correctly

---

## Next Steps

Phase 5 is complete. Ready for:
- **Phase 6:** Update `ai-proxy.cjs` to fetch provider config from database

---

**Report Generated:** 2025-12-15  
**Initials:** HP
