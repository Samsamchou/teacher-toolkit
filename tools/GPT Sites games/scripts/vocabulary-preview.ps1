param([int]$Port=5196)
$ErrorActionPreference='Stop'
$vocabSource=Split-Path -Parent $PSScriptRoot
$vocabRuntime=Join-Path $env:LOCALAPPDATA 'Temp\gsg-vocabulary-20260920'
New-Item -ItemType Directory -Path $vocabRuntime -Force | Out-Null
foreach($name in @('src','public','scripts','tests','functions','index.html','vite.config.js','package.json','package-lock.json','firebase.json','firestore.rules','storage.rules')){
 if($name -eq 'functions'){
  New-Item -ItemType Directory -Path (Join-Path $vocabRuntime 'functions') -Force | Out-Null
  Get-ChildItem -LiteralPath (Join-Path $vocabSource 'functions') -File | Copy-Item -Destination (Join-Path $vocabRuntime 'functions') -Force
  foreach($asset in @('unscramble-assets','vocabulary-assets')){Copy-Item -LiteralPath (Join-Path $vocabSource "functions\$asset") -Destination (Join-Path $vocabRuntime 'functions') -Recurse -Force}
 }else{Copy-Item -LiteralPath (Join-Path $vocabSource $name) -Destination $vocabRuntime -Recurse -Force}
}
Set-Location -LiteralPath $vocabRuntime
New-Item -ItemType Directory -Path 'qa/plinkoh-powerups-20260919' -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $vocabSource 'qa/plinkoh-powerups-20260919/legacy-model-snapshot.mjs') -Destination 'qa/plinkoh-powerups-20260919/legacy-model-snapshot.mjs' -Force
if(!(Test-Path 'node_modules/vite/package.json')){npm ci --cache (Join-Path $env:TEMP 'gsg-unscramble-npm-cache');if($LASTEXITCODE-ne 0){throw 'Dependencies failed.'}}
$env:GCLOUD_PROJECT='demo-classroom-games'
$env:FIRESTORE_EMULATOR_HOST='127.0.0.1:8186'
$env:FIREBASE_STORAGE_EMULATOR_HOST='127.0.0.1:9296'
$firebaseCli=Join-Path $env:APPDATA 'npm\node_modules\firebase-tools\lib\bin\firebase.js'
if(!(Get-NetTCPConnection -LocalPort 8186 -State Listen -ErrorAction SilentlyContinue)){
 $vocabArgs=@($firebaseCli,'emulators:start','--only','firestore,storage','--project','demo-classroom-games','--export-on-exit=emulator-data')
 if(Test-Path 'emulator-data/firebase-export-metadata.json'){$vocabArgs+='--import=emulator-data'}
 Start-Process -FilePath 'node' -ArgumentList $vocabArgs -WorkingDirectory $vocabRuntime -WindowStyle Hidden -RedirectStandardOutput 'emulators.out.log' -RedirectStandardError 'emulators.err.log' | Out-Null
}
for($n=0;$n-lt 45;$n++){if(Get-NetTCPConnection -LocalPort 9296 -State Listen -ErrorAction SilentlyContinue){break};Start-Sleep -Seconds 1}
if(!(Get-NetTCPConnection -LocalPort 9296 -State Listen -ErrorAction SilentlyContinue)){throw 'Emulators not ready. Inspect emulator logs.'}
if(!(Get-NetTCPConnection -LocalPort 5197 -State Listen -ErrorAction SilentlyContinue)){Start-Process -FilePath 'node' -ArgumentList 'scripts/vocabulary-local-server.mjs' -WorkingDirectory $vocabRuntime -WindowStyle Hidden -RedirectStandardOutput 'vocabulary-api.out.log' -RedirectStandardError 'vocabulary-api.err.log' | Out-Null}
if(!(Get-NetTCPConnection -LocalPort 5185 -State Listen -ErrorAction SilentlyContinue)){Start-Process -FilePath 'node' -ArgumentList 'scripts/live-local-server.mjs' -WorkingDirectory $vocabRuntime -WindowStyle Hidden -RedirectStandardOutput 'unscramble-api.out.log' -RedirectStandardError 'unscramble-api.err.log' | Out-Null}
if(!(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)){Start-Process -FilePath 'node' -ArgumentList @('node_modules/vite/bin/vite.js','--host','127.0.0.1','--mode','demo','--port',"$Port") -WorkingDirectory $vocabRuntime -WindowStyle Hidden -RedirectStandardOutput 'vite.out.log' -RedirectStandardError 'vite.err.log' | Out-Null}
Write-Output "Vocabulary local preview: http://127.0.0.1:$Port/vocabulary"
