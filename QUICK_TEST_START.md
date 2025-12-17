# Quick Start - Run Comprehensive E2E Tests

## ⚡ 3-Step Setup (5 minutes)

### Step 1: Install Playwright (one-time)
```bash
npm install -D @playwright/test
npx playwright install chromium
```

### Step 2: Disable Authentication for Testing
**IMPORTANT: Do this exactly**

```bash
# Windows PowerShell
copy .env.test .env.local
```

**OR manually:**
1. Open `.env.test` file
2. Copy all contents
3. Create new file `.env.local` in project root
4. Paste contents
5. Save

**File should contain:**
```
VITE_SUPABASE_URL=""
VITE_SUPABASE_ANON_KEY=""
```

### Step 3: Restart Dev Server

**CRITICAL: You must restart the dev server after creating `.env.local`**

```bash
# Stop current dev server (Ctrl+C in terminal)
# Then restart:
npm run dev
```

Wait for it to say "Local: http://localhost:5173"

---

## ✅ Now Run Tests

Open **new terminal** and run:

```bash
npm run test:e2e:full:headed
```

---

## 🎬 What You'll See

Browser will open and automatically:
1. Navigate to main app
2. Go to admin panel
3. Change config values
4. Verify changes applied
5. Test all 37 scenarios
6. Print results in terminal

**Duration:** ~15 minutes

---

## ✅ Success = This Message

```
🚀 System is production-ready!
9 passed (14m 32s)
```

---

## ❌ If Tests Still Fail

**Most common issue: Dev server not restarted**

Check:
1. Did you create `.env.local`? (should be in project root)
2. Did you restart `npm run dev`? (must restart after creating `.env.local`)
3. Does `.env.local` have empty Supabase values?

```bash
# Verify .env.local exists and has correct content
cat .env.local
```

Should show:
```
VITE_SUPABASE_URL=""
VITE_SUPABASE_ANON_KEY=""
```

---

## 🔄 Restore Authentication After Testing

When done testing:

```bash
# Delete .env.local
rm .env.local

# Restart dev server
npm run dev
```

This restores normal authentication.

---

## 📞 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Authentication required" | Restart `npm run dev` after creating `.env.local` |
| Browser doesn't open | Run with `--headed` flag |
| Tests timeout | Increase timeout in `playwright.config.ts` |
| "Cannot find tests" | Make sure `tests/e2e/comprehensive-e2e.spec.ts` exists |

---

## 🎯 Commands Reference

```bash
# Run comprehensive test (visible browser)
npm run test:e2e:full:headed

# Run comprehensive test (headless - no browser)
npm run test:e2e:full

# View HTML report after tests
npm run test:e2e:report

# Debug mode (step-by-step)
npm run test:e2e:debug
```

---

**Ready? Run:** `npm run test:e2e:full:headed`
