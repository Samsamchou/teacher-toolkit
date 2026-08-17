$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$javaCommand = Get-Command java -ErrorAction SilentlyContinue
if (-not $javaCommand) {
  $temurinRoot = "C:\Program Files\Eclipse Adoptium"
  $candidate = Get-ChildItem -LiteralPath $temurinRoot -Directory -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    ForEach-Object { Join-Path $_.FullName "bin\java.exe" } |
    Where-Object { Test-Path -LiteralPath $_ } |
    Select-Object -First 1
  if ($candidate) {
    $env:PATH = (Split-Path -Parent $candidate) + ";" + $env:PATH
  } else {
    throw "Java Runtime not found. Install a supported JRE before running Firestore Emulator tests."
  }
}
Push-Location $root
try {
  firebase emulators:exec --only firestore --config firebase.emulator.json --project demo-lesson-hub "node --test tests/firestore-rules.integration.mjs"
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
  Pop-Location
}
