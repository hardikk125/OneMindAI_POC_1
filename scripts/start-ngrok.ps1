# OneMindAI - ngrok Quick Start Script
# This script starts all services and exposes them via ngrok

param(
    [string]$Port = "5173",
    [string]$Subdomain = "",
    [switch]$Backend,
    [switch]$Help
)

if ($Help) {
    Write-Host @"
OneMindAI ngrok Quick Start

Usage: .\start-ngrok.ps1 [options]

Options:
  -Port <number>           Port to expose (default: 5173 for frontend)
  -Subdomain <name>        Custom subdomain (requires paid ngrok account)
  -Backend                 Expose backend (port 3001) instead of frontend
  -Help                    Show this help message

Examples:
  # Expose frontend
  .\start-ngrok.ps1

  # Expose backend
  .\start-ngrok.ps1 -Backend

  # Expose with custom subdomain
  .\start-ngrok.ps1 -Subdomain my-app

  # Expose backend with custom subdomain
  .\start-ngrok.ps1 -Backend -Subdomain my-api
"@
    exit
}

# Colors
$Green = "Green"
$Yellow = "Yellow"
$Cyan = "Cyan"
$Red = "Red"

Write-Host "`n========================================" -ForegroundColor $Cyan
Write-Host "  OneMindAI - ngrok Quick Start" -ForegroundColor $Cyan
Write-Host "========================================`n" -ForegroundColor $Cyan

# Check if ngrok is installed
Write-Host "Checking ngrok installation..." -ForegroundColor $Yellow
$ngrokPath = (Get-Command ngrok -ErrorAction SilentlyContinue).Path

if (-not $ngrokPath) {
    Write-Host "ERROR: ngrok is not installed or not in PATH" -ForegroundColor $Red
    Write-Host "Install ngrok: choco install ngrok" -ForegroundColor $Yellow
    exit 1
}

Write-Host "✓ ngrok found at: $ngrokPath" -ForegroundColor $Green

# Determine which service to expose
if ($Backend) {
    $Port = "3001"
    $ServiceName = "Backend API"
    Write-Host "Exposing: $ServiceName (port $Port)" -ForegroundColor $Green
} else {
    $Port = "5173"
    $ServiceName = "Frontend"
    Write-Host "Exposing: $ServiceName (port $Port)" -ForegroundColor $Green
}

# Check if port is in use
Write-Host "`nChecking if port $Port is in use..." -ForegroundColor $Yellow
$portInUse = (Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue).State -eq "Listen"

if ($portInUse) {
    Write-Host "✓ Port $Port is in use (service is running)" -ForegroundColor $Green
} else {
    Write-Host "⚠ Port $Port is NOT in use (service may not be running)" -ForegroundColor $Yellow
    Write-Host "Make sure to run: npm run dev$(if ($Backend) { ':server' })" -ForegroundColor $Yellow
}

# Build ngrok command
$ngrokCmd = "ngrok http $Port"

if ($Subdomain) {
    $ngrokCmd += " --subdomain=$Subdomain"
    Write-Host "Using custom subdomain: $Subdomain" -ForegroundColor $Green
}

# Display info
Write-Host "`n========================================" -ForegroundColor $Cyan
Write-Host "Starting ngrok tunnel..." -ForegroundColor $Cyan
Write-Host "========================================" -ForegroundColor $Cyan
Write-Host "Service: $ServiceName" -ForegroundColor $Green
Write-Host "Local URL: http://localhost:$Port" -ForegroundColor $Green
Write-Host "ngrok Dashboard: http://localhost:4040" -ForegroundColor $Green
Write-Host "`nPress Ctrl+C to stop ngrok`n" -ForegroundColor $Yellow

# Start ngrok
& ngrok http $Port $(if ($Subdomain) { "--subdomain=$Subdomain" })
