param([string]$OutputRoot = (Join-Path $PSScriptRoot '../../generated-assets/mastery-feedback-20261001'))
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$engine = New-Object System.Speech.Synthesis.SpeechSynthesizer
try {
  $voice = $engine.GetInstalledVoices() | Where-Object { $_.Enabled -and $_.VoiceInfo.Culture.Name -eq 'en-US' -and $_.VoiceInfo.Name -match 'Zira' } | Select-Object -First 1
  if (-not $voice) { throw 'Expected installed en-US Zira voice not available.' }
  $engine.SelectVoice($voice.VoiceInfo.Name)
  $engine.Volume = 100
  New-Item -ItemType Directory -Path $OutputRoot -Force | Out-Null
  foreach ($cue in @(@{Name='try-again'; Text='Try again!'}, @{Name='great'; Text='Great!'})) {
    $path = Join-Path $OutputRoot ($cue.Name + '.wav')
    if (Test-Path -LiteralPath $path) { throw 'Voice source already exists; preserve it and choose a new destination.' }
    $engine.SetOutputToWaveFile($path)
    $engine.SpeakSsml('<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US"><prosody rate="-3%" pitch="+10%">' + $cue.Text + '</prosody></speak>')
    $engine.SetOutputToNull()
    [pscustomobject]@{File=$cue.Name + '.wav'; Text=$cue.Text; Engine='System.Speech.Synthesis'; Voice=$voice.VoiceInfo.Name; Sha256=(Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLower(); GeneratedAt=(Get-Date).ToUniversalTime().ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath ($path + '.json') -Encoding UTF8
    Get-Item -LiteralPath $path | Select-Object Name,Length
  }
} finally { $engine.Dispose() }
