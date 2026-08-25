param(
    [Parameter(Mandatory = $true)]
    [string]$Source,

    [Parameter(Mandatory = $true)]
    [string]$Destination,

    [Parameter(Mandatory = $true)]
    [string]$ManifestPath
)

$ErrorActionPreference = "Stop"

$canonicalDestination = [IO.Path]::GetFullPath(
    "G:\我的雲端硬碟\teacher-toolkit\tools\localcoursesErshui"
).TrimEnd("\")
$sourceRoot = [IO.Path]::GetFullPath($Source).TrimEnd("\")
$destinationRoot = [IO.Path]::GetFullPath($Destination).TrimEnd("\")
$manifestFullPath = [IO.Path]::GetFullPath($ManifestPath)

if ($destinationRoot -ne $canonicalDestination) {
    throw "Destination must be the confirmed canonical path: $canonicalDestination"
}
if (-not (Test-Path -LiteralPath $sourceRoot -PathType Container)) {
    throw "Source directory does not exist: $sourceRoot"
}
if ($manifestFullPath -notlike "$sourceRoot\*") {
    throw "Manifest must be stored inside the source project."
}

$excludedDirectoryNames = @(
    ".git",
    ".npm-cache",
    ".firebase",
    ".vinext",
    ".wrangler",
    ".claude",
    ".codex",
    ".venv",
    "node_modules",
    "work",
    "tmp",
    "__pycache__",
    "dist",
    "firebase-dist",
    "outputs",
    "coverage",
    "out"
)

function Get-RelativePath([string]$FullName) {
    return $FullName.Substring($sourceRoot.Length).TrimStart("\").Replace("\", "/")
}

function Test-IncludedFile([IO.FileInfo]$File) {
    $relative = Get-RelativePath $File.FullName
    $segments = $relative -split "/"
    foreach ($segment in $segments[0..([Math]::Max(0, $segments.Length - 2))]) {
        if ($excludedDirectoryNames -contains $segment) {
            return $false
        }
    }

    $name = $File.Name
    $nameLower = $name.ToLowerInvariant()
    if ($File.FullName -eq $manifestFullPath) { return $false }
    if ($name.StartsWith("~$")) { return $false }
    if ($nameLower -in @("desktop.ini", "thumbs.db", ".ds_store")) { return $false }
    if ($nameLower -match "^\.env" -and $nameLower -notmatch "\.example$") { return $false }
    if ($File.Extension.ToLowerInvariant() -in @(".log", ".tsbuildinfo", ".tmp", ".pem", ".key")) { return $false }
    if ($nameLower -match "^credentials\." -or $nameLower -match "credentials.*\.json$") { return $false }
    return $true
}

if (Test-Path -LiteralPath $destinationRoot) {
    $existing = Get-ChildItem -LiteralPath $destinationRoot -Force | Select-Object -First 1
    if ($null -ne $existing) {
        throw "Destination is not empty; refusing to overwrite: $destinationRoot"
    }
} else {
    New-Item -ItemType Directory -Path $destinationRoot -Force | Out-Null
}

$files = @(
    Get-ChildItem -LiteralPath $sourceRoot -File -Recurse -Force |
        Where-Object { Test-IncludedFile $_ } |
        Sort-Object FullName
)

$manifestDirectory = Split-Path -Parent $manifestFullPath
New-Item -ItemType Directory -Path $manifestDirectory -Force | Out-Null

$manifest = foreach ($file in $files) {
    [PSCustomObject]@{
        RelativePath = Get-RelativePath $file.FullName
        Bytes = $file.Length
        SHA256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
    }
}
$manifest | Export-Csv -LiteralPath $manifestFullPath -NoTypeInformation -Encoding UTF8

foreach ($item in $manifest) {
    $sourceFile = Join-Path $sourceRoot ($item.RelativePath.Replace("/", "\"))
    $destinationFile = Join-Path $destinationRoot ($item.RelativePath.Replace("/", "\"))
    $destinationDirectory = Split-Path -Parent $destinationFile
    New-Item -ItemType Directory -Path $destinationDirectory -Force | Out-Null
    Copy-Item -LiteralPath $sourceFile -Destination $destinationFile
}

$destinationManifest = Join-Path $destinationRoot (Get-RelativePath $manifestFullPath).Replace("/", "\")
New-Item -ItemType Directory -Path (Split-Path -Parent $destinationManifest) -Force | Out-Null
Copy-Item -LiteralPath $manifestFullPath -Destination $destinationManifest

$mismatches = @()
foreach ($item in $manifest) {
    $destinationFile = Join-Path $destinationRoot ($item.RelativePath.Replace("/", "\"))
    if (-not (Test-Path -LiteralPath $destinationFile -PathType Leaf)) {
        $mismatches += "missing:$($item.RelativePath)"
        continue
    }
    $actual = Get-FileHash -LiteralPath $destinationFile -Algorithm SHA256
    if ($actual.Hash.ToLowerInvariant() -ne $item.SHA256) {
        $mismatches += "hash:$($item.RelativePath)"
    }
}

$sourceManifestHash = (Get-FileHash -LiteralPath $manifestFullPath -Algorithm SHA256).Hash.ToLowerInvariant()
$destinationManifestHash = (Get-FileHash -LiteralPath $destinationManifest -Algorithm SHA256).Hash.ToLowerInvariant()
if ($sourceManifestHash -ne $destinationManifestHash) {
    $mismatches += "hash:migration manifest"
}
if ($mismatches.Count -gt 0) {
    throw "Migration verification failed: $($mismatches -join ', ')"
}

$unexpected = @(
    Get-ChildItem -LiteralPath $destinationRoot -File -Recurse -Force |
        ForEach-Object { $_.FullName.Substring($destinationRoot.Length).TrimStart("\").Replace("\", "/") } |
        Where-Object { $_ -ne (Get-RelativePath $manifestFullPath) -and $_ -notin $manifest.RelativePath }
)
if ($unexpected.Count -gt 0) {
    throw "Unexpected destination files: $($unexpected -join ', ')"
}

[PSCustomObject]@{
    Source = $sourceRoot
    Destination = $destinationRoot
    PayloadFiles = $manifest.Count
    PayloadBytes = ($manifest | Measure-Object -Property Bytes -Sum).Sum
    ManifestRelativePath = Get-RelativePath $manifestFullPath
    ManifestSHA256 = $sourceManifestHash
    HashMismatches = $mismatches.Count
    UnexpectedFiles = $unexpected.Count
} | ConvertTo-Json -Depth 3
