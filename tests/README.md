# Admin Config System - E2E Automated Tests

## Overview

Comprehensive end-to-end automated tests for the Admin Config System (Phases 1-8) with **visible, color-coded results**.

## Test Coverage

| Test | Description | What It Tests |
|------|-------------|---------------|
| **Test 1** | Database Layer | Tables exist and populated with data |
| **Test 2** | System Config CRUD | Edit and save system config values |
| **Test 3** | Provider Config Toggle | Enable/disable providers |
| **Test 4** | Main UI Integration | Disabled providers hidden from engine list |
| **Test 5** | Real-time Subscriptions | Multi-tab sync with toast notifications |
| **Test 6** | Cache Invalidation | Changes reflect immediately |
| **Test 7** | Data Consistency | UI matches database values |
| **Test 8** | UI Responsiveness | All interactions work smoothly |

## Setup (One-Time)

### 1. Install Playwright

```bash
npm install -D @playwright/test
npx playwright install chromium
```

### 2. Verify Installation

```bash
npx playwright --version
```

## Running Tests

### Quick Start (Recommended)

```bash
# Run all tests with visible browser
npx playwright test --headed

# Run specific test
npx playwright test tests/e2e/admin-config.spec.ts --headed

# Run with UI mode (interactive)
npx playwright test --ui
```

### Advanced Options

```bash
# Run in debug mode (step-by-step)
npx playwright test --debug

# Run with trace (for debugging failures)
npx playwright test --trace on

# Generate HTML report
npx playwright test
npx playwright show-report
```

## Prerequisites

Before running tests, ensure:

1. ✅ **Dev server is running** (or will auto-start)
   ```bash
   npm run dev
   ```

2. ✅ **Supabase is configured** (for real-time tests)
   - Set `VITE_SUPABASE_URL` in `.env`
   - Set `VITE_SUPABASE_ANON_KEY` in `.env`

3. ✅ **Database is seeded**
   - Run migrations: `supabase/migrations/006_system_and_provider_config.sql`
   - Verify data exists in `system_config` and `provider_config` tables

## Test Output

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
```

### HTML Report

After tests complete, view the detailed HTML report:

```bash
npx playwright show-report
```

The report includes:
- ✅ Pass/Fail status for each test
- 📸 Screenshots on failure
- 🎥 Video recordings
- 📊 Execution timeline
- 🔍 Detailed logs

## Test Scenarios

### Scenario 1: Admin Disables Provider

1. Admin opens Admin Panel → Provider Config
2. Admin toggles KIMI to disabled
3. Main app refreshes
4. **Expected:** KIMI disappears from engine list
5. Admin re-enables KIMI
6. **Expected:** KIMI reappears

### Scenario 2: Multi-Admin Sync

1. Admin A opens Admin Panel (Tab 1)
2. Admin B opens Admin Panel (Tab 2)
3. Admin A changes `prompt_soft_limit` to 7000
4. **Expected:** Tab 2 shows toast "🔄 System Config updated by another admin"
5. **Expected:** Tab 2 auto-refreshes with new value

### Scenario 3: Cache Invalidation

1. Admin changes any config value
2. **Expected:** `localStorage` cache cleared immediately
3. **Expected:** Main UI reflects change without manual refresh

## Troubleshooting

### Tests Fail: "Cannot connect to localhost:5173"

**Solution:** Start dev server first
```bash
npm run dev
```

### Tests Fail: "Table not found"

**Solution:** Run database migrations
```bash
# In Supabase SQL Editor, run:
supabase/migrations/006_system_and_provider_config.sql
```

### Real-time Tests Fail

**Solution:** Check Supabase configuration
```bash
# Verify .env file has:
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Browser Doesn't Open

**Solution:** Install Chromium
```bash
npx playwright install chromium
```

## CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Test Maintenance

### Adding New Tests

1. Open `tests/e2e/admin-config.spec.ts`
2. Add new test in appropriate `test.describe()` block
3. Follow existing pattern with `logStep()` for visibility
4. Run test to verify

### Updating Selectors

If UI changes, update selectors in test file:
```typescript
// Before
await page.click('text=System Config');

// After (if button text changes)
await page.click('button:has-text("System Settings")');
```

## Performance Benchmarks

| Test | Expected Duration |
|------|-------------------|
| Test 1 | ~3 seconds |
| Test 2 | ~5 seconds |
| Test 3 | ~4 seconds |
| Test 4 | ~8 seconds |
| Test 5 | ~7 seconds |
| Test 6 | ~3 seconds |
| Test 7 | ~4 seconds |
| Test 8 | ~5 seconds |
| **Total** | **~40 seconds** |

## Support

For issues or questions:
1. Check test output logs
2. Review HTML report
3. Run with `--debug` flag
4. Check Playwright documentation: https://playwright.dev
