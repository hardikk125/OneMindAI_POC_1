# Change Request Protocol - Complete Workflow

**Effective Date:** Dec 11, 2025  
**Version:** 1.0  
**Status:** ACTIVE

---

## Overview

All future change requests must follow this structured protocol. This ensures:
- ✅ Build integrity maintained
- ✅ No regressions introduced
- ✅ Complete audit trail
- ✅ Safe revert capability
- ✅ Full transparency on changes

---

## Phase 1: PROPOSAL & ANALYSIS (Before Any Code Changes)

When you request a change, I will:

### 1.1 Clarify Your Intent
Ask for details if unclear:
- What exactly do you want to change?
- Why do you want this change?
- What problem does it solve?

### 1.2 Propose Changes with Full Analysis

**Format:**
```
## CHANGE PROPOSAL

### What I Will Change
- [Specific files and functions affected]
- [New files to create, if any]

### Why These Changes
- [Root cause analysis]
- [Design rationale]

### Benefits
- [User-facing benefits]
- [Technical improvements]

### Impact Analysis
| Layer | Impact | Details |
|-------|--------|---------|
| Frontend | NONE/LOW/MEDIUM/HIGH | ... |
| Backend | NONE/LOW/MEDIUM/HIGH | ... |
| Database | NONE/LOW/MEDIUM/HIGH | ... |
| Performance | NONE/LOW/MEDIUM/HIGH | ... |
| Bundle Size | +Xkb or NONE | ... |

### Affected Components (Already Working)
- [List any existing features that might be impacted]
- [Analysis of potential issues]
- [Mitigation strategies]

### Pre-Existing Issues Found
- [Any build/lint errors before starting]
- [Recommendation to fix first]

### Questions for You
- [Any clarifications needed]
```

---

## Phase 2: YOUR APPROVAL

**You must explicitly approve** before I make ANY code changes.

Response options:
- ✅ "Approved" - Proceed with changes
- 🔄 "Ask more questions" - I provide more details
- ❌ "Reject" - I don't proceed
- 📝 "Modify proposal" - I adjust and re-propose

---

## Phase 3: IMPLEMENTATION (Only After Approval)

Once approved, I will:

### 3.1 Pre-Flight Check
```bash
npm run build 2>&1
```
- If build fails → List errors, ask if you want to fix first
- If build passes → Proceed with changes

### 3.2 Make Changes
- Implement all requested modifications
- Fix any lint/syntax errors immediately
- Verify each file after editing

### 3.3 Post-Change Verification
```bash
npm run build 2>&1
```
- Confirm build still passes
- If fails → Fix immediately, don't show you broken code

### 3.4 Error Regression Check
Execute `/error-regression` workflow:
- Scan ERROR_REGISTRY.md
- Check for protected code (🔒 comments)
- Verify no known patterns broken
- Provide risk rating: NONE/LOW/HIGH

---

## Phase 4: SHOW CHANGES (After Implementation)

**Format:**

```
## CHANGE SUMMARY

**Date:** YYYY-MM-DD  
**Feature:** [Name]  
**Status:** IMPLEMENTED ✅

### Files Created
| File | Purpose | Lines |
|------|---------|-------|
| path/to/file.tsx | Description | +XX |

### Files Modified
| File | Lines | Summary |
|------|-------|---------|
| path/to/file.tsx | XX-YY | Description |

---

## DETAILED CHANGES

### [Filename]

**BEFORE (lines X-Y):**
\`\`\`@/path/to/file.tsx:X-Y
[old code]
\`\`\`

**AFTER (lines X-Y):**
\`\`\`@/path/to/file.tsx:X-Y
[new code]
\`\`\`

**What Changed:** [Explanation]

---

## BUILD VERIFICATION

✅ Build Status: PASSING  
✅ Lint Errors: NONE  
✅ Error Regression: PASSED  
✅ Risk Rating: NONE/LOW/HIGH

---

## TESTING CHECKLIST

- [ ] Test item 1
- [ ] Test item 2
- [ ] [Generate relevant tests]

---

## REVERT INSTRUCTIONS

### If You Don't Like It

**Single Command (copy-paste ready):**
\`\`\`bash
git checkout HEAD -- [files] && rm -f [new files]
\`\`\`

**What Will Be Reverted:**
- File A: Removes lines X-Y
- File B: Removes entire file
- File C: Restores original code

**After Revert, Code Will Look Like:**
[Show the original state]

---

## APPROVAL CHECKLIST

- [ ] Changes look good
- [ ] No unexpected side effects
- [ ] Ready to commit
```

---

## Phase 5: YOUR DECISION

After seeing changes:

### Option A: Accept Changes
- ✅ "Looks good, keep it"
- I will show git commit command
- You approve commit, I execute it

### Option B: Revert Changes
- ❌ "I don't like it, revert"
- I show revert command with clear preview
- You approve revert command
- I execute revert
- I show comparison: OLD → NEW → REVERTED

### Option C: Modify Changes
- 🔄 "Modify it like this..."
- I go back to Phase 1 (PROPOSAL)
- New proposal with modifications
- Back to Phase 2 (YOUR APPROVAL)

---

## Phase 6: FINAL COMPARISON (If Reverted)

**Format:**

```
## REVERT COMPARISON

### Original Code (Before Any Changes)
\`\`\`@/path/to/file.tsx:X-Y
[original code]
\`\`\`

### Modified Code (What You Rejected)
\`\`\`@/path/to/file.tsx:X-Y
[modified code]
\`\`\`

### After Revert (Current State)
\`\`\`@/path/to/file.tsx:X-Y
[reverted code - same as original]
\`\`\`

**Status:** ✅ Reverted to original state
```

---

## Phase 7: AUDIT DOCUMENTATION

After every change (approved or reverted), I create:

**File:** `docs/AUDIT_[FEATURE]_[YYYY-MM-DD].md`

**Contents:**
- Pre-flight build status
- All files created/modified
- Detailed before/after code
- Impact analysis
- Error regression results
- Revert instructions
- Final approval status

---

## MANDATORY RULES

### ❌ NEVER
- Proceed without your explicit approval
- Ignore build/lint errors
- Skip post-change verification
- Assume errors are "pre-existing" without proof
- Make changes without showing proposal first

### ✅ ALWAYS
- Show proposal before implementing
- Fix errors immediately when found
- Verify build after changes
- Provide working revert commands
- Document everything in audit file
- Ask clarifying questions upfront

---

## How to Request Changes

### Format 1: Simple Request
```
Add a dark mode toggle to the settings page
```

I will:
1. Ask clarifying questions
2. Propose changes with analysis
3. Wait for your approval
4. Implement after approval
5. Show you the changes
6. Provide revert option

### Format 2: With /safe-change Command
```
/safe-change Add a dark mode toggle to the settings page
```

Same as Format 1, but I explicitly run the `/safe-change` workflow for extra verification.

### Format 3: Detailed Request
```
I want to add feature X because Y. It should:
- Do this
- Do that
- Not break existing feature Z
```

I will:
1. Acknowledge your requirements
2. Propose implementation
3. Highlight any potential issues with feature Z
4. Wait for approval
5. Proceed with implementation

---

## Example Workflow

### Step 1: You Request
> "Add email validation to the signup form"

### Step 2: I Propose
```
## CHANGE PROPOSAL

### What I Will Change
- src/components/auth/SignupForm.tsx (add validation logic)
- src/lib/validation.ts (new email validation function)

### Why
- Current form accepts invalid emails
- Reduces failed API calls

### Impact Analysis
| Layer | Impact | Details |
|-------|--------|---------|
| Frontend | LOW | Form validation only |
| Backend | NONE | No API changes |
| Performance | NONE | Client-side validation |

### Questions
- Should we also validate on backend?
- What error message format do you prefer?
```

### Step 3: You Approve
> "Approved, validate on both client and server"

### Step 4: I Implement
- Check build passes
- Make changes
- Verify build still passes
- Run error regression

### Step 5: I Show Changes
```
## CHANGE SUMMARY

### Files Modified
| File | Lines | Summary |
|------|-------|---------|
| src/components/auth/SignupForm.tsx | 45-67 | Added email validation |
| src/lib/validation.ts | 1-25 | New email validator |

### DETAILED CHANGES

### SignupForm.tsx

**BEFORE (lines 45-50):**
\`\`\`@/src/components/auth/SignupForm.tsx:45-50
const handleSubmit = (data) => {
  api.signup(data)
}
\`\`\`

**AFTER (lines 45-67):**
\`\`\`@/src/components/auth/SignupForm.tsx:45-67
const handleSubmit = (data) => {
  const error = validateEmail(data.email)
  if (error) {
    setError(error)
    return
  }
  api.signup(data)
}
\`\`\`

✅ Build Status: PASSING
```

### Step 6: You Decide
> "Looks good, keep it"

### Step 7: I Commit
```bash
git add src/components/auth/SignupForm.tsx src/lib/validation.ts
git commit -m "feat: add email validation to signup form"
```

---

## Summary

This protocol ensures:
- 🔍 **Transparency** - You see everything before it happens
- 🛡️ **Safety** - Build always passes, errors caught early
- 📝 **Auditability** - Complete record of all changes
- ⏮️ **Revertibility** - One command to undo anything
- 🤝 **Control** - You approve every step

**All future changes will follow this protocol.**
