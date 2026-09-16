[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)][ValidateRange(1959,2100)][int]$Year,
    [switch]$DryRun,
    [string]$SourceRoot,
    [string]$StateRoot,
    [string]$Tesseract
)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if ($nodeCommand) { $nodeExecutable = $nodeCommand.Source }
else {
    $nodeExecutable = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
    if (-not (Test-Path -LiteralPath $nodeExecutable)) { throw 'Install Node.js 22 or newer and add it to PATH, then rerun.' }
}
$toolArguments = @((Join-Path $PSScriptRoot 'ingest.cjs'), '--year', "$Year", '--project-root', $projectRoot)
if ($DryRun) { $toolArguments += '--dry-run' }
if ($SourceRoot) { $toolArguments += @('--source-root', $SourceRoot) }
if ($StateRoot) { $toolArguments += @('--state-root', $StateRoot) }
if ($Tesseract) { $toolArguments += @('--tesseract', $Tesseract) }
& $nodeExecutable @toolArguments
if ($LASTEXITCODE -ne 0) { throw "MRN ingestion stopped (exit $LASTEXITCODE). Read latest-report.json and rerun the same command to resume." }
