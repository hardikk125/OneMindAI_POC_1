# PowerShell script to create a clean ZIP file of the project
# Excludes node_modules, dist, and other unnecessary files

$projectPath = $PSScriptRoot
$zipFileName = "OneMindAI-Project.zip"
$zipPath = Join-Path (Split-Path $projectPath -Parent) $zipFileName

Write-Host "Creating ZIP file..." -ForegroundColor Cyan
Write-Host "Project path: $projectPath" -ForegroundColor Yellow
Write-Host "ZIP will be saved to: $zipPath" -ForegroundColor Yellow

# Remove old ZIP if exists
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
    Write-Host "Removed old ZIP file" -ForegroundColor Green
}

# Create temporary directory for clean copy
$tempDir = Join-Path $env:TEMP "OneMindAI-Temp"
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

Write-Host "Copying files..." -ForegroundColor Cyan

# Files and folders to exclude
$excludePatterns = @(
    "node_modules",
    "dist",
    ".git",
    ".vscode",
    "*.log",
    ".DS_Store",
    "Thumbs.db",
    "*.zip",
    "create-zip.ps1"
)

# Copy all files except excluded ones
Get-ChildItem -Path $projectPath -Recurse | ForEach-Object {
    $relativePath = $_.FullName.Substring($projectPath.Length + 1)
    $shouldExclude = $false
    
    foreach ($pattern in $excludePatterns) {
        if ($relativePath -like "*$pattern*") {
            $shouldExclude = $true
            break
        }
    }
    
    if (-not $shouldExclude) {
        $targetPath = Join-Path $tempDir $relativePath
        if ($_.PSIsContainer) {
            New-Item -ItemType Directory -Path $targetPath -Force | Out-Null
        } else {
            $targetDir = Split-Path $targetPath -Parent
            if (-not (Test-Path $targetDir)) {
                New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
            }
            Copy-Item $_.FullName -Destination $targetPath -Force
        }
    }
}

Write-Host "Creating ZIP archive..." -ForegroundColor Cyan

# Create ZIP file
Compress-Archive -Path "$tempDir\*" -DestinationPath $zipPath -Force

# Clean up temp directory
Remove-Item $tempDir -Recurse -Force

Write-Host ""
Write-Host "✅ ZIP file created successfully!" -ForegroundColor Green
Write-Host "📦 Location: $zipPath" -ForegroundColor Yellow
Write-Host "📊 Size: $([math]::Round((Get-Item $zipPath).Length / 1MB, 2)) MB" -ForegroundColor Yellow
Write-Host ""
Write-Host "🎉 Ready to share with your boss!" -ForegroundColor Cyan
Write-Host ""
Write-Host "The ZIP includes:" -ForegroundColor White
Write-Host "  ✓ All source code" -ForegroundColor Green
Write-Host "  ✓ Configuration files" -ForegroundColor Green
Write-Host "  ✓ SETUP_GUIDE.md (complete installation guide)" -ForegroundColor Green
Write-Host "  ✓ package.json (all dependencies listed)" -ForegroundColor Green
Write-Host ""
Write-Host "Excluded (will be installed via npm install):" -ForegroundColor White
Write-Host "  ✗ node_modules (saves space)" -ForegroundColor Red
Write-Host "  ✗ dist (will be built)" -ForegroundColor Red
Write-Host ""

# Open the folder containing the ZIP
Start-Process "explorer.exe" -ArgumentList "/select,`"$zipPath`""
