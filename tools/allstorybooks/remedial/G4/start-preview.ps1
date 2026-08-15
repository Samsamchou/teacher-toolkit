$ErrorActionPreference = "Stop"

$siteLauncher = Join-Path $PSScriptRoot "..\..\start-site.ps1"
& $siteLauncher
