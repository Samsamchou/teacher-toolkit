param([int]$Port = 5182)
$ErrorActionPreference = 'Stop'
$spinSource = Split-Path -Parent $PSScriptRoot
$spinRuntime = Join-Path $env:TEMP 'gsg-spin-20260912'
New-Item -ItemType Directory -Path $spinRuntime -Force | Out-Null
foreach ($name in @('src','public','tests','index.html','vite.config.js','package.json','package-lock.json')) {
    Copy-Item -LiteralPath (Join-Path $spinSource $name) -Destination $spinRuntime -Recurse -Force
}
Set-Location -LiteralPath $spinRuntime
if (!(Test-Path -LiteralPath 'node_modules/vite/package.json')) {
    npm ci
    if ($LASTEXITCODE -ne 0) { throw 'Dependencies did not install.' }
}
npm run dev -- --port $Port
