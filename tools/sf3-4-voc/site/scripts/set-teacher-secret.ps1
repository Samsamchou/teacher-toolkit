$ErrorActionPreference = "Stop"

try {
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
  $Host.UI.RawUI.WindowTitle = "Set SF3-SF4 teacher access code"
} catch {
  # The secure prompt still works even if this host cannot set its title.
}

$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot

Write-Host "Firebase project: sf3sf4voc" -ForegroundColor Cyan
Write-Host "Enter the teacher access code. Your input will stay hidden." -ForegroundColor Yellow
$secureValue = Read-Host "Teacher access code" -AsSecureString
$secretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureValue)

try {
  $plainValue = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPointer)
  if ([string]::IsNullOrWhiteSpace($plainValue)) {
    throw "The teacher access code cannot be empty."
  }

  $npmPath = (Get-Command npm.cmd -ErrorAction Stop).Source
  $processInfo = New-Object System.Diagnostics.ProcessStartInfo
  $processInfo.FileName = $npmPath
  $processInfo.Arguments = "exec --yes firebase-tools -- functions:secrets:set teacher --data-file - --project sf3sf4voc"
  $processInfo.WorkingDirectory = $projectRoot
  $processInfo.UseShellExecute = $false
  $processInfo.RedirectStandardInput = $true
  $processInfo.CreateNoWindow = $false

  $secretProcess = New-Object System.Diagnostics.Process
  $secretProcess.StartInfo = $processInfo
  [void]$secretProcess.Start()
  $secretProcess.StandardInput.Write($plainValue)
  $secretProcess.StandardInput.Close()
  $secretProcess.WaitForExit()
  if ($secretProcess.ExitCode -ne 0) {
    throw "Firebase Secret setup failed with exit code $($secretProcess.ExitCode)."
  }

  Write-Host "The teacher access code is safely stored in Firebase Secret." -ForegroundColor Green
} finally {
  $plainValue = $null
  if ($secretPointer -ne [IntPtr]::Zero) {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPointer)
  }
}

[void](Read-Host "Press Enter to close this window")
