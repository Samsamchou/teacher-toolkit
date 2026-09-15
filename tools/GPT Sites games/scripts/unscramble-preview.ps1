param([int]$Port=5184)
$ErrorActionPreference='Stop'
$liveSource=Split-Path -Parent $PSScriptRoot
$liveRuntime=Join-Path $env:LOCALAPPDATA 'Temp\gsg-unscramble-20260915'
New-Item -ItemType Directory -Path $liveRuntime -Force | Out-Null
foreach($name in @('src','public','tests','scripts','functions','index.html','vite.config.js','package.json','package-lock.json','firebase.json','firestore.rules','storage.rules')){
 if($name -eq 'functions'){
  New-Item -ItemType Directory -Path (Join-Path $liveRuntime 'functions') -Force | Out-Null
  Get-ChildItem -LiteralPath (Join-Path $liveSource 'functions') -File | Copy-Item -Destination (Join-Path $liveRuntime 'functions') -Force
  Copy-Item -LiteralPath (Join-Path $liveSource 'functions\unscramble-assets') -Destination (Join-Path $liveRuntime 'functions') -Recurse -Force
 }else{Copy-Item -LiteralPath (Join-Path $liveSource $name) -Destination $liveRuntime -Recurse -Force}
}
Set-Location -LiteralPath $liveRuntime
if(!(Test-Path 'node_modules/qrcode/package.json') -or !(Test-Path 'node_modules/firebase-admin/package.json')){npm ci --cache (Join-Path $env:TEMP 'gsg-unscramble-npm-cache');if($LASTEXITCODE-ne 0){throw 'Local dependencies failed.'}}
$emulatorArgs=@('emulators:start','--only','firestore,storage','--project','demo-classroom-games','--export-on-exit=emulator-data')
if(Test-Path 'emulator-data/firebase-export-metadata.json'){$emulatorArgs+='--import=emulator-data'}
$env:GCLOUD_PROJECT='demo-classroom-games'
$env:FIRESTORE_EMULATOR_HOST='127.0.0.1:8186'
$env:FIREBASE_STORAGE_EMULATOR_HOST='127.0.0.1:9296'
$firebaseCli=Join-Path $env:APPDATA 'npm\node_modules\firebase-tools\lib\bin\firebase.js'
if(!(Get-NetTCPConnection -LocalPort 8186 -State Listen -ErrorAction SilentlyContinue)){
 Start-Process -FilePath 'node' -ArgumentList (@($firebaseCli)+$emulatorArgs) -WorkingDirectory $liveRuntime -WindowStyle Hidden -RedirectStandardOutput 'emulators.out.log' -RedirectStandardError 'emulators.err.log' | Out-Null
}
for($n=0;$n-lt 90;$n++){if(Get-NetTCPConnection -LocalPort 9296 -State Listen -ErrorAction SilentlyContinue){break};Start-Sleep -Seconds 1}
if(!(Get-NetTCPConnection -LocalPort 9296 -State Listen -ErrorAction SilentlyContinue)){throw 'Local emulators did not start; inspect emulator logs.'}
if(!(Get-NetTCPConnection -LocalPort 5185 -State Listen -ErrorAction SilentlyContinue)){Start-Process -FilePath 'node' -ArgumentList 'scripts/live-local-server.mjs' -WorkingDirectory $liveRuntime -WindowStyle Hidden -RedirectStandardOutput 'api.out.log' -RedirectStandardError 'api.err.log' | Out-Null}
if(!(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)){Start-Process -FilePath 'node' -ArgumentList @('node_modules/vite/bin/vite.js','--host','127.0.0.1','--mode','demo','--port',"$Port") -WorkingDirectory $liveRuntime -WindowStyle Hidden -RedirectStandardOutput 'vite.out.log' -RedirectStandardError 'vite.err.log' | Out-Null}
Write-Output "Local teacher preview: http://127.0.0.1:$Port/unscramble"
Write-Output 'Only this computer can reach the local preview. Firebase deployment is not performed.'
