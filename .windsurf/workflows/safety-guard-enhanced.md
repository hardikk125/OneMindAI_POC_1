---
description: Safety Guard - Controlled change workflow with 7-layer impact analysis, unit tests preview, error handling, file tracking, trace logs, and Word doc generation
---

# Safety Guard Enhanced Workflow

**Version:** 2.0  
**Last Updated:** 2025-12-13  
**Maintainer:** HP

**CRITICAL RULE:** When user says "only do this phase" or "implement phase X", execute ONLY that specific phase. Do NOT proceed to other phases. Stop completely after the specified phase is done.

---

## CHANGE REQUEST FORM

### 1. WHAT DO YOU WANT TO DO?

**Description:** 
```
I am looking to – [user's request will be here]
```

**Example:**
```
I am looking to add dark mode toggle to settings:
- Toggle should appear in user menu
- Save preference to localStorage
- Apply theme on page load
```

---

## MY RESPONSE: CHANGE PROPOSAL

After you submit a request, I will respond with this structure:

### 1. FILES TO BE CHANGED

**Files to Modify:**
| File Path | Layer | Type | I/O | Date | Initials | Description of Changes |
|-----------|-------|------|-----|------|----------|------------------------|
| `path/to/file.tsx` | Frontend | Component | Output | YYYY-MM-DD | HP | What will change |
| `path/to/file.ts` | Backend | Service | Input | YYYY-MM-DD | HP | What will change |
| `path/to/file.sql` | Database | Migration | N/A | YYYY-MM-DD | HP | What will change |

**Files to Create:**
| File Path | Layer | Type | I/O | Date | Initials | Purpose |
|-----------|-------|------|-----|------|----------|---------|
| `path/to/newfile.tsx` | Frontend | Component | Output | YYYY-MM-DD | HP | Description |

**Functions/Components Affected:**
- `ComponentName()` - What will change
- `functionName()` - What will change
- `middleware()` - What will change

**File Metadata Legend:**
- **Layer:** Frontend / Backend / Database / N/A
- **Type:** Component / Hook / Service / Migration / Test / Workflow / Documentation
- **I/O:** Input (receives data) / Output (produces data) / Both / N/A
- **Initials:** HP (developer identifier)

---

### 1.1 FUNCTIONS/COMPONENTS TRIGGERED (PRE-APPROVAL STAGE)

**During the change proposal phase, these functions are analyzed and may be triggered:**

| Function/Component | File | Layer | Type | Triggered By | Purpose |
|-------------------|------|-------|------|--------------|---------|
| `grep_search()` | code-search | Frontend | Tool | Proposal analysis | Find all usages of affected code |
| `read_file()` | file-reader | Frontend | Tool | Proposal analysis | Read source files to understand impact |
| `code_search()` | code-search | Frontend | Tool | Proposal analysis | Semantic search for related code |
| `list_dir()` | file-system | Frontend | Tool | Proposal analysis | List files in affected directories |
| `find_by_name()` | file-system | Frontend | Tool | Proposal analysis | Find files matching patterns |
| `read_deployment_config()` | deployment | Frontend | Tool | Pre-flight check | Verify build configuration |
| `run_command()` | terminal | Backend | Tool | Pre-flight check | Run `npm run build` to verify no errors |

**What Happens During Pre-Approval:**
1. **Code Analysis** - Search for all usages of affected functions/variables
2. **Impact Assessment** - Read files to understand 7-layer impact
3. **Build Verification** - Run pre-flight build to catch errors early
4. **Dependency Check** - Verify all imports and dependencies exist
5. **Cross-Phase Validation** - Compare values across phases

**Example (Phase 5):**
```
User Request: "Implement Phase 5"
    ↓
grep_search('useAdminConfig', 'src/OneMindAI.tsx')
    ↓
read_file('src/OneMindAI.tsx', lines 1-100)
    ↓
code_search('hardcoded values like 1_000_000')
    ↓
run_command('npm run build')
    ↓
CHANGE PROPOSAL generated with findings
```

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

### 4. SEVEN-LAYER IMPACT ANALYSIS (OneMindAI)

| # | Layer | Impact Level | Files Affected | Description |
|---|-------|--------------|----------------|-------------|
| 1 | **Frontend UI** | NONE/LOW/MEDIUM/HIGH | `OneMindAI.tsx`, `components/*`, `admin/pages/*` | React components, screens, styling, UI elements |
| 2 | **Frontend State & Hooks** | NONE/LOW/MEDIUM/HIGH | `hooks/*`, `auth-context.tsx`, `balance-tracker.ts` | State management, custom hooks, context providers |
| 3 | **Frontend Services** | NONE/LOW/MEDIUM/HIGH | `lib/*`, `core/constants.ts`, `error-recovery-engine.ts` | Business logic, API clients, utilities, calculations |
| 4 | **Backend API Routes** | NONE/LOW/MEDIUM/HIGH | `ai-proxy.cjs`, `balance-api.cjs` | Express routes, endpoints, streaming, request handling |
| 5 | **Backend Middleware** | NONE/LOW/MEDIUM/HIGH | `ai-proxy.cjs` (lines 24-72) | Helmet, CORS, rate limiting, security headers, validation |
| 6 | **Database** | NONE/LOW/MEDIUM/HIGH | `migrations/*.sql` | Tables, indexes, RLS policies, RPC functions, schema |
| 7 | **External Services** | NONE/LOW/MEDIUM/HIGH | `ai-proxy.cjs`, `auth-context.tsx` | AI providers (13), OAuth (6), HubSpot CRM integration |

**Bundle Size Impact:** +Xkb or NONE
**Performance Impact:** [Load time, memory, CPU]

---

### 4.1 Layer Definitions & Examples

**Layer 1: Frontend UI** - User-facing components (OneMindAI.tsx, components/*, admin/pages/*)
- Example: Adding a button, changing layout, adding a new screen

**Layer 2: Frontend State & Hooks** - State management (hooks/*, auth-context.tsx)
- Example: Adding custom hook, modifying context, changing session handling

**Layer 3: Frontend Services** - Business logic (lib/*, error-recovery-engine.ts, credit-service.ts)
- Example: Changing cost calculation, modifying error recovery, adding export format

**Layer 4: Backend API Routes** - Express endpoints (ai-proxy.cjs)
- Example: Adding new AI provider route, changing request/response format

**Layer 5: Backend Middleware** - Security & validation (ai-proxy.cjs: Helmet, CORS, rate limiting)
- Example: Changing rate limits, adding CORS origins, modifying security headers

**Layer 6: Database** - Schema & queries (migrations/*.sql)
- Example: Adding table, modifying columns, adding indexes, changing RLS policies

**Layer 7: External Services** - Third-party integrations (OpenAI, Anthropic, Google, HubSpot, etc.)
- Example: Adding new AI provider, modifying OAuth flow, adding CRM integration

---

### 4.2 7-LAYER ARCHITECTURE DIAGRAM (Required for Each Phase)

**Every phase implementation MUST include a visual diagram showing how the change fits into the 7-layer architecture.**

**Diagram Template:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           LAYER 1: FRONTEND UI                              │
│  [Component affected] ─────────────────────────────────────────────────────│
│  Impact: [NONE/LOW/MEDIUM/HIGH]                                            │
│  Changes: [Brief description or "No changes"]                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LAYER 2: FRONTEND STATE & HOOKS                          │
│  [Hook/Context affected] ──────────────────────────────────────────────────│
│  Impact: [NONE/LOW/MEDIUM/HIGH]                                            │
│  Cache: [localStorage / sessionStorage / none]                             │
│  Fallback: [DEFAULT_ARRAY / hardcoded / none]                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LAYER 3: FRONTEND SERVICES                               │
│  [Service/Utility affected] ───────────────────────────────────────────────│
│  Impact: [NONE/LOW/MEDIUM/HIGH]                                            │
│  Changes: [Brief description or "No changes"]                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LAYER 4: BACKEND API ROUTES                              │
│  [Route affected] ─────────────────────────────────────────────────────────│
│  Impact: [NONE/LOW/MEDIUM/HIGH]                                            │
│  Cache: [in-memory / Redis / none]                                         │
│  Fallback: [hardcoded / env vars / none]                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LAYER 5: BACKEND MIDDLEWARE                              │
│  [Middleware affected] ────────────────────────────────────────────────────│
│  Impact: [NONE/LOW/MEDIUM/HIGH]                                            │
│  Changes: [Brief description or "No changes"]                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                          LAYER 6: DATABASE                                  │
│  [Table/Query affected] ───────────────────────────────────────────────────│
│  Impact: [NONE/LOW/MEDIUM/HIGH]                                            │
│  Tables: [table_name or "No changes"]                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                      LAYER 7: EXTERNAL SERVICES                             │
│  [External API affected] ──────────────────────────────────────────────────│
│  Impact: [NONE/LOW/MEDIUM/HIGH]                                            │
│  Services: [API names or "No changes"]                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Cache & Fallback Orchestration (Include if applicable):**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CACHE ORCHESTRATION                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ FRONTEND CACHE                                                              │
│ ├─ Storage: [localStorage / sessionStorage / React state]                  │
│ ├─ Key: [cache key name]                                                   │
│ ├─ TTL: [duration in minutes]                                              │
│ └─ Real-time: [Yes (Supabase listeners) / No]                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ BACKEND CACHE                                                               │
│ ├─ Storage: [in-memory / Redis / none]                                     │
│ ├─ Variable: [variable name]                                               │
│ ├─ TTL: [duration in minutes]                                              │
│ └─ Real-time: [No (polling) / Yes]                                         │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        FALLBACK ORCHESTRATION                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ FRONTEND FALLBACK                                                           │
│ ├─ Type: [Array / Object / Hardcoded value]                                │
│ ├─ Location: [file:line or constant name]                                  │
│ └─ Trigger: [DB down / not configured / cache miss]                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ BACKEND FALLBACK                                                            │
│ ├─ Type: [Hardcoded in function call / env var / constant]                 │
│ ├─ Location: [file:line or constant name]                                  │
│ └─ Trigger: [DB down / not configured / cache miss]                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Data Flow Diagram (Include for multi-layer changes):**
```
User Action → Layer 1 (UI) → Layer 2 (Hooks) → Layer 3 (Services)
                                                      ↓
                                              Layer 4 (API Routes)
                                                      ↓
                                              Layer 5 (Middleware)
                                                      ↓
                                              Layer 6 (Database)
                                                      ↓
                                              Layer 7 (External APIs)
                                                      ↓
                                              Response flows back
```

**Diagram Output Location:**
- Save as: `docs/PHASE_X_7LAYER_DATA_FLOW.md`
- Reference in implementation report

---

### 4.3 ERROR HANDLING ANALYSIS

**Is Dedicated Error Handling Required?**

| Question | Answer | Reasoning |
|----------|--------|----------|
| Does this change involve API calls? | YES/NO | [If YES, needs try/catch with retry logic] |
| Does this change involve user input? | YES/NO | [If YES, needs validation and sanitization] |
| Does this change involve database operations? | YES/NO | [If YES, needs transaction handling] |
| Does this change involve file operations? | YES/NO | [If YES, needs file existence checks] |
| Can this change fail silently? | YES/NO | [If YES, needs explicit error logging] |

**Error Handling Decision:**
- **INLINE ERROR HANDLING** - Add try/catch directly in the function (for simple cases)
- **SEPARATE ERROR COMPONENT** - Create dedicated error boundary/handler (for complex cases)
- **NO DEDICATED ERROR HANDLING** - Existing error handling is sufficient

**Why Separate Error File/Component May NOT Be Needed:**
1. **Existing ErrorBoundary** - React ErrorBoundary already catches component errors
2. **Existing error-recovery-engine.ts** - Already handles API retry logic (2,885 lines)
3. **Supabase client** - Already has built-in error handling
4. **Inline is cleaner** - For simple operations, inline try/catch is more maintainable
5. **Avoid over-engineering** - Don't create files for 5 lines of error handling

**When Separate Error File IS Needed:**
1. **New error type** - Completely new category of errors not covered
2. **Shared error logic** - Same error handling needed in 3+ places
3. **Complex recovery** - Multi-step recovery process
4. **User-facing errors** - Custom error UI components

**Error Handling Code Preview:**
```typescript
// Example: Inline error handling (preferred for simple cases)
try {
  const result = await supabase.from('table').select('*');
  if (result.error) throw result.error;
  return result.data;
} catch (error) {
  console.error('[FeatureName] Error:', error);
  // Use existing error recovery or show toast
  return fallbackValue;
}
```

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
- **PASSING** or **FAILING**

**Existing Errors/Warnings:**
- [List any errors found before starting]
- [Recommendation: Fix first or proceed?]

---

### 6.1 CROSS-PHASE DATA VALIDATION (IF APPLICABLE)

**Does This Phase Depend on Data from a Previous Phase?**

| Question | Answer |
|----------|--------|
| Does this phase use data seeded/created in another phase? | YES / NO |
| If YES, which phase? | Phase [X] |
| What data needs to match? | [e.g., default values, config keys, table schema] |

**IF YES - Perform Cross-Phase Validation:**

| Source (Phase X) | Target (This Phase) | Data Type | Validation |
|------------------|---------------------|-----------|------------|
| `file/table from Phase X` | `file in this phase` | Values/Schema/Keys | MATCH / MISMATCH |

**Example (Phase 1 → Phase 3):**
| Source (Phase 1 Migration) | Target (Phase 3 Hook) | Data Type | Validation |
|----------------------------|----------------------|-----------|------------|
| `006_system_and_provider_config.sql` seed data | `useAdminConfig.ts` DEFAULT_SYSTEM_CONFIG | Config values | ✅ MATCH |
| `006_system_and_provider_config.sql` provider data | `useAdminConfig.ts` DEFAULT_PROVIDER_CONFIG | Provider settings | ✅ MATCH |

**Validation Steps:**
1. Read source file from previous phase
2. Read target file from current phase
3. Compare values side-by-side
4. Report any mismatches
5. Fix mismatches before proceeding

**Common Cross-Phase Dependencies:**
- **Database → Hook:** Migration seed data must match hook fallback defaults
- **Types → Components:** TypeScript interfaces must match component props
- **Backend → Frontend:** API response shape must match frontend expectations
- **Config → Multiple Files:** Shared constants must be identical across files

**IF NO - Skip This Section**
Most phases are independent. Only perform cross-phase validation when:
- Phase explicitly references another phase's output
- Fallback/default values must match database seeds
- Shared types or interfaces are involved

---

### 7. UNIT TESTS PLAN WITH CODE PREVIEW

**Tests to Create:**
| Test File | Test Name | What It Tests | Why This Test |
|-----------|-----------|---------------|---------------|
| `file.test.ts` | `test_name` | [What it validates] | [Why this test is necessary] |
| `file.test.sql` | `test_name` | [What it validates] | [Why this test is necessary] |

**Why These Tests Were Chosen:**
- [Reason 1: Coverage of critical functionality]
- [Reason 2: Edge case handling]
- [Reason 3: Regression prevention]

**Why NOT Other Tests:**
- [Why we don't need test X]
- [Why test Y is out of scope]

---

### 7.1 TEST CODE PREVIEW (BEFORE IMPLEMENTATION)

#### Test File 1: `path/to/file.test.ts`

**Test Code:**
```typescript
// Test code that will be created
describe('Feature Name', () => {
  test('should do X', () => {
    // test implementation
  });
  
  test('should handle error Y', () => {
    // error handling test
  });
  
  test('should validate input Z', () => {
    // validation test
  });
});
```

**Why This Test:**
- Tests the happy path for the feature
- Tests error handling for edge cases
- Validates input validation logic
- Ensures integration with other components

---

#### Test File 2: `path/to/file.test.sql`

**Test Code:**
```sql
-- Test 1: Verify table structure
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'new_table') 
        THEN 'PASS: table exists'
        ELSE 'FAIL: table missing'
    END as test_1;

-- Test 2: Verify columns
SELECT 
    CASE 
        WHEN (
            SELECT COUNT(*) FROM information_schema.columns 
            WHERE table_name = 'new_table' 
            AND column_name IN ('col1', 'col2', 'col3')
        ) = 3
        THEN 'PASS: all columns exist'
        ELSE 'FAIL: missing columns'
    END as test_2;

-- Test 3: Verify data integrity
SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM new_table) > 0
        THEN 'PASS: data inserted'
        ELSE 'FAIL: no data'
    END as test_3;

-- Test 4: Verify indexes
SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'new_table') >= 1
        THEN 'PASS: indexes created'
        ELSE 'FAIL: missing indexes'
    END as test_4;
```

**Why This Test:**
- Validates database schema changes
- Ensures all columns are created correctly
- Checks for data integrity
- Verifies indexes for performance
- Confirms migration success

---

### 8. CODE PREVIEW (BEFORE/AFTER)

#### File 1: `path/to/file.tsx`

**BEFORE (lines X-Y):**
```@/path/to/file.tsx:X-Y
// Current code that will be changed
const currentCode = 'example';
```

**AFTER (lines X-Y):**
```@/path/to/file.tsx:X-Y
// New code after changes
const newCode = 'updated example';
```

**What Will Change:** [Explanation of the change]

---

#### File 2: `path/to/file.ts`

**BEFORE (lines X-Y):**
```@/path/to/file.ts:X-Y
// Current code
function oldFunction() {
  return 'old';
}
```

**AFTER (lines X-Y):**
```@/path/to/file.ts:X-Y
// New code
function newFunction() {
  return 'new';
}
```

**What Will Change:** [Explanation]

---

#### File 3: `path/to/migration.sql`

**BEFORE (lines X-Y):**
```@/path/to/migration.sql:X-Y
-- Old schema
CREATE TABLE old_table (
  id UUID PRIMARY KEY
);
```

**AFTER (lines X-Y):**
```@/path/to/migration.sql:X-Y
-- New schema
CREATE TABLE new_table (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**What Will Change:** [Explanation]

---

### 9. QUESTIONS FOR YOU

- [Clarification 1?]
- [Clarification 2?]
- [Design decision 1?]

---

## YOUR RESPONSE: APPROVAL

After reviewing my proposal **INCLUDING TESTS AND CODE**, respond with:

### Option A: APPROVE
```
Approved - proceed with changes and tests
```

### Option B: REQUEST MODIFICATIONS
```
Modify the proposal:
- Change test X to Y
- Add test Z
- Modify code in file A
```

### Option C: REJECT
```
Don't proceed with this change
```

### Option D: ASK QUESTIONS
```
Before I approve, clarify:
- Question about test 1?
- Question about code change?
```

---

## AFTER APPROVAL: IMPLEMENTATION

Once you approve, I will execute in this order:

### Pre-Flight Check
```bash
npm run build 2>&1
```
- **PASSING**: Proceed with changes
- **FAILING**: List errors, ask if you want to fix first

### Implementation Steps
1. **Create Unit Tests** - Implement all approved tests
2. **Verify Tests Pass** - Run test suite
3. **Implement Code Changes** - Make all code modifications
4. **Post-Change Verification** - Run `npm run build` again
5. **Lint Check & Removal** - Check for TypeScript/lint errors and fix them
6. **Show Implementation Summary** - Display all changes
7. **Generate Word Document** - Convert report to .docx

---

### Lint Check & Error Removal (MANDATORY)

After step 4 (Post-Change Verification), I MUST:

1. **Run Build with Error Detection**
```bash
npm run build 2>&1
```

2. **Identify Lint/TypeScript Errors**
   - TypeScript compilation errors
   - ESLint violations
   - Type mismatches
   - Unused imports/variables

3. **Fix All Errors**
   - Remove unused imports
   - Fix type errors
   - Resolve ESLint warnings
   - Add proper type annotations

4. **Verify Clean Build**
```bash
npm run build 2>&1
```
- Exit code must be 0
- No TypeScript errors
- No critical warnings

5. **Report Results**
   - List all errors found
   - Show fixes applied
   - Confirm clean build status

---

## AFTER IMPLEMENTATION: SHOW RESULTS

### CHANGE SUMMARY

**Date:** YYYY-MM-DD  
**Feature:** [Name]  
**Phase:** [X of Y] (if applicable)  
**Status:** **IMPLEMENTED**

### Files Created
| File | Layer | Type | I/O | Date | Initials | Purpose | Lines |
|------|-------|------|-----|------|----------|---------|-------|
| path/to/file.tsx | Frontend | Component | Output | YYYY-MM-DD | HP | Description | +XX |

### Files Modified
| File | Layer | Type | I/O | Date | Initials | Lines Changed | Summary |
|------|-------|------|-----|------|----------|---------------|---------|
| path/to/file.tsx | Frontend | Component | Output | YYYY-MM-DD | HP | XX-YY | Description |

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
```@/path/to/file.ts:X-Y
[old code here]
```

**AFTER (lines X-Y):**
```@/path/to/file.ts:X-Y
[new code here]
```

**What Changed:** [Explanation of the change]

---

### UNIT TESTS CREATED

| Test File | Tests | Status |
|-----------|-------|--------|
| `file.test.ts` | 5 tests | ✅ ALL PASS |
| `file.test.sql` | 10 tests | ✅ ALL PASS |

**Test Output:**
```
✅ PASS: Feature works correctly
✅ PASS: Error handling works
✅ PASS: Integration successful
✅ PASS: Database schema correct
✅ PASS: Data integrity verified
```

---

### BUILD VERIFICATION

✅ Build Status: PASSING  
✅ Lint Errors: NONE  
✅ Unit Tests: ALL PASS  
✅ Error Regression: PASSED  
✅ Risk Rating: NONE/LOW/HIGH

---

### TESTING CHECKLIST

- [ ] Test item 1
- [ ] Test item 2
- [ ] Test item 3

---

## YOUR RESPONSE: DECISION

After seeing the implementation results, respond with:

### Option A: ACCEPT CHANGES
```
Looks good, keep it
```
*I will generate Word document and show git commit*

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

## AFTER ACCEPTANCE: WORD DOCUMENT GENERATION

When you accept changes, I will automatically:

1. Create markdown report: `docs/PHASE_X_IMPLEMENTATION_REPORT.md`
2. Convert to Word document:
```bash
npx pandoc-bin "docs/PHASE_X_IMPLEMENTATION_REPORT.md" -o "docs/PHASE_X_IMPLEMENTATION_REPORT.docx" --from=markdown --to=docx
```
3. **UPDATE TRACE LOGS** - Add entry to `docs/TRACE_LOGS.md`
4. Show git commit command for your approval

---

## TRACE LOGS UPDATE (MANDATORY)

After EVERY implementation (approved or reverted), I MUST update `docs/TRACE_LOGS.md`:

```markdown
---

## [YYYY-MM-DD HH:MM] - [Feature/Phase Name]
**Initials:** HP  
**Status:** ✅ IMPLEMENTED / ❌ REVERTED / 🔄 MODIFIED

### Files Changed
| File | Action | Type | Layer | I/O | Description |
|------|--------|------|-------|-----|-------------|
| `path/to/file` | CREATE/EDIT | Component/Hook/Service | Frontend/Backend/Database | Input/Output | What changed |

### Summary
[Brief description of what was done]

### Related
- Phase: [X]
- Word Doc: [path]
- Tests: [path]
```

**Trace Log Location:** `docs/TRACE_LOGS.md`

**Action Types:**
- **CREATE** - New file created
- **EDIT** - Existing file modified  
- **DELETE** - File removed

**This is MANDATORY after every change - never skip trace log update!**

---

## IF YOU REJECT: REVERT INSTRUCTIONS

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
- Impact analysis (7 layers)
- Test code and results
- Error regression results
- Revert instructions
- Final approval status
- Three-way comparison (if reverted)

---

## PHASE EXECUTION RULES

### ⚠️ CRITICAL: SINGLE PHASE EXECUTION

When user says:
- "only do phase 1" → Execute ONLY Phase 1, then STOP
- "implement phase 2" → Execute ONLY Phase 2, then STOP
- "do this phase only" → Execute ONLY the specified phase, then STOP

**After completing a phase:**
1. Show implementation summary
2. Create unit tests
3. Generate Word document
4. STOP and wait for user to test
5. Do NOT proceed to next phase until user explicitly says so

### Phase Completion Checklist
- [ ] Implementation complete
- [ ] Unit tests created and passing
- [ ] Build verification passed
- [ ] Word document generated
- [ ] STOPPED - Waiting for user testing

---

## COMPLETE WORKFLOW SUMMARY

```
1. YOU REQUEST CHANGE
   ↓
2. I PROPOSE with:
   - 7-layer impact analysis
   - Test code preview (BEFORE implementation)
   - Code changes preview (BEFORE/AFTER)
   ↓
3. YOU APPROVE/REJECT/MODIFY
   (You review tests AND code together)
   ↓
4. I IMPLEMENT:
   - Pre-flight build check
   - Create unit tests first
   - Run tests to verify
   - Implement code changes
   - Post-change build verification
   ↓
5. I SHOW RESULTS:
   - Test results
   - Code changes
   - Build status
   ↓
6. YOU ACCEPT/REJECT/MODIFY
   ↓
7. IF ACCEPTED:
   - Generate Word document
   - Show git commit command
   - STOP - Wait for next phase
   ↓
8. IF REJECTED:
   - Show revert command
   - Execute revert after approval
   - Show three-way comparison
   - Create audit file
   - STOP
```

---

## KEY RULES

### ❌ NEVER
- Implement code WITHOUT showing test code first
- Proceed without explicit approval
- Ignore build/lint errors
- Skip post-change verification
- Make changes without showing proposal first
- Skip unit test creation
- Skip Word document generation
- Proceed to next phase without user confirmation
- Show code changes without BEFORE/AFTER format

### ✅ ALWAYS
- Show test code in proposal (section 7.1)
- Show code changes in proposal (section 8) with BEFORE/AFTER
- Show 7-layer impact analysis
- Get approval for BOTH tests and code
- Create and run tests BEFORE code changes
- Verify build before and after changes
- Generate Word document after acceptance
- STOP after completing requested phase
- Wait for user confirmation before proceeding
- Use citation format for code: `@/path/to/file.tsx:X-Y`

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

### 1. FILES TO BE CHANGED
| File | Layer | Description |
|------|-------|-------------|
| src/components/auth/SignupForm.tsx | Frontend | Add validation logic |
| src/lib/validation.ts | Frontend | New email validator |
| src/api/auth.ts | Backend | Server-side validation |

### 4. SEVEN-LAYER IMPACT ANALYSIS
| Layer | Impact | Files |
|-------|--------|-------|
| Frontend Components | LOW | SignupForm.tsx |
| Frontend Hooks/State | LOW | useForm hook |
| Backend API Routes | LOW | auth.ts |
| Backend Middleware | NONE | N/A |
| Database Schema | NONE | N/A |
| Database Queries | NONE | N/A |
| External Services | NONE | N/A |

### 7.1 TEST CODE PREVIEW

#### Test File: `src/components/auth/SignupForm.test.tsx`

**Test Code:**
\`\`\`typescript
describe('SignupForm Email Validation', () => {
  test('should reject invalid email', () => {
    const { getByText } = render(<SignupForm />);
    const input = getByText('email');
    fireEvent.change(input, { target: { value: 'invalid' } });
    fireEvent.click(getByText('Sign Up'));
    expect(getByText('Invalid email')).toBeInTheDocument();
  });
  
  test('should accept valid email', () => {
    const { getByText } = render(<SignupForm />);
    const input = getByText('email');
    fireEvent.change(input, { target: { value: 'test@example.com' } });
    fireEvent.click(getByText('Sign Up'));
    expect(queryByText('Invalid email')).not.toBeInTheDocument();
  });
});
\`\`\`

**Why This Test:**
- Validates client-side validation works
- Tests error message display
- Ensures valid emails pass validation

### 8. CODE PREVIEW

#### File: `src/components/auth/SignupForm.tsx`

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

**What Changed:** Added email validation before API call
```

### Step 3: You Approve
```
Approved - proceed with changes and tests
```

### Step 4: I Implement
- ✅ Pre-flight build check
- ✅ Create unit tests
- ✅ Run tests (all pass)
- ✅ Implement code changes
- ✅ Post-change build verification

### Step 5: I Show Results
```
## CHANGE SUMMARY

**Date:** 2025-12-13  
**Feature:** Email Validation  
**Status:** ✅ IMPLEMENTED

### Files Modified
| File | Layer | Lines | Summary |
|------|-------|-------|---------|
| src/components/auth/SignupForm.tsx | Frontend | 45-67 | Added validation |
| src/lib/validation.ts | Frontend | 1-25 | New validator |

### UNIT TESTS CREATED
| Test File | Tests | Status |
|-----------|-------|--------|
| SignupForm.test.tsx | 3 tests | ✅ ALL PASS |

### BUILD VERIFICATION
✅ Build Status: PASSING  
✅ Lint Errors: NONE  
✅ Unit Tests: ALL PASS
```

### Step 6: You Accept
```
Looks good, keep it
```

### Step 7: I Generate Word Document
```bash
npx pandoc-bin "docs/PHASE_1_IMPLEMENTATION_REPORT.md" -o "docs/PHASE_1_IMPLEMENTATION_REPORT.docx" --from=markdown --to=docx
```

---

## READY TO USE

When you request a change, use the format:

```
I am looking to do [feature/fix]:
- [Detail 1]
- [Detail 2]
- [Detail 3]
```

Or for phased work:

```
Implement phase X with @/safety-guard-enhanced
```

I will respond with the CHANGE PROPOSAL structure above.
