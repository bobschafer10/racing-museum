$ErrorActionPreference = "Stop"

$SourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Repo = (git -C $SourceDir rev-parse --show-toplevel).Trim()
if (-not $Repo) {
    throw "Could not determine the Git repository root from $SourceDir"
}
$LogoDir = Join-Path $Repo "public\logos\tracks"

Write-Host "Installing Minnesota track logos..." -ForegroundColor Cyan

# Automatically include every supported logo image in this state folder.
$files = Get-ChildItem -Path $SourceDir -File | Where-Object {
    $_.Extension.ToLower() -in @(".jpg", ".jpeg", ".png", ".webp", ".svg")
}

if (-not $files) {
    throw "No Minnesota track logo image files were found in $SourceDir"
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

$changes = git status --porcelain -- public/logos/tracks
if ($changes) {
    git commit -m "Add or update Minnesota track logos"
    git push origin HEAD:main
    Write-Host ""
    Write-Host "Minnesota track logos pushed to GitHub." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Minnesota track logos are already up to date." -ForegroundColor Green
}
