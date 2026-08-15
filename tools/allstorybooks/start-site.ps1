$ErrorActionPreference = "Stop"

$siteDirectory = $PSScriptRoot
$port = 4173
$codexPython = Join-Path $env:USERPROFILE ".cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
$python = $null

if (Test-Path -LiteralPath $codexPython) {
    $python = $codexPython
} else {
    $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
    if ($pythonCommand) {
        $python = $pythonCommand.Source
    }
}

if (-not $python) {
    throw "Python was not found. Open index.html directly instead."
}

$listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
if (-not $listener) {
    $serverProcess = @{
        FilePath = $python
        ArgumentList = @("-m", "http.server", "$port", "--bind", "127.0.0.1", "--directory", $siteDirectory)
        WindowStyle = "Hidden"
    }
    Start-Process @serverProcess
    Start-Sleep -Milliseconds 700
}

Start-Process "http://127.0.0.1:$port/"
