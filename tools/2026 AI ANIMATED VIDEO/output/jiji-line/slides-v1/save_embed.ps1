param([string]$In, [string]$Out)
# 用 PowerPoint 開啟並另存為 .pptx，同時內嵌 TrueType 字型（讓沒裝注音字型的電腦也能正確顯示）
$ErrorActionPreference = 'Stop'
$src = (Resolve-Path $In).Path
$app = New-Object -ComObject PowerPoint.Application
try {
  $pres = $app.Presentations.Open($src, $false, $false, $false)
  # 24 = ppSaveAsOpenXMLPresentation, -1 = msoTrue (EmbedTrueTypeFonts)
  $pres.SaveAs($Out, 24, -1)
  $pres.Close()
} finally { $app.Quit() }
"saved $Out"
