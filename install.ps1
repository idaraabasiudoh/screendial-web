# Screendial Windows Installer
# Downloads the latest .exe from GitHub releases and runs it.

$ErrorActionPreference = "Stop"

$repo = "idaraabasiudoh/screendial-web"
$apiUrl = "https://api.github.com/repos/$repo/releases/latest"

Write-Host "=================================================="
Write-Host "    Screendial Windows Installer"
Write-Host "=================================================="
Write-Host ""

Write-Host "-> Fetching latest release..."
$release = Invoke-RestMethod -Uri $apiUrl -Headers @{ "User-Agent" = "Screendial-Installer" }
$asset = $release.assets | Where-Object { $_.name -like "*.exe" } | Select-Object -First 1

if (-not $asset) {
    Write-Host "Error: No .exe asset found in the latest release."
    Write-Host "Check https://github.com/$repo/releases for available downloads."
    exit 1
}

$tempExe = Join-Path $env:TEMP "Screendial_Setup.exe"

Write-Host "-> Downloading $($asset.name)..."
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $tempExe -UseBasicParsing

if (-not (Test-Path $tempExe)) {
    Write-Host "Error: Download failed."
    exit 1
}

Write-Host "-> Launching installer..."
Start-Process -FilePath $tempExe

Write-Host ""
Write-Host "=================================================="
Write-Host "    Screendial installer launched!"
Write-Host "=================================================="
Write-Host "Follow the installer prompts to complete setup."
