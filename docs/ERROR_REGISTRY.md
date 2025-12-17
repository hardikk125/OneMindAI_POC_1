# 🚨 Error Registry

> **Purpose:** Document critical bugs, regressions, and "must NEVER happen again" moments.
> 
> **Rules:**
> - ✅ Bugs that hit production
> - ✅ Regressions  
> - ✅ Near-misses
> - ✅ "This must NEVER happen again" moments
> - ❌ NOT every bug
> - ❌ NOT auto-generated
> - ❌ NOT a changelog
> - ❌ Refactors must NOT delete constraints

---

## How to Add Entries

1. **AI drafts** entry with `[DRAFT]` prefix
2. **Human reviews** the draft
3. **Human edits** as needed
4. **Human removes** `[DRAFT]` and commits
5. **Human owns** accountability

---

## Entry Template

```markdown
## ERR-XXX: Brief Title

**Status:** 🟢 Resolved | 🟡 Monitoring | 🔴 Open
**Date Discovered:** YYYY-MM-DD
**Severity:** Critical | High | Medium | Low
**Affected Area:** [Component/API/Feature]

### What Happened
[Clear description]

### Root Cause
[Why it happened]

### Fix Applied
[What was changed]

### Regression Test
[Link to test file or test name]

### Constraint Added
[Rule to prevent recurrence - this is the most important part]

### Reviewed By
[Human name/initials]
```

---

## Registry Entries

<!-- Entries below this line -->

---

## [DRAFT] ERR-001: API Failure Handling - Silent Failures

**Status:** 🔴 DRAFT - PENDING HUMAN REVIEW  
**Date Discovered:** 2024-12-09  
**Severity:** High  
**Affected Area:** API calls across the application

### What Happened
API failures may not be properly caught and displayed to users, leading to:
- Silent failures with no user feedback
- Uncaught promise rejections
- Missing error boundaries around API-dependent components

### Root Cause
1. Inconsistent try/catch usage around async API calls
2. Missing error state handling in components
3. No centralized error logging for API failures
4. Retry logic not implemented consistently

### Fix Applied
[PENDING - Implement the following:]
1. Create centralized API error handler
2. Add ErrorBoundary components around critical sections
3. Implement retry with exponential backoff (3 retries)
4. Add user-friendly error messages
5. Log all API errors with context

### Regression Test
```
src/__tests__/regression/api-error-handling.test.ts
```

### Constraint Added
```
RULE: All async API calls MUST:
1. Be wrapped in try/catch
2. Show user-friendly error message on failure
3. Log error with timestamp and context
4. Implement 3-retry with exponential backoff
5. Never expose raw stack traces to users
```

### Reviewed By
- [ ] Human review pending

---

<!-- Add new entries above this line -->
