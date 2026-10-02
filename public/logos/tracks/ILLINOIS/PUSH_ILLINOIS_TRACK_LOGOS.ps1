$ErrorActionPreference = "Stop"

$SourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$LogoDir = Split-Path -Parent $SourceDir
$Installer = Join-Path $LogoDir "PUSH_STATE_TRACK_LOGOS.ps1"

if (-not (Test-Path $Installer)) {
    throw "Missing shared logo installer: $Installer"
}

& $Installer -StateCode "IL" -StateName "Illinois" -SourceDir $SourceDir
