Change Request Template - Standardized Format
 
Use this template when requesting any changes. Fill in the sections relevant to your request.
 
---
 
## CHANGE REQUEST FORM
 
### 1. WHAT DO YOU WANT TO DO?
 
**Description:** 
```
I am looking to – this will be present in the prompt itself
```
 
**Example:**
```
I am looking to do add dark mode toggle to settings:
- Toggle should appear in user menu
- Save preference to localStorage
- Apply theme on page load
```
 
---
 
## MY RESPONSE: CHANGE PROPOSAL
 
After you submit a request, I will respond with this structure:
 
### 1. WHAT I WILL CHANGE
 
**Files to Modify:**
- `path/to/file1.tsx` - Description of changes
- `path/to/file2.ts` - Description of changes
 
**Files to Create:**
- `path/to/newfile.tsx` - Purpose and description
 
**Functions/Components Affected:**
- `ComponentName()` - What will change
- `functionName()` - What will change
 
---
 
### 2. WHY THESE CHANGES
 
**Root Cause Analysis:**
- [Why the current code doesn't meet your needs]
- [What problem this solves]
 
**Design Rationale:**
- [Why this approach is chosen]
- [Alternative approaches considered and why rejected]
 
---
 
### 3. BENEFITS
 
**User-Facing Benefits:**
- [What users will see/experience]
- [Improved workflows]
- [Better UX]
 
**Technical Benefits:**
- [Code quality improvements]
- [Performance gains]
- [Maintainability improvements]
 
---
 
### 4. IMPACT ANALYSIS
 
| Layer | Impact Level | Description |
|-------|--------------|-------------|
| **Frontend** | NONE/LOW/MEDIUM/HIGH | [Which components affected, how] |
| **Backend** | NONE/LOW/MEDIUM/HIGH | [API changes, if any] |
| **Database** | NONE/LOW/MEDIUM/HIGH | [Schema changes, if any] |
| **Performance** | NONE/LOW/MEDIUM/HIGH | [Bundle size, load time, etc] |
| **Bundle Size** | +Xkb or NONE | [Estimated increase] |
 
---
 
### 5. AFFECTED COMPONENTS (ALREADY WORKING)
 
**Components That Might Be Impacted:**
- `ComponentA` - How it's affected
- `ComponentB` - How it's affected
 
**Potential Issues:**
- [Issue 1 and mitigation strategy]
- [Issue 2 and mitigation strategy]
 
**Risk Assessment:**
- [Overall risk level: NONE/LOW/MEDIUM/HIGH]
- [Why this risk level]
 
---
 
### 6. PRE-EXISTING ISSUES FOUND
 
**Build Status Before Changes:**
- ✅ PASSING or ❌ FAILING
 
**Existing Errors/Warnings:**
- [List any errors found before starting]
- [Recommendation: Fix first or proceed?]
 
---
 
### 7. QUESTIONS FOR YOU
 
- [Clarification 1?]
- [Clarification 2?]
- [Design decision 1?]
 
---
 
## YOUR RESPONSE: APPROVAL
 
After reviewing my proposal, you can respond with:
 
### Option A: APPROVE
```
Approved - proceed with changes
```
 
### Option B: REQUEST MODIFICATIONS
```
Modify the proposal:
- Change X to Y
- Add feature Z
- Don't touch component A
```
*I will re-propose with your modifications*
 
### Option C: REJECT
```
Don't proceed with this change
```
 
### Option D: ASK QUESTIONS
```
Before I approve, clarify:
- Question 1?
- Question 2?
```
*I will provide more details*
 
---
 
## AFTER APPROVAL: IMPLEMENTATION
 
Once you approve, I will:
 
### Pre-Flight Check
```bash
npm run build 2>&1
```
- ✅ If PASSING: Proceed with changes
- ❌ If FAILING: List errors, ask if you want to fix first
 
### Make Changes
- Implement all modifications
- Fix any lint/syntax errors immediately
- Verify each file compiles
 
### Post-Change Verification
```bash
npm run build 2>&1
```
- ✅ Confirm build still passes
- ❌ If fails: Fix immediately
 
 
## AFTER IMPLEMENTATION: SHOW CHANGES
 
I will present changes in this format:
 
### CHANGE SUMMARY
 
**Date:** YYYY-MM-DD  
**Feature:** [Name]  
**Status:** ✅ IMPLEMENTED
 
### Files Created
| File | Purpose | Lines |
|------|---------|-------|
| path/to/file.tsx | Description | +XX |
 
### Files Modified
| File | Lines Changed | Summary |
|------|---------------|---------|
| path/to/file.tsx | XX-YY | Description |
 
---
 
### DETAILED CHANGES
 
#### [Filename 1]
 
**BEFORE (lines X-Y):**
```@/path/to/file.tsx:X-Y
[old code here]
```
 
**AFTER (lines X-Y):**
```@/path/to/file.tsx:X-Y
[new code here]
```
 
**What Changed:** [Explanation of the change]
 
---
 
#### [Filename 2]
 
**BEFORE (lines X-Y):**
```@/path/to/file.tsx:X-Y
[old code here]
```
 
**AFTER (lines X-Y):**
```@/path/to/file.tsx:X-Y
[new code here]
```
 
**What Changed:** [Explanation of the change]
 
---
 
### BUILD VERIFICATION
 
✅ Build Status: PASSING  
✅ Lint Errors: NONE  
✅ Error Regression: PASSED  
✅ Risk Rating: NONE/LOW/HIGH
 
---
 
### TESTING CHECKLIST
 
- [ ] Test item 1
- [ ] Test item 2
- [ ] Test item 3
 
---
 
## YOUR RESPONSE: DECISION
 
After seeing the changes, you can respond with:
 
### Option A: ACCEPT CHANGES
```
Looks good, keep it
```
*I will show git commit command and execute after your approval*
 
### Option B: REJECT CHANGES (REVERT)
```
I don't like it, revert
```
*I will show revert command with preview before executing*
 
### Option C: MODIFY CHANGES
```
Modify it like this:
- Change X to Y
- Remove feature Z
```
*I will go back to PROPOSAL phase with modifications*
 
---
 
## IF YOU REJECT: REVERT INSTRUCTIONS
 
I will show you this:
 
### REVERT COMMAND (copy-paste ready)
 
```bash
git checkout HEAD -- [modified files] && rm -f [new files]
```
 
### What Will Be Reverted
 
**File A:** Removes lines X-Y  
**File B:** Removes entire file  
**File C:** Restores original code  
 
### After Revert, Code Will Look Like
 
```@/path/to/file.tsx:X-Y
[original code - before any changes]
```
 
---
 
## YOUR RESPONSE: APPROVE REVERT
 
After reviewing the revert command:
 
```
Approved - revert the changes
```
 
*I will execute the revert command*
 
---
 
## AFTER REVERT: FINAL COMPARISON
 
I will show you three versions side-by-side:
 
### THREE-WAY COMPARISON
 
#### Version 1: ORIGINAL (Before Any Changes)
```@/path/to/file.tsx:X-Y
[original code]
```
 
#### Version 2: MODIFIED (What You Rejected)
```@/path/to/file.tsx:X-Y
[modified code]
```
 
#### Version 3: AFTER REVERT (Current State)
```@/path/to/file.tsx:X-Y
[reverted code - same as original]
```
 
**Status:** ✅ Reverted to original state
 
---
 
## AUDIT DOCUMENTATION
 
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
- Three-way comparison (if reverted)
 
---
 
## COMPLETE WORKFLOW SUMMARY
 
```
1. YOU REQUEST CHANGE
   ↓
2. I PROPOSE (with analysis)
   ↓
3. YOU APPROVE/REJECT/MODIFY
   ↓
4. I IMPLEMENT (if approved)
   ↓
5. I SHOW CHANGES
   ↓
6. YOU ACCEPT/REJECT/MODIFY
   ↓
7. IF REJECTED: I SHOW REVERT COMMAND
   ↓
8. YOU APPROVE REVERT
   ↓
9. I EXECUTE REVERT
   ↓
10. I SHOW THREE-WAY COMPARISON
   ↓
11. AUDIT FILE CREATED
```
 
---
 
## EXAMPLE WORKFLOW
 
### Step 1: You Request
```
I am looking to add email validation to signup form:
- Validate email format on client side
- Show error message if invalid
- Also validate on server side
```
 
### Step 2: I Propose
```
## CHANGE PROPOSAL
 
### What I Will Change
- src/components/auth/SignupForm.tsx - Add validation logic
- src/lib/validation.ts - New email validator function
- src/api/auth.ts - Add server-side validation
 
### Why These Changes
- Current form accepts invalid emails
- Reduces failed API calls
- Improves user experience
 
### Benefits
- User-facing: Clear error messages for invalid emails
- Technical: Prevents invalid data from reaching API
 
### Impact Analysis
| Layer | Impact | Details |
|-------|--------|---------|
| Frontend | LOW | Form validation only |
| Backend | LOW | New validation endpoint |
| Database | NONE | No schema changes |
| Performance | NONE | Client-side validation |
| Bundle Size | NONE | No new dependencies |
 
### Affected Components
- AuthModal - May show validation errors
- SignupForm - Will have new validation
 
### Pre-Existing Issues Found
- NONE - Build passing
 
### Questions for You
- Should we show real-time validation or on submit?
- What email format should we accept?
```
 
### Step 3: You Approve
```
Approved - validate on submit, accept standard email format
```
 
### Step 4: I Implement
- Check build passes ✅
- Make changes
- Verify build passes ✅
- Run error regression ✅
 
### Step 5: I Show Changes
```
## CHANGE SUMMARY
 
**Date:** 2025-12-11  
**Feature:** Email Validation  
**Status:** ✅ IMPLEMENTED
 
### Files Modified
| File | Lines | Summary |
|------|-------|---------|
| src/components/auth/SignupForm.tsx | 45-67 | Added validation |
| src/lib/validation.ts | 1-25 | New validator |
 
### DETAILED CHANGES
 
#### SignupForm.tsx
 
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
```
Looks good, keep it
```
 
### Step 7: I Commit
```bash
git add src/components/auth/SignupForm.tsx src/lib/validation.ts
git commit -m "feat: add email validation to signup form"
```
 
---
 
## KEY RULES
 
### ❌ NEVER
- Proceed without your explicit approval
- Ignore build/lint errors
- Skip post-change verification
- Make changes without showing proposal first
 
### ✅ ALWAYS
- Show proposal before implementing
- Fix errors immediately when found
- Verify build after changes
- Provide working revert commands
- Document everything in audit file
- Ask clarifying questions upfront
 
---
 
## READY TO USE
 
This template is now active. When you request a change, use the format:
 
```
I am looking to do [feature/fix]:
- [Detail 1]
- [Detail 2]
- [Detail 3]
```
 
I will respond with the CHANGE PROPOSAL structure above.

