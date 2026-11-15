param([string]$Pptx, [string]$PngDir, [int]$Width = 1600)
# 用 PowerPoint 開啟 pptx：存同名 PDF，並把每頁匯出 PNG 供逐頁檢查
$ErrorActionPreference = 'Stop'
$full = (Resolve-Path $Pptx).Path
$pdf = [IO.Path]::ChangeExtension($full, '.pdf')
New-Item -ItemType Directory -Force $PngDir | Out-Null
$out = (Resolve-Path $PngDir).Path
$app = New-Object -ComObject PowerPoint.Application
try {
  $pres = $app.Presentations.Open($full, $true, $false, $false)
  $pres.SaveAs($pdf, 32)   # 32 = ppSaveAsPDF
  $h = [int]($Width * $pres.PageSetup.SlideHeight / $pres.PageSetup.SlideWidth)
  $i = 1
  foreach ($s in $pres.Slides) { $s.Export((Join-Path $out ("p{0:D2}.png" -f $i)), 'PNG', $Width, $h); $i++ }
  $pres.Close()
} finally { $app.Quit() }
"exported $($i-1) pages + pdf"
