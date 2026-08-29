$ErrorActionPreference = "Stop"

$Repo = "C:\Users\schaf\racing-museum"
$LogoDir = Join-Path $Repo "public\logos\tracks"
$SourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Installing Minnesota track logos..." -ForegroundColor Cyan

$files = @(
  "north-star-speedway-mn.jpg",
  "cannon-river-speedway-mn.jpg",
  "hiawatha-speedway-mn.jpg",
  "jackson-motorplex-mn.jpg"
)

New-Item -ItemType Directory -Force -Path $LogoDir | Out-Null

foreach ($file in $files) {
    Copy-Item -Force (Join-Path $SourceDir $file) (Join-Path $LogoDir $file)
    Write-Host "  Installed $file"
}

Set-Location $Repo
git add public/logos/tracks
git commit -m "Add Minnesota track logos"
git push origin main

Write-Host ""
Write-Host "Minnesota track logos pushed to GitHub." -ForegroundColor Green
