param([int]$Port = 5183)
$ErrorActionPreference = 'Stop'
$basketballSource = Split-Path -Parent $PSScriptRoot
$basketballRuntime = Join-Path $env:LOCALAPPDATA 'Temp\gsg-basketball-20260913'
New-Item -ItemType Directory -Path $basketballRuntime -Force | Out-Null
foreach ($name in @('src','public','tests','index.html','vite.config.js','package.json','package-lock.json')) {
    Copy-Item -LiteralPath (Join-Path $basketballSource $name) -Destination $basketballRuntime -Recurse -Force
}
Set-Location -LiteralPath $basketballRuntime
if (!(Test-Path -LiteralPath 'node_modules/vite/package.json')) {
    npm ci
    if ($LASTEXITCODE -ne 0) { throw 'Dependencies did not install.' }
}
npm run dev -- --port $Port
