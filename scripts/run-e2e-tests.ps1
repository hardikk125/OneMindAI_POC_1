# =============================================================================
# Admin Config System - E2E Test Runner
# =============================================================================
# This script installs Playwright (if needed) and runs the automated tests
# with visible, color-coded results
# =============================================================================

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  ADMIN CONFIG SYSTEM - E2E AUTOMATED TESTS" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Playwright is installed
Write-Host "🔍 Checking Playwright installation..." -ForegroundColor Yellow

$playwrightInstalled = Test-Path "node_modules/@playwright/test"

if (-not $playwrightInstalled) {
    Write-Host "📦 Installing Playwright..." -ForegroundColor Yellow
    npm install -D @playwright/test
    
    Write-Host "🌐 Installing Chromium browser..." -ForegroundColor Yellow
    npx playwright install chromium
    
    Write-Host "✅ Playwright installed successfully!" -ForegroundColor Green
} else {
    Write-Host "✅ Playwright already installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host "  STARTING TESTS" -ForegroundColor Cyan
Write-Host "================================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Test Coverage:" -ForegroundColor Yellow
Write-Host "  1. Database Layer - Tables exist and populated"
Write-Host "  2. Admin Panel UI - System Config CRUD"
Write-Host "  3. Admin Panel UI - Provider Config toggle"
Write-Host "  4. Main UI Integration - Disabled providers hidden"
Write-Host "  5. Real-time Subscriptions - Multi-tab sync"
Write-Host "  6. Cache Invalidation - Immediate updates"
Write-Host "  7. Data Consistency - UI matches database"
Write-Host "  8. UI Responsiveness - All interactions smooth"
Write-Host ""
Write-Host "🚀 Running tests with visible browser..." -ForegroundColor Yellow
Write-Host ""

# Run tests with headed mode (visible browser)
npx playwright test tests/e2e/admin-config.spec.ts --headed

# Check exit code
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "================================================================================" -ForegroundColor Green
    Write-Host "  ✅ ALL TESTS PASSED!" -ForegroundColor Green
    Write-Host "================================================================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 View detailed HTML report:" -ForegroundColor Yellow
    Write-Host "   npx playwright show-report" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "================================================================================" -ForegroundColor Red
    Write-Host "  ❌ SOME TESTS FAILED" -ForegroundColor Red
    Write-Host "================================================================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "📊 View detailed HTML report:" -ForegroundColor Yellow
    Write-Host "   npx playwright show-report" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🔍 Debug failed tests:" -ForegroundColor Yellow
    Write-Host "   npx playwright test --debug" -ForegroundColor Cyan
    Write-Host ""
}

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
