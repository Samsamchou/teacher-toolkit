param([int]$Port=5194,[switch]$PrepareOnly)
$ErrorActionPreference='Stop'
$plinkSource=Split-Path -Parent $PSScriptRoot
$plinkRuntime=Join-Path $env:LOCALAPPDATA 'Temp\gsg-plinkoh-20260919'
New-Item -ItemType Directory -Path $plinkRuntime -Force | Out-Null
foreach($name in @('src','public','tests','scripts')) {
    & robocopy (Join-Path $plinkSource $name) (Join-Path $plinkRuntime $name) /E /NFL /NDL /NJH /NJS /NP | Out-Null
    if($LASTEXITCODE -ge 8){throw "Copy failed: $name"}
}
foreach($name in @('index.html','vite.config.js','package.json','package-lock.json')){Copy-Item -LiteralPath (Join-Path $plinkSource $name) -Destination $plinkRuntime -Force}
New-Item -ItemType Directory -Path (Join-Path $plinkRuntime 'functions') -Force | Out-Null
Get-ChildItem -LiteralPath (Join-Path $plinkSource 'functions') -File | Where-Object {$_.Extension -in '.mjs','.js','.json'} | Copy-Item -Destination (Join-Path $plinkRuntime 'functions') -Force
& robocopy (Join-Path $plinkSource 'qa\plinkoh-20260919') (Join-Path $plinkRuntime 'qa\plinkoh-20260919') /E /NFL /NDL /NJH /NJS /NP | Out-Null
if($LASTEXITCODE -ge 8){throw 'QA copy failed'}
& robocopy (Join-Path $plinkSource 'qa\plinkoh-powerups-20260919') (Join-Path $plinkRuntime 'qa\plinkoh-powerups-20260919') /E /NFL /NDL /NJH /NJS /NP | Out-Null
if($LASTEXITCODE -ge 8){throw 'Power-up QA copy failed'}
& robocopy (Join-Path $plinkSource 'qa\plinkoh-card-art-20260919') (Join-Path $plinkRuntime 'qa\plinkoh-card-art-20260919') /E /NFL /NDL /NJH /NJS /NP | Out-Null
if($LASTEXITCODE -ge 8){throw 'Card art QA copy failed'}
Set-Location -LiteralPath $plinkRuntime
if(!(Test-Path -LiteralPath 'node_modules\vite\package.json')){npm ci;if($LASTEXITCODE -ne 0){throw 'Dependency install failed'}}
if(!$PrepareOnly){npm run dev -- --port $Port}
