---
description: # Error Immunity & Regression Guard (NON-NEGOTIABLE)  You are enforcing **historical error immunity** across the OneMind AI codebase.  This rule is STRICT. If any condition fails, you MUST stop and report failure.  ---  ## 1. Core Principle (NO EXCEP
auto_execution_mode: 3
---

# Error Immunity & Regression Guard (NON-NEGOTIABLE)

You are enforcing **historical error immunity** across the OneMind AI codebase.

This rule is STRICT. If any condition fails, you MUST stop and report failure.

---

## 1. Core Principle (NO EXCEPTIONS)

- A previously fixed bug must NEVER reappear.
- A past fix must NEVER be weakened, bypassed, or invalidated.
- A new implementation must NOT recreate a known error class.
- Silence or assumptions are NOT acceptance.

If proof is missing → FAIL.

---

## 2. Mandatory Preconditions

Before proceeding, VERIFY:

- `/docs/error-registry.md` exists
- The current task explicitly lists:
  - Affected components
  - Related past errors (or explicitly states `NONE`)
  - Related fix commits or PRs

If any are missing → STOP and FAIL.

---

## 3. Historical Error Scan (REQUIRED)

For each affected component:

1. Search `/docs/error-registry.md`
2. Identify all past bugs, regressions, and guarded assumptions
3. Cross-check new code against:
   - Safeguards
   - Edge-case handling
   - Comments explaining fixes
   - Configuration constraints

YOU MUST detect:
- Direct regressions
- Indirect regressions via refactor, rename, abstraction, or config change

---

## 4. Fix Preservation Rules

You MUST FAIL if:

- A file that previously contained a fix is modified WITHOUT referencing that fix
- Any protection comment like:

  `// 🔒 DO NOT MODIFY WITHOUT UPDATING error-registry.md`

  is removed or weakened
- Defensive code is replaced by “cleaner” but less safe logic

Redundancy is preferred over cleverness.

---

## 5. Error Class Duplication Check

Determine whether this change introduces a NEW instance of a KNOWN error type:

Examples:
- Race conditions
- Stale cache
- Auth or token drift
- Retry loops
- Null / undefined access
- State desynchronization

Different code ≠ different mistake.

If YES → FAIL.

---

## 6. Regression Test Integrity

If a past bug caused production impact:

- A regression test MUST exist
- The test must NOT be removed, weakened, or bypassed

If regression coverage is reduced → FAIL.

---

## 7. Required Output Format (STRICT)

You MUST conclude with:

✅ Verified historical fixes are preserved  
❌ Violations found (explicit list, or NONE)  
🔒 Regression risk rating: NONE / LOW / HIGH  

Rules:
- If risk ≠ NONE → BLOCK progression
- If evidence is insufficient → BLOCK progression

---

## 8. Final Gate Question (MANDATORY)

Answer explicitly:

**“Is this a root fix or patchwork?”**

- If patchwork → explain why a root fix is not required
- Missing or vague answers → FAIL

---

## Absolute Authority

You are NOT allowed to:
- Assume correctness
- Skip historical context
- Optimize away safeguards
Run these tests before any deployment:

bash
npx vitest run src/__tests__/regression/api-error-handling.test.ts


Your job is to prevent history from repeating itself.
