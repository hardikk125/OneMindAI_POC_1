# Admin Config System - E2E Test Guide

## 🎯 Overview

**Fully automated end-to-end tests** for the Admin Config System with **visible, color-coded results** in the browser.

## ✨ What Gets Tested

| # | Test Name | What It Does | Visible Result |
|---|-----------|--------------|----------------|
| 1 | **Database Layer** | Verifies tables exist and have data | ✅ Shows row counts |
| 2 | **System Config CRUD** | Edits and saves config values | ✅ Shows before/after values |
| 3 | **Provider Toggle** | Enables/disables providers | ✅ Shows toggle animation |
| 4 | **Main UI Integration** | Hides disabled providers from engine list | ✅ Shows provider disappear/reappear |
| 5 | **Real-time Sync** | Multi-tab updates with toast notifications | ✅ Shows toast messages |
| 6 | **Cache Invalidation** | Immediate updates without refresh | ✅ Verifies localStorage cleared |
| 7 | **Data Consistency** | UI matches database values | ✅ Shows data comparison |
| 8 | **UI Responsiveness** | All interactions work smoothly | ✅ Shows tab switching |

## 🚀 Quick Start (3 Steps)

### Step 1: Install Playwright

```bash
npm install -D @playwright/test
npx playwright install chromium
```

### Step 2: Start Dev Server

```bash
npm run dev
```

### Step 3: Run Tests

```bash
# Option A: Use PowerShell script (easiest)
.\scripts\run-e2e-tests.ps1

# Option B: Use npm command
npm run test:e2e:headed

# Option C: Use Playwright directly
npx playwright test --headed
```

## 📊 Expected Output

### Console Output (Color-Coded)

```
🔵 TEST 1: Database Layer
🔵 1.1 Navigate to System Config tab
✅ Found 13 system config entries
🔵 1.2 Navigate to Provider Config tab
✅ Found 9 providers
✅ TEST 1: Database Layer

🔵 TEST 2: System Config CRUD
🔵 2.1 Edit prompt_soft_limit value
   Original value: 5000
🔵 2.2 Save new value
✅ Success toast displayed
✅ Value updated to 6000
✅ TEST 2: System Config CRUD

🔵 TEST 3: Provider Config Toggle
🔵 3.1 Find KIMI provider
   KIMI current state: ENABLED
🔵 3.2 Toggle KIMI provider
✅ Toggle toast displayed
✅ KIMI toggled to DISABLED
✅ TEST 3: Provider Config Toggle

🔵 TEST 4: Main UI Integration
🔵 4.1 Open main app in new tab
🔵 4.2 Check KIMI visibility in main app
   KIMI visible before: true
🔵 4.3 Disable KIMI in admin panel
🔵 4.4 Refresh main app
🔵 4.5 Verify KIMI is hidden
✅ KIMI successfully hidden from main UI
🔵 4.6 Re-enable KIMI
✅ KIMI successfully restored in main UI
✅ TEST 4: Main UI Integration

🔵 TEST 5: Real-time Subscriptions
🔵 5.1 Open admin panel in second tab
🔵 5.2 Edit value in Tab 1
🔵 5.3 Verify real-time toast in Tab 2
✅ Real-time toast displayed in Tab 2
✅ TEST 5: Real-time Subscriptions

🔵 TEST 6: Cache Invalidation
🔵 6.1 Toggle provider
🔵 6.2 Verify cache cleared
✅ Cache successfully cleared
✅ TEST 6: Cache Invalidation

🔵 TEST 7: Data Consistency
🔵 7.1 Verify System Config consistency
✅ System Config: 13 entries
🔵 7.2 Verify Provider Config consistency
✅ Provider Config: 9 providers
✅ TEST 7: Data Consistency

🔵 TEST 8: UI Responsiveness
🔵 8.1 Test tab switching
✅ All tabs switch successfully
🔵 8.2 Test refresh button
✅ Refresh button works
🔵 8.3 Test disabled badge visibility
   Found 0 disabled providers
✅ Disabled badges render correctly
✅ TEST 8: UI Responsiveness

================================================================================
🎯 ADMIN CONFIG SYSTEM - E2E TEST SUMMARY
================================================================================
✅ All tests completed successfully!

Test Coverage:
  1. ✅ Database Layer - Tables exist and populated
  2. ✅ Admin Panel UI - System Config CRUD works
  3. ✅ Admin Panel UI - Provider Config toggle works
  4. ✅ Main UI Integration - Disabled providers hidden
  5. ✅ Real-time Subscriptions - Multi-tab sync
  6. ✅ Cache Invalidation - Immediate updates
  7. ✅ Data Consistency - UI matches database
  8. ✅ UI Responsiveness - All interactions smooth
================================================================================
🚀 System is production-ready!
================================================================================
```

### Browser View

You'll see:
- 🌐 **Browser opens automatically**
- 👁️ **All actions visible** (clicks, typing, navigation)
- ⚡ **Fast execution** (~40 seconds total)
- 📸 **Screenshots on failure**
- 🎥 **Video recording** (if test fails)

## 📋 Test Commands

| Command | Description | When to Use |
|---------|-------------|-------------|
| `npm run test:e2e:headed` | Run with visible browser | **Recommended** - See what's happening |
| `npm run test:e2e` | Run headless (no browser UI) | CI/CD pipelines |
| `npm run test:e2e:ui` | Interactive UI mode | Debug specific tests |
| `npm run test:e2e:debug` | Step-by-step debugging | Troubleshoot failures |
| `npm run test:e2e:report` | View HTML report | After tests complete |

## 🎬 What You'll See

### Test 1: Database Layer
- Browser navigates to Admin Panel
- Clicks "System Config" tab
- Counts rows in table
- Clicks "Provider Config" tab
- Verifies 9 providers exist

### Test 2: System Config CRUD
- Clicks on `prompt_soft_limit` value
- Changes value from 5000 to 6000
- Clicks Save button
- Verifies success toast appears
- Verifies value updated
- Restores original value

### Test 3: Provider Config Toggle
- Finds KIMI provider row
- Clicks toggle button
- Verifies toast notification
- Verifies "DISABLED" badge appears
- Toggles back to enabled

### Test 4: Main UI Integration
- Opens main app in new tab
- Verifies KIMI visible
- Disables KIMI in admin panel
- Refreshes main app
- **Verifies KIMI disappeared from engine list**
- Re-enables KIMI
- **Verifies KIMI reappeared**

### Test 5: Real-time Subscriptions
- Opens admin panel in 2 tabs
- Edits value in Tab 1
- **Verifies Tab 2 shows toast: "🔄 System Config updated by another admin"**
- Verifies Tab 2 auto-refreshes

### Test 6: Cache Invalidation
- Toggles provider
- Checks `localStorage`
- **Verifies cache was cleared**

### Test 7: Data Consistency
- Counts system config entries (should be 13+)
- Counts provider config entries (should be 9)

### Test 8: UI Responsiveness
- Switches between all tabs
- Clicks refresh button
- Counts disabled badges

## 🔧 Troubleshooting

### Issue: "Cannot connect to localhost:5173"

**Solution:**
```bash
# Start dev server first
npm run dev
```

### Issue: "Table not found" or "No data"

**Solution:**
```bash
# Run database migration in Supabase SQL Editor
# File: supabase/migrations/006_system_and_provider_config.sql
```

### Issue: Real-time tests fail

**Solution:**
```bash
# Check .env file has Supabase credentials
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Issue: Browser doesn't open

**Solution:**
```bash
# Install Chromium
npx playwright install chromium
```

### Issue: Tests are too fast to see

**Solution:**
```bash
# Add --slow-mo flag
npx playwright test --headed --slow-mo=1000
```

## 📈 Performance Benchmarks

| Metric | Value |
|--------|-------|
| **Total Duration** | ~40 seconds |
| **Tests** | 8 comprehensive tests |
| **Actions** | 50+ automated actions |
| **Assertions** | 30+ validations |
| **Browser Tabs** | Up to 3 simultaneous |

## 🎯 Test Scenarios Covered

### ✅ Admin Panel Functionality
- [x] Navigate between tabs
- [x] Edit system config values
- [x] Toggle provider enable/disable
- [x] Save changes
- [x] View success toasts
- [x] Refresh data

### ✅ Main UI Integration
- [x] Disabled providers hidden from engine list
- [x] Enabled providers visible
- [x] Changes reflect immediately

### ✅ Real-time Features
- [x] Multi-admin sync
- [x] Toast notifications
- [x] Auto-refresh on changes

### ✅ Data Integrity
- [x] Cache invalidation
- [x] Database consistency
- [x] UI-DB sync

## 📊 HTML Report

After tests complete, view detailed report:

```bash
npm run test:e2e:report
```

The report includes:
- ✅ **Pass/Fail status** for each test
- 📸 **Screenshots** on failure
- 🎥 **Video recordings** of failed tests
- 📊 **Execution timeline**
- 🔍 **Detailed logs** for each step
- 📈 **Performance metrics**

## 🚀 Advanced Usage

### Run Specific Test

```bash
npx playwright test -g "Database Layer"
npx playwright test -g "Provider Config Toggle"
```

### Run with Trace

```bash
npx playwright test --trace on
npx playwright show-trace trace.zip
```

### Run in Different Browsers

```bash
# Firefox
npx playwright test --project=firefox

# WebKit (Safari)
npx playwright test --project=webkit
```

### Parallel Execution

```bash
# Run tests in parallel (faster)
npx playwright test --workers=4
```

## 📝 Test Maintenance

### Update Selectors

If UI changes, update in `tests/e2e/admin-config.spec.ts`:

```typescript
// Before
await page.click('text=System Config');

// After (if text changes)
await page.click('button:has-text("System Settings")');
```

### Add New Tests

```typescript
test('9. New Feature Test', async ({ page }) => {
  await logStep(page, 'TEST 9: New Feature', 'START');
  
  // Your test steps here
  
  await logStep(page, 'TEST 9: New Feature', 'PASS');
});
```

## 🎓 Best Practices

1. **Always run with `--headed`** during development to see what's happening
2. **Check HTML report** after failures for detailed debugging
3. **Use `--debug`** to step through failing tests
4. **Keep dev server running** before starting tests
5. **Clear browser cache** if tests behave unexpectedly

## 📞 Support

For issues:
1. Check console output for error messages
2. View HTML report: `npm run test:e2e:report`
3. Run with debug: `npm run test:e2e:debug`
4. Check Playwright docs: https://playwright.dev

## 🎉 Success Criteria

All tests pass when you see:

```
================================================================================
  ✅ ALL TESTS PASSED!
================================================================================
```

This means:
- ✅ Database is properly configured
- ✅ Admin Panel UI works correctly
- ✅ Main UI integration is functional
- ✅ Real-time subscriptions are active
- ✅ Cache invalidation works
- ✅ Data consistency is maintained
- ✅ UI is responsive and smooth

**Your Admin Config System is production-ready! 🚀**
