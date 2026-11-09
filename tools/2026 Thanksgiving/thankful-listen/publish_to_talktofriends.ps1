# 把聆聽網頁複製到 talktofriends 網站（monster-in-my-mind-site）的 public 資料夾。
# 正式原稿只在本資料夾改；改完執行本腳本，再到網站資料夾 build + deploy（只部署 hosting）。
#   powershell -ExecutionPolicy Bypass -File publish_to_talktofriends.ps1 [-Site <網站根目錄>]
param([string]$Site = (Join-Path $PSScriptRoot '..\..\monster-in-my-mind-site'))
$ErrorActionPreference = 'Stop'
$src = $PSScriptRoot
$dst = Join-Path (Resolve-Path $Site) 'public\festivals\write-a-thankful-card'
if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }
New-Item -ItemType Directory -Force $dst, "$dst\audio", "$dst\sfx", "$dst\img", "$dst\card" | Out-Null

Copy-Item "$src\engine.js", "$src\data.js" $dst
Copy-Item "$src\scenes_*.js" $dst
Copy-Item "$src\audio\*.mp3" "$dst\audio"
Copy-Item "$src\sfx\*.wav" "$dst\sfx"
Copy-Item "$src\img\*.png" "$dst\img"
Copy-Item "$src\card\card_A4.pdf", "$src\card\example_A3.pdf", "$src\card\wordbank_A4.pdf" "$dst\card"

# 加 <base>：網址少了結尾斜線時，相對路徑（音檔、圖片）也不會壞
$html = [IO.File]::ReadAllText("$src\index.html", [Text.Encoding]::UTF8)
$html = $html.Replace('<meta charset="utf-8">', '<meta charset="utf-8">' + "`n" + '<base href="/festivals/write-a-thankful-card/">')
[IO.File]::WriteAllText("$dst\index.html", $html, (New-Object Text.UTF8Encoding $false))

$n = (Get-ChildItem $dst -Recurse -File).Count
$mb = [math]::Round(((Get-ChildItem $dst -Recurse -File | Measure-Object Length -Sum).Sum / 1MB), 1)
"複製完成：$n 個檔案，$mb MB → $dst"
