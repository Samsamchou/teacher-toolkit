param(
  [string]$OutputDirectory = (Join-Path $PSScriptRoot '..\verification\negative-boards')
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$resolvedOutput = [System.IO.Path]::GetFullPath($OutputDirectory)
New-Item -ItemType Directory -Force -Path $resolvedOutput | Out-Null

function New-PointArray {
  param([object[]]$Coordinates)
  [System.Drawing.PointF[]]@(
    $Coordinates | ForEach-Object {
      [System.Drawing.PointF]::new([single]$_[0], [single]$_[1])
    }
  )
}

function Draw-Line {
  param(
    [System.Drawing.Graphics]$Graphics,
    [System.Drawing.Pen]$Pen,
    [single]$X1,
    [single]$Y1,
    [single]$X2,
    [single]$Y2
  )
  $Graphics.DrawLine($Pen, $X1, $Y1, $X2, $Y2)
}

function Draw-Curve {
  param(
    [System.Drawing.Graphics]$Graphics,
    [System.Drawing.Pen]$Pen,
    [object[]]$Coordinates,
    [single]$Tension = 0.45
  )
  $points = New-PointArray -Coordinates $Coordinates
  $Graphics.DrawCurve($Pen, $points, $Tension)
}

function Draw-WrongGlyph {
  param(
    [System.Drawing.Graphics]$Graphics,
    [System.Drawing.Pen]$Pen,
    [string]$Glyph,
    [single]$CenterX,
    [single]$BaselineY,
    [single]$Height,
    [single]$Width,
    [single]$Jitter
  )

  $top = $BaselineY - $Height
  $left = $CenterX - ($Width / 2)
  $right = $CenterX + ($Width / 2)
  $middle = $top + ($Height * 0.52)

  switch ($Glyph) {
    'h' {
      Draw-Curve $Graphics $Pen @(
        @(($left + $Width * 0.18 + $Jitter), $top),
        @(($left + $Width * 0.16), $middle),
        @(($left + $Width * 0.13 - $Jitter), $BaselineY)
      )
      Draw-Curve $Graphics $Pen @(
        @(($left + $Width * 0.14), ($middle + $Height * 0.12)),
        @(($left + $Width * 0.45), ($middle - $Height * 0.13)),
        @(($left + $Width * 0.72), ($middle - $Height * 0.06)),
        @(($left + $Width * 0.79 + $Jitter), $BaselineY)
      )
    }
    'o' {
      $Graphics.DrawEllipse(
        $Pen,
        $left + $Width * 0.08 + $Jitter,
        $top + $Height * 0.3,
        $Width * 0.82,
        $Height * 0.68
      )
    }
    'v' {
      Draw-Curve $Graphics $Pen @(
        @(($left + $Width * 0.12), ($top + $Height * 0.35)),
        @(($CenterX - $Jitter), $BaselineY),
        @(($right - $Width * 0.08), ($top + $Height * 0.3))
      ) 0.25
    }
    'l' {
      Draw-Curve $Graphics $Pen @(
        @(($CenterX + $Jitter), $top),
        @(($CenterX - $Jitter), $middle),
        @($CenterX, $BaselineY)
      ) 0.3
    }
    'c' {
      $Graphics.DrawArc(
        $Pen,
        $left + $Jitter,
        $top + $Height * 0.28,
        $Width,
        $Height * 0.7,
        45,
        275
      )
    }
    't' {
      Draw-Curve $Graphics $Pen @(
        @(($CenterX + $Jitter), ($top + $Height * 0.08)),
        @(($CenterX - $Jitter), $middle),
        @($CenterX, $BaselineY)
      ) 0.25
      Draw-Line $Graphics $Pen (
        $left + $Width * 0.12
      ) (
        $top + $Height * 0.42
      ) (
        $right - $Width * 0.08
      ) (
        $top + $Height * 0.42 + $Jitter
      )
    }
    '6' {
      Draw-Curve $Graphics $Pen @(
        @(($right - $Width * 0.12), ($top + $Height * 0.08)),
        @(($left + $Width * 0.2), ($top + $Height * 0.35)),
        @(($left + $Width * 0.18), ($BaselineY - $Height * 0.18)),
        @($CenterX, $BaselineY),
        @(($right - $Width * 0.12), ($BaselineY - $Height * 0.2)),
        @($CenterX, $middle),
        @(($left + $Width * 0.2), ($BaselineY - $Height * 0.18))
      ) 0.42
    }
    'x' {
      Draw-Line $Graphics $Pen (
        $left + $Width * 0.12
      ) (
        $top + $Height * 0.35
      ) (
        $right - $Width * 0.08
      ) $BaselineY
      Draw-Line $Graphics $Pen (
        $right - $Width * 0.12
      ) (
        $top + $Height * 0.32
      ) (
        $left + $Width * 0.1
      ) (
        $BaselineY - $Jitter
      )
    }
    'u' {
      Draw-Curve $Graphics $Pen @(
        @(($left + $Width * 0.12), ($top + $Height * 0.32)),
        @(($left + $Width * 0.18), $BaselineY),
        @($CenterX, ($BaselineY + $Jitter)),
        @(($right - $Width * 0.12), ($top + $Height * 0.3))
      ) 0.4
    }
    'r' {
      Draw-Line $Graphics $Pen (
        $left + $Width * 0.2
      ) (
        $top + $Height * 0.32
      ) (
        $left + $Width * 0.2
      ) $BaselineY
      Draw-Curve $Graphics $Pen @(
        @(($left + $Width * 0.2), ($top + $Height * 0.48)),
        @($CenterX, ($top + $Height * 0.28)),
        @(($right - $Width * 0.08), ($top + $Height * 0.38))
      ) 0.35
    }
  }
}

$patterns = @('h', 'o', 'v', 'l', 'c', 't', '6', 'x', 'u', 'r')
$manifest = @()

foreach ($index in 0..25) {
  $target = [char](65 + $index)
  $glyph = $patterns[$index % $patterns.Count]
  if ($target.ToString().ToLowerInvariant() -eq $glyph) {
    $glyph = $patterns[($index + 1) % $patterns.Count]
  }
  $jitter = [single](($index % 5) - 2)

  $bitmap = [System.Drawing.Bitmap]::new(640, 480)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.Color]::White)

  $guidePen = [System.Drawing.Pen]::new(
    [System.Drawing.Color]::FromArgb(203, 213, 225),
    3
  )
  $dashPen = [System.Drawing.Pen]::new(
    [System.Drawing.Color]::FromArgb(203, 213, 225),
    2
  )
  $dashPen.DashPattern = [single[]]@(2, 5)
  $baselinePen = [System.Drawing.Pen]::new(
    [System.Drawing.Color]::FromArgb(103, 218, 235),
    3
  )
  $dividerPen = [System.Drawing.Pen]::new(
    [System.Drawing.Color]::FromArgb(253, 230, 138),
    2
  )
  $dividerPen.DashPattern = [single[]]@(2, 5)

  Draw-Line $graphics $guidePen 18 40 622 40
  Draw-Line $graphics $dashPen 18 178 622 178
  Draw-Line $graphics $baselinePen 18 328 622 328
  Draw-Line $graphics $guidePen 18 456 622 456
  Draw-Line $graphics $dividerPen 320 20 320 464

  $inkPen = [System.Drawing.Pen]::new(
    [System.Drawing.Color]::FromArgb(37, 99, 235),
    23
  )
  $inkPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $inkPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $inkPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

  Draw-WrongGlyph $graphics $inkPen $glyph 170 328 250 175 $jitter
  Draw-WrongGlyph $graphics $inkPen $glyph 475 328 190 145 (-$jitter)

  $fileName = "target-$target-wrong-$glyph.png"
  $filePath = Join-Path $resolvedOutput $fileName
  $bitmap.Save($filePath, [System.Drawing.Imaging.ImageFormat]::Png)

  $manifest += [pscustomobject]@{
    target = $target.ToString()
    wrongGlyph = $glyph
    file = $fileName
  }

  $inkPen.Dispose()
  $guidePen.Dispose()
  $dashPen.Dispose()
  $baselinePen.Dispose()
  $dividerPen.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

$manifestPath = Join-Path $resolvedOutput 'manifest.json'
$manifestJson = $manifest | ConvertTo-Json -Depth 4
[System.IO.File]::WriteAllText(
  $manifestPath,
  $manifestJson,
  [System.Text.UTF8Encoding]::new($false)
)

[pscustomobject]@{
  output = $resolvedOutput
  boards = (Get-ChildItem -LiteralPath $resolvedOutput -Filter '*.png').Count
  manifest = $manifestPath
} | ConvertTo-Json -Compress
