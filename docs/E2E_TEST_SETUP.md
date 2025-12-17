# E2E Test Setup - Authentication Bypass Guide

## 🚨 Issue: Tests Can't Bypass Sign-In Page

The E2E tests are failing because the admin panel requires authentication. Here are **3 solutions** to run the tests successfully.

## ✅ Solution 1: Disable Supabase for Testing (Recommended)

This is the **easiest and fastest** way to run tests.

### Steps:

1. **Create `.env.local` file** (if it doesn't exist):
   ```bash
   # In project root
   touch .env.local
   ```

2. **Add these lines to `.env.local`**:
   ```env
   # Disable Supabase authentication for testing
   VITE_SUPABASE_URL=""
   VITE_SUPABASE_ANON_KEY=""
   ```

3. **Restart dev server**:
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

4. **Run tests**:
   ```bash
   npm run test:e2e:headed
   ```

### Why This Works:
- Empty Supabase URL disables authentication
- Admin panel becomes accessible without login
- Tests can navigate freely
- **No code changes needed**

---

## ✅ Solution 2: Use Test Environment File

Use the pre-configured test environment.

### Steps:

1. **Copy test environment**:
   ```bash
   copy .env.test .env.local
   ```

2. **Restart dev server**:
   ```bash
   npm run dev
   ```

3. **Run tests**:
   ```bash
   npm run test:e2e:headed
   ```

---

## ✅ Solution 3: Manual Sign-In Before Tests

If you want to keep authentication enabled:

### Steps:

1. **Start dev server**:
   ```bash
   npm run dev
   ```

2. **Manually sign in**:
   - Open browser: http://localhost:5173
   - Click "Sign In"
   - Complete authentication
   - **Keep browser open**

3. **Run tests in same browser session**:
   ```bash
   # Tests will use existing session
   npm run test:e2e:headed
   ```

### Limitations:
- Session expires after some time
- Must re-authenticate periodically
- Not suitable for CI/CD

---

## 🔧 Troubleshooting

### Issue: Tests still fail after disabling Supabase

**Check `.env.local` is being loaded:**
```bash
# Verify file exists
ls .env.local

# Restart dev server
npm run dev
```

### Issue: "Cannot find admin panel"

**Verify admin panel route:**
```bash
# Should open admin panel
start http://localhost:5173/admin/ui-config
```

### Issue: Tests timeout

**Increase timeout in `playwright.config.ts`:**
```typescript
timeout: 60 * 1000, // 60 seconds
```

---

## 📋 Quick Reference

| Method | Pros | Cons | Best For |
|--------|------|------|----------|
| **Disable Supabase** | ✅ Fast, easy, no code changes | ❌ Can't test auth features | E2E testing |
| **Test Environment** | ✅ Pre-configured, reusable | ❌ Requires file copy | Repeated testing |
| **Manual Sign-In** | ✅ Tests with real auth | ❌ Session expires, manual work | One-time testing |

---

## 🎯 Recommended Workflow

### For Development Testing:
```bash
# 1. Disable auth
echo 'VITE_SUPABASE_URL=""' > .env.local
echo 'VITE_SUPABASE_ANON_KEY=""' >> .env.local

# 2. Restart server
npm run dev

# 3. Run tests
npm run test:e2e:headed
```

### For CI/CD:
```yaml
# .github/workflows/e2e.yml
env:
  VITE_SUPABASE_URL: ""
  VITE_SUPABASE_ANON_KEY: ""

steps:
  - run: npm run test:e2e
```

---

## ✅ Verification

After setup, verify tests can access admin panel:

```bash
# Run single test
npx playwright test -g "Database Layer" --headed
```

**Expected:** Browser opens, navigates to admin panel, no sign-in page.

---

## 🔄 Restore Authentication

When done testing, restore authentication:

1. **Delete `.env.local`**:
   ```bash
   rm .env.local
   ```

2. **Or restore Supabase credentials**:
   ```env
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Restart dev server**:
   ```bash
   npm run dev
   ```

---

## 📞 Still Having Issues?

1. Check dev server is running: http://localhost:5173
2. Verify `.env.local` exists and has empty Supabase values
3. Clear browser cache: `localStorage.clear()`
4. Restart dev server
5. Run tests with debug: `npm run test:e2e:debug`

---

## 🎉 Success Checklist

- [ ] `.env.local` created with empty Supabase values
- [ ] Dev server restarted
- [ ] Tests run without sign-in page
- [ ] All 8 tests pass
- [ ] Browser shows admin panel directly

**You're ready to run E2E tests! 🚀**
