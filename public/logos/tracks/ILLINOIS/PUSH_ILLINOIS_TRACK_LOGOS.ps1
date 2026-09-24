$ErrorActionPreference = "Stop"

$Repo = "C:\Users\schaf\racing-museum"
$LogoDir = Join-Path $Repo "public\logos\tracks"
$SourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Installing Illinois track logos..." -ForegroundColor Cyan

$files = Get-ChildItem -Path $SourceDir -File | Where-Object {
    $_.Extension.ToLower() -in @(".jpg", ".jpeg", ".png", ".webp", ".svg")
}

if (-not $files) {
    throw "No Illinois track logo image files were found in $SourceDir"
}

New-Item -ItemType Directory -Force -Path $LogoDir | Out-Null

foreach ($file in $files) {
    $destination = Join-Path $LogoDir $file.Name
    if ($file.FullName -ne $destination) {
        Copy-Item -Force $file.FullName $destination
    }
    Write-Host "  Installed $($file.Name)"
}

Set-Location $Repo
git add public/logos/tracks
git commit -m "Add or update Illinois track logos"
git push origin main

Write-Host ""
Write-Host "Illinois track logos pushed to GitHub." -ForegroundColor Green
