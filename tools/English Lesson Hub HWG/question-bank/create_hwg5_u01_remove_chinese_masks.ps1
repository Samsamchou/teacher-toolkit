param(
    [Parameter(Mandatory = $true)]
    [string]$SourceDirectory,

    [Parameter(Mandatory = $true)]
    [string]$OutputDirectory
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$weekdayRegions = [ordered]@{
    '01_Sunday.jpg'   = [System.Drawing.Rectangle]::new(835, 610, 330, 195)
    '02_Monday.jpg'   = [System.Drawing.Rectangle]::new(845, 610, 330, 195)
    '03_Tuesday.jpg'  = [System.Drawing.Rectangle]::new(835, 610, 330, 195)
    '04_Wednesday.jpg'= [System.Drawing.Rectangle]::new(850, 610, 330, 195)
    '05_Thursday.jpg' = [System.Drawing.Rectangle]::new(820, 610, 350, 195)
    '06_Friday.jpg'   = [System.Drawing.Rectangle]::new(815, 610, 350, 195)
    '07_Saturday.jpg' = [System.Drawing.Rectangle]::new(830, 610, 340, 195)
}

$null = New-Item -ItemType Directory -Path $OutputDirectory -Force

foreach ($entry in $weekdayRegions.GetEnumerator()) {
    $sourcePath = Join-Path $SourceDirectory $entry.Key
    if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf)) {
        throw "Missing source image: $sourcePath"
    }

    $sourceImage = [System.Drawing.Image]::FromFile($sourcePath)
    try {
        $mask = [System.Drawing.Bitmap]::new(
            $sourceImage.Width,
            $sourceImage.Height,
            [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
        )
        try {
            $graphics = [System.Drawing.Graphics]::FromImage($mask)
            try {
                $graphics.Clear([System.Drawing.Color]::White)
                $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
                $transparentBrush = [System.Drawing.SolidBrush]::new(
                    [System.Drawing.Color]::FromArgb(0, 255, 255, 255)
                )
                try {
                    $graphics.FillRectangle($transparentBrush, $entry.Value)
                    $topRibbonRegion = [System.Drawing.Rectangle]::new(0, 0, 175, 185)
                    $graphics.FillRectangle($transparentBrush, $topRibbonRegion)
                    $footerRegion = [System.Drawing.Rectangle]::new(
                        0,
                        1060,
                        $sourceImage.Width,
                        $sourceImage.Height - 1060
                    )
                    $graphics.FillRectangle($transparentBrush, $footerRegion)
                }
                finally {
                    $transparentBrush.Dispose()
                }
            }
            finally {
                $graphics.Dispose()
            }

            $maskName = [System.IO.Path]::GetFileNameWithoutExtension($entry.Key) + '-mask.png'
            $maskPath = Join-Path $OutputDirectory $maskName
            $stream = [System.IO.File]::Open(
                $maskPath,
                [System.IO.FileMode]::Create,
                [System.IO.FileAccess]::Write,
                [System.IO.FileShare]::None
            )
            try {
                $mask.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
            }
            finally {
                $stream.Dispose()
            }
            Write-Output $maskPath
        }
        finally {
            $mask.Dispose()
        }
    }
    finally {
        $sourceImage.Dispose()
    }
}
