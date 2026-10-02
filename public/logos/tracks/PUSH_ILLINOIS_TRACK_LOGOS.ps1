$ErrorActionPreference = "Stop"

$SourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$IllinoisDir = Join-Path $SourceDir "ILLINOIS"
$Installer = Join-Path $SourceDir "PUSH_STATE_TRACK_LOGOS.ps1"

if (-not (Test-Path $Installer)) {
    throw "Missing shared logo installer: $Installer"
}

& $Installer -StateCode "IL" -StateName "Illinois" -SourceDir $IllinoisDir
