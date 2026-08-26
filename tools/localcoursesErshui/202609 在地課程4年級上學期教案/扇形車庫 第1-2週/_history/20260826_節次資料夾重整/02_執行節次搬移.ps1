[CmdletBinding()]
param(
    [string]$ProjectRoot = 'G:\我的雲端硬碟\teacher-toolkit\tools\localcoursesErshui',
    [string]$UnitRelativePath = '202609 在地課程4年級上學期教案\扇形車庫 第1-2週'
)

$ErrorActionPreference = 'Stop'

$project = (Resolve-Path -LiteralPath $ProjectRoot).Path
$unit = (Resolve-Path -LiteralPath (Join-Path $project $UnitRelativePath)).Path
$audit = Split-Path -Parent $PSCommandPath
$manifestPath = Join-Path $audit '01_搬移前清冊與目標對照.csv'
$journalPath = Join-Path $audit '02_搬移執行日誌.csv'
$summaryPath = Join-Path $audit '02_搬移執行摘要.json'

if (-not $unit.StartsWith($project + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Unit path is outside project root: $unit"
}
if (-not (Test-Path -LiteralPath $manifestPath -PathType Leaf)) {
    throw "Missing manifest: $manifestPath"
}

$records = @(Import-Csv -LiteralPath $manifestPath)
if ($records.Count -ne 402) {
    throw "Manifest must contain 402 records; found $($records.Count)."
}

$currentFiles = @(Get-ChildItem -LiteralPath $unit -File -Recurse -Force)
$currentBytes = [int64](($currentFiles | Measure-Object Length -Sum).Sum)
if ($currentFiles.Count -ne 402 -or $currentBytes -ne 1078552307) {
    throw "Preflight inventory changed: files=$($currentFiles.Count), bytes=$currentBytes."
}

$plannedTargets = @{}
foreach ($record in $records) {
    $source = [System.IO.Path]::GetFullPath((Join-Path $unit $record.OriginalRelativePath))
    $target = [System.IO.Path]::GetFullPath((Join-Path $unit $record.TargetRelativePath))
    $unitPrefix = $unit + [System.IO.Path]::DirectorySeparatorChar
    if (-not $source.StartsWith($unitPrefix, [System.StringComparison]::OrdinalIgnoreCase) -or
        -not $target.StartsWith($unitPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Path escapes unit root: $($record.OriginalRelativePath)"
    }
    if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
        throw "Missing source file: $source"
    }
    $sourceItem = Get-Item -LiteralPath $source
    if ([int64]$sourceItem.Length -ne [int64]$record.Length) {
        throw "Length changed: $($record.OriginalRelativePath)"
    }
    if ($source -ne $target) {
        if (Test-Path -LiteralPath $target) {
            throw "Target already exists: $target"
        }
        if ($plannedTargets.ContainsKey($target.ToLowerInvariant())) {
            throw "Duplicate target: $target"
        }
        $plannedTargets[$target.ToLowerInvariant()] = $true
    }
}

$moved = [System.Collections.Generic.List[object]]::new()
try {
    foreach ($record in $records) {
        $source = [System.IO.Path]::GetFullPath((Join-Path $unit $record.OriginalRelativePath))
        $target = [System.IO.Path]::GetFullPath((Join-Path $unit $record.TargetRelativePath))
        if ($source -eq $target) {
            continue
        }
        $targetParent = Split-Path -Parent $target
        if (-not (Test-Path -LiteralPath $targetParent)) {
            New-Item -ItemType Directory -Path $targetParent -Force | Out-Null
        }
        Move-Item -LiteralPath $source -Destination $target -ErrorAction Stop
        $moved.Add([pscustomobject]@{
            OriginalRelativePath = $record.OriginalRelativePath
            TargetRelativePath = $record.TargetRelativePath
            Length = [int64]$record.Length
            SHA256 = $record.SHA256
        })
    }
} catch {
    $moveError = $_
    $rollback = [System.Collections.Generic.List[object]]::new()
    for ($index = $moved.Count - 1; $index -ge 0; $index--) {
        $entry = $moved[$index]
        $source = Join-Path $unit $entry.OriginalRelativePath
        $target = Join-Path $unit $entry.TargetRelativePath
        try {
            $sourceParent = Split-Path -Parent $source
            if (-not (Test-Path -LiteralPath $sourceParent)) {
                New-Item -ItemType Directory -Path $sourceParent -Force | Out-Null
            }
            Move-Item -LiteralPath $target -Destination $source -ErrorAction Stop
            $rollback.Add([pscustomobject]@{TargetRelativePath=$entry.TargetRelativePath; Rollback='PASS'})
        } catch {
            $rollback.Add([pscustomobject]@{TargetRelativePath=$entry.TargetRelativePath; Rollback='FAIL'; Error=$_.Exception.Message})
        }
    }
    $moved | Export-Csv -LiteralPath (Join-Path $audit '02_搬移失敗前已完成項目.csv') -NoTypeInformation -Encoding utf8 -Force
    $rollback | Export-Csv -LiteralPath (Join-Path $audit '02_失敗後回復結果.csv') -NoTypeInformation -Encoding utf8 -Force
    throw "Move failed and rollback was attempted: $($moveError.Exception.Message)"
}

Get-ChildItem -LiteralPath $unit -Directory -Recurse -Force |
    Sort-Object { $_.FullName.Length } -Descending |
    ForEach-Object {
        if (@(Get-ChildItem -LiteralPath $_.FullName -Force).Count -eq 0) {
            Remove-Item -LiteralPath $_.FullName -Force
        }
    }

$moved | Export-Csv -LiteralPath $journalPath -NoTypeInformation -Encoding utf8 -Force
$postFiles = @(Get-ChildItem -LiteralPath $unit -File -Recurse -Force)
$postBytes = [int64](($postFiles | Measure-Object Length -Sum).Sum)
$summary = [ordered]@{
    schema = 1
    completedAt = (Get-Date).ToString('yyyy-MM-ddTHH:mm:sszzz')
    unitRoot = $unit
    manifestRecords = $records.Count
    movedFiles = $moved.Count
    unchangedSharedFiles = $records.Count - $moved.Count
    postMoveFileCount = $postFiles.Count
    postMoveTotalBytes = $postBytes
}
$summary | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $summaryPath -Encoding utf8 -Force
Get-Content -LiteralPath $summaryPath -Raw -Encoding utf8
