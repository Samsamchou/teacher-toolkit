# Local runtime outside Google Drive avoids cloud-file interference with package extraction.
$ErrorActionPreference = 'Stop'
$taskSource = Split-Path -Parent $PSScriptRoot
$taskRuntime = Join-Path $env:LOCALAPPDATA 'Temp\classroom-club-runtime-20260905'
New-Item -ItemType Directory -Path $taskRuntime -Force | Out-Null
foreach ($name in @('src','public','functions','tests','index.html','vite.config.js','firebase.json','firestore.rules','storage.rules','package.json','package-lock.json')) {
    $source = Join-Path $taskSource $name
    if (Test-Path -LiteralPath $source) { Copy-Item -LiteralPath $source -Destination $taskRuntime -Recurse -Force }
}
Set-Location -LiteralPath $taskRuntime
if (!(Test-Path -LiteralPath 'node_modules\vite\package.json')) { npm ci; if ($LASTEXITCODE -ne 0) { throw 'Dependencies did not install.' } }
npm run dev
