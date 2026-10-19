param([string]$Pptx, [string]$OutDir, [int]$Width = 1600)
# 用 PowerPoint 把每一頁匯出成 PNG（驗證實際字型與注音顯示）
$ErrorActionPreference = 'Stop'
$full = (Resolve-Path $Pptx).Path
New-Item -ItemType Directory -Force $OutDir | Out-Null
$out = (Resolve-Path $OutDir).Path
$app = New-Object -ComObject PowerPoint.Application
try {
  $pres = $app.Presentations.Open($full, $true, $false, $false)
  $h = [int]($Width * $pres.PageSetup.SlideHeight / $pres.PageSetup.SlideWidth)
  $i = 1
  foreach ($s in $pres.Slides) { $s.Export((Join-Path $out ("slide{0:D2}.png" -f $i)), 'PNG', $Width, $h); $i++ }
  $pres.Close()
} finally { $app.Quit() }
"exported $($i-1) slides"
