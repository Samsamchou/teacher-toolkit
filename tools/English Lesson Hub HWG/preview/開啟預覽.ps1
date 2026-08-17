$ErrorActionPreference = 'Stop'

$previewUrl = 'http://127.0.0.1:4173/'
$previewRoot = Join-Path $PSScriptRoot 'dist'
$expectedTitle = 'English Lesson Hub V03 Preview'

if (-not (Test-Path -LiteralPath (Join-Path $previewRoot 'index.html'))) {
    throw "Preview build not found: $previewRoot"
}

function Test-LessonHubPreview {
    try {
        $response = Invoke-WebRequest -Uri $previewUrl -UseBasicParsing -TimeoutSec 2
        return ($response.StatusCode -eq 200 -and $response.Content.Contains($expectedTitle))
    }
    catch {
        return $false
    }
}

if (-not (Test-LessonHubPreview)) {
    $pythonCandidates = @(
        'C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe',
        (Get-Command python.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -First 1),
        (Get-Command py.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -First 1)
    ) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }

    $pythonExe = $pythonCandidates | Select-Object -First 1
    if (-not $pythonExe) {
        throw 'Python runtime not found. Please ask Codex to refresh the preview launcher.'
    }

    Start-Process -FilePath $pythonExe -ArgumentList @('-m', 'http.server', '4173', '--bind', '127.0.0.1') -WorkingDirectory $previewRoot -WindowStyle Hidden

    $ready = $false
    for ($attempt = 0; $attempt -lt 20; $attempt++) {
        Start-Sleep -Milliseconds 250
        if (Test-LessonHubPreview) {
            $ready = $true
            break
        }
    }

    if (-not $ready) {
        throw 'The local preview service did not become ready.'
    }
}

Start-Process $previewUrl
