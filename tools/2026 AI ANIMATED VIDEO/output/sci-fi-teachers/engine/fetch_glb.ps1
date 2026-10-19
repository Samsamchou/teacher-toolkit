# fetch_glb.ps1 -Name nova-P03-v1 [-Teacher nova]
# Finds the newest complete GLB in Downloads (Chrome may leave it as .tmp), copies it to characters/<Teacher>/models/<Name>.glb, prints SHA-256.
# Skips any download whose hash already matches a model in the models folder (so an older export is never picked twice).
# Keep this file ASCII-only: Windows PowerShell 5.1 reads BOM-less UTF-8 as ANSI and non-ASCII comments can break the param() line.
param([Parameter(Mandatory)][string]$Name, [string]$Teacher = 'nova')
$dl = Join-Path $env:USERPROFILE 'Downloads'
$dir = Join-Path $PSScriptRoot "..\characters\$Teacher\models"
$dst = Join-Path $dir "$Name.glb"
New-Item -ItemType Directory -Force $dir | Out-Null
if (Test-Path -LiteralPath $dst) { Write-Output "EXISTS $dst"; exit 1 }
$known = @{}
Get-ChildItem $dir -Filter *.glb | ForEach-Object { $known[(Get-FileHash -LiteralPath $_.FullName).Hash] = $_.Name }
$deadline = (Get-Date).AddMinutes(4)
$hit = $null
do {
  $cands = Get-ChildItem $dl -File | Where-Object { $_.LastWriteTime -gt (Get-Date).AddMinutes(-15) -and $_.Length -gt 1MB } | Sort-Object LastWriteTime -Descending
  foreach ($c in $cands) {
    $fs = [System.IO.File]::OpenRead($c.FullName); $b = New-Object byte[] 12; [void]$fs.Read($b, 0, 12); $fs.Close()
    if (([System.Text.Encoding]::ASCII.GetString($b, 0, 4) -ne 'glTF') -or ([BitConverter]::ToUInt32($b, 8) -ne $c.Length)) { continue }
    $h = (Get-FileHash -LiteralPath $c.FullName).Hash
    if ($known.ContainsKey($h)) { continue }
    $hit = $c; break
  }
  if ($hit) { break }
  [System.Threading.Thread]::Sleep(3000)
} while ((Get-Date) -lt $deadline)
if (-not $hit) { Write-Output 'NOT FOUND'; exit 1 }
Copy-Item -LiteralPath $hit.FullName -Destination $dst -Force
Write-Output "$($hit.Name) -> $dst  $((Get-FileHash -LiteralPath $dst).Hash)"
