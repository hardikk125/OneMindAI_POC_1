---
description: Safe change workflow with pre-flight checks, error prevention, and complete audit
---

# Safe Change Workflow (MANDATORY)

## Phase 1: Pre-Flight Check (BEFORE any changes)

// turbo
1. Check for existing build errors:
   ```bash
   npm run build 2>&1 | head -50
   ```

2. If build FAILS:
   - LIST all errors found
   - ASK user: "Build is broken. Fix existing errors first?"
   - Do NOT proceed with new changes until build passes

3. If build PASSES:
   - Confirm: "✅ Build passing. Proceeding with changes."

## Phase 2: Make Changes

4. Implement the requested feature/fix

5. After EACH file modification:
   - Verify syntax is valid (brackets balanced, imports correct)
   - Check for new lint errors in that file
   - If errors found, FIX IMMEDIATELY before continuing

## Phase 3: Post-Change Verification

6. Run build again to confirm changes compile:
   ```bash
   npm run build 2>&1 | head -50
   ```

7. If build fails after changes:
   - STOP immediately
   - Identify which change broke the build
   - Fix before proceeding

## Phase 4: Error Regression Check

8. Execute `/error-regression` workflow:
   - Scan docs/ERROR_REGISTRY.md
   - Scan docs/HISTORICAL_ERRORS_TOP_15.md
   - Check for protection comments (🔒 DO NOT MODIFY)
   - Verify no known error patterns introduced
   - Provide risk rating: NONE/LOW/HIGH

## Phase 5: Generate Audit Document

9. Create `docs/AUDIT_[FEATURE]_[YYYY-MM-DD].md` with ALL sections:

```markdown
# [Feature Name] - Change Audit

**Date:** YYYY-MM-DD
**Author:** Cascade AI Assistant
**Build Status Before:** PASSING/FAILING
**Build Status After:** PASSING

---

## Pre-Existing Issues Found
- [List any errors that existed before changes, or "NONE"]

## Files Created
| File | Purpose | Lines |
|------|---------|-------|
| path/to/file.tsx | Description | +XX |

## Files Modified
| File | Lines Changed | Summary |
|------|---------------|---------|
| path/to/file.tsx | XX-YY | Description |

## Detailed Changes

### [filename]
**BEFORE (line X):**
\`\`\`tsx
// old code
\`\`\`

**AFTER (line X):**
\`\`\`tsx
// new code
\`\`\`

## Impact Analysis
| Layer | Impact | Description |
|-------|--------|-------------|
| Frontend | NONE/LOW/MEDIUM/HIGH | ... |
| Backend | NONE/LOW/MEDIUM/HIGH | ... |
| Database | NONE/LOW/MEDIUM/HIGH | ... |
| Performance | NONE/LOW/MEDIUM/HIGH | ... |

## Error Regression Check
- Historical fixes preserved: ✅/❌
- Protection comments intact: ✅/❌
- Known error patterns: NONE/[list]
- Risk rating: NONE/LOW/HIGH
- Verdict: APPROVED/BLOCKED

## Revert Instructions

### Single Command (copy-paste):
\`\`\`bash
git checkout HEAD -- [modified files] && rm -f [new files]
\`\`\`

### Manual Steps:
1. Delete: [new files]
2. Revert [file]: Remove lines X-Y
3. ...

## Git Commit
\`\`\`bash
git add [files]
git commit -m "type: description"
\`\`\`

## Approval Checklist
- [ ] Build passes
- [ ] Error regression: PASSED
- [ ] Testing completed
- [ ] Documentation updated
```

## CRITICAL RULES (NON-NEGOTIABLE)

- ❌ NEVER proceed if build is broken before starting
- ❌ NEVER ignore ANY lint/build errors
- ❌ NEVER assume errors are "pre-existing" without proof
- ❌ NEVER skip the post-change build verification
- ✅ ALWAYS fix errors immediately when spotted
- ✅ ALWAYS document pre-existing issues
- ✅ ALWAYS provide working revert command
- ✅ ALWAYS confirm build passes after changes
