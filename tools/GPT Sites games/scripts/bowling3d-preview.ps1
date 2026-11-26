param([int]$Port=5221,[switch]$BuildOnly,[switch]$PrepareOnly,[switch]$SyncOnly)
# Bowling 3D pilot preview / 保齡球 3D 試片預覽
# Dependencies run from a local temp copy because Google Drive sync breaks node_modules.
$ErrorActionPreference='Stop'
$source=Split-Path -Parent $PSScriptRoot
$runtime=Join-Path $env:TEMP 'gsg-bowling3d-20261126'
New-Item -ItemType Directory -Path $runtime -Force | Out-Null
foreach($name in @('src','functions','public','scripts')){
    & robocopy (Join-Path $source $name) (Join-Path $runtime $name) /E /NFL /NDL /NJH /NJS /NP | Out-Null
    if($LASTEXITCODE -ge 8){throw "Could not copy $name"}
}
foreach($name in @('index.html','bowling3d-pilot.html','basket3d-pilot.html','vite.config.js','package.json','package-lock.json')){
    Copy-Item -LiteralPath (Join-Path $source $name) -Destination $runtime -Force
}
if($SyncOnly){Write-Output "Synced to $runtime";return}
Set-Location -LiteralPath $runtime
if(!(Test-Path -LiteralPath 'node_modules\three\package.json')){
    npm ci
    if($LASTEXITCODE -ne 0){throw 'Could not install isolated runtime dependencies'}
}
Write-Output "Bowling 3D preview runtime: $runtime"
if($PrepareOnly){return}
if($BuildOnly){
    npx vite build
    if($LASTEXITCODE -ne 0){throw 'Bowling 3D preview build failed'}
    return
}
Write-Output "Open http://127.0.0.1:$Port/bowling3d-pilot.html or /basket3d-pilot.html"
npm run dev -- --port $Port
