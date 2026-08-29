$ErrorActionPreference = "Stop"

$Repo = "C:\Users\schaf\racing-museum"
$LogoDir = Join-Path $Repo "public\logos\tracks"
$SourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Installing Illinois track logos..." -ForegroundColor Cyan

$files = @(
  "santa-fe-speedway-il.jpg",
  "sycamore-speedway-il.jpg",
  "lasalle-speedway-il.jpg",
  "soldier-field-il.jpg",
  "the-dirt-oval-at-route-66-raceway-il.jpg",
  "freeport-speedway-il.jpg",
  "pecatonica-speedway-il.jpg",
  "ohare-stadium-il.jpg"
)

New-Item -ItemType Directory -Force -Path $LogoDir | Out-Null

foreach ($file in $files) {
    Copy-Item -Force (Join-Path $SourceDir $file) (Join-Path $LogoDir $file)
    Write-Host "  Installed $file"
}

Set-Location $Repo
git add public/logos/tracks
git commit -m "Add missing Illinois track logos"
git push origin main

Write-Host ""
Write-Host "Illinois track logos pushed to GitHub." -ForegroundColor Green
