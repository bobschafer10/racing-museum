$ErrorActionPreference = "Stop"

param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern("^[A-Za-z]{2,3}$")]
    [string]$StateCode,

    [Parameter(Mandatory = $true)]
    [string]$StateName,

    [Parameter(Mandatory = $true)]
    [string]$SourceDir,

    [switch]$PreviewOnly
)

$StateCode = $StateCode.ToLowerInvariant()
$SourceDir = (Resolve-Path $SourceDir).Path
$Repo = (git -C $SourceDir rev-parse --show-toplevel).Trim()

if (-not $Repo) {
    throw "Could not determine the Git repository root from $SourceDir"
}

$LogoDir = Join-Path $Repo "public\logos\tracks"
$SupportedExtensions = @(".jpg", ".jpeg", ".png", ".webp", ".svg")

function ConvertTo-CanonicalTrackSlug {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FileName
    )

    $stem = [System.IO.Path]::GetFileNameWithoutExtension($FileName).Trim()

    # Allow friendly local filenames such as:
    #   Fairbury Speedway Logo.jpg
    #   CHICAGO MOTOR SPEEDWAY LOGO.jpg
    #   jacksonville-speedway-il.png
    $stem = $stem -replace '(?i)[\s_-]+(?:track[\s_-]+)?logo$', ''
    $stem = $stem -replace '(?i)\s*\(\s*logo\s*\)\s*$', ''
    $stem = $stem.ToLowerInvariant()
    $stem = $stem -replace '&', ' and '
    $stem = $stem -replace "[’']", ''
    $stem = $stem -replace '[^a-z0-9]+', '-'
    $stem = $stem.Trim('-')

    $stateNameSlug = ($StateName.ToLowerInvariant() -replace '[^a-z0-9]+', '-').Trim('-')

    if ($stateNameSlug -and $stem.EndsWith("-$stateNameSlug")) {
        $stem = $stem.Substring(0, $stem.Length - $stateNameSlug.Length - 1)
    }

    if (-not $stem.EndsWith("-$StateCode")) {
        $stem = "$stem-$StateCode"
    }

    return $stem
}

Write-Host "Installing $StateName track logos..." -ForegroundColor Cyan
Write-Host "Source: $SourceDir"
Write-Host "Canonical destination: $LogoDir"
Write-Host ""

$files = Get-ChildItem -Path $SourceDir -File | Where-Object {
    $_.Extension.ToLowerInvariant() -in $SupportedExtensions
}

if (-not $files) {
    throw "No supported track logo image files were found in $SourceDir"
}

$records = foreach ($file in $files) {
    $canonicalSlug = ConvertTo-CanonicalTrackSlug -FileName $file.Name
    $originalStem = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)
    $explicitLogoName = $originalStem -match '(?i)(?:^|[\s_-])(?:track[\s_-]+)?logo$'

    [PSCustomObject]@{
        File = $file
        CanonicalSlug = $canonicalSlug
        Score = if ($explicitLogoName) { 2 } else { 1 }
    }
}

$selected = @()

foreach ($group in ($records | Group-Object CanonicalSlug)) {
    $ordered = $group.Group | Sort-Object -Property @{ Expression = { $_.Score }; Descending = $true }, @{ Expression = { $_.File.LastWriteTimeUtc }; Descending = $true }, @{ Expression = { $_.File.Length }; Descending = $true }

    $winner = $ordered | Select-Object -First 1
    $selected += $winner

    if ($ordered.Count -gt 1) {
        Write-Host "Multiple files map to $($group.Name); using $($winner.File.Name)" -ForegroundColor Yellow
        foreach ($alternate in ($ordered | Select-Object -Skip 1)) {
            Write-Host "  skipped duplicate candidate: $($alternate.File.Name)" -ForegroundColor DarkYellow
        }
    }
}

New-Item -ItemType Directory -Force -Path $LogoDir | Out-Null

foreach ($record in ($selected | Sort-Object CanonicalSlug)) {
    $extension = $record.File.Extension.ToLowerInvariant()
    $canonicalName = "$($record.CanonicalSlug)$extension"
    $destination = Join-Path $LogoDir $canonicalName

    Write-Host ("  {0}  ->  {1}" -f $record.File.Name, $canonicalName)

    if (-not $PreviewOnly) {
        Copy-Item -Force $record.File.FullName $destination
    }
}

if ($PreviewOnly) {
    Write-Host ""
    Write-Host "Preview only. No files were copied, committed, or pushed." -ForegroundColor Green
    exit 0
}

Set-Location $Repo
git add public/logos/tracks

$changes = git status --porcelain -- public/logos/tracks
if ($changes) {
    git commit -m "Add or update $StateName track logos"
    git push origin HEAD:main
    Write-Host ""
    Write-Host "$StateName track logos installed and pushed to GitHub." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "$StateName track logos are already up to date." -ForegroundColor Green
}
