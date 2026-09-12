$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$spinRoot = Split-Path -Parent $PSScriptRoot
$spinAudioDir = Join-Path $spinRoot 'public/spin/audio'
New-Item -ItemType Directory -Path $spinAudioDir -Force | Out-Null
$speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
$speaker.SelectVoice('Microsoft Zira Desktop')
if ($speaker.Voice.Culture.Name -ne 'en-US') { throw 'American English voice required.' }
$speaker.Rate = 0
$speaker.Volume = 100
$days = @('Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday')
$phrases = @()
for ($i = 0; $i -lt 7; $i++) {
    $phrases += [pscustomobject]@{file="question-$i.wav";text="Is it $($days[$i]) today?"}
}
$phrases += [pscustomobject]@{file='answer-yes.wav';text='Yes, it is.'}
$phrases += [pscustomobject]@{file='answer-no-stem.wav';text="No, it isn't. It's..."}
try {
    foreach ($phrase in $phrases) {
        $dest = Join-Path $spinAudioDir $phrase.file
        $speaker.SetOutputToWaveFile($dest)
        $speaker.Speak($phrase.text)
        $speaker.SetOutputToNull()
        $phrase | Add-Member -NotePropertyName sha256 -NotePropertyValue ((Get-FileHash -LiteralPath $dest).Hash.ToLowerInvariant())
    }
    [pscustomobject]@{voice=$speaker.Voice.Name;locale='en-US';synthesisRate=0;playbackRate=0.8;preservesPitch=$true;created=(Get-Date).ToString('o');clips=$phrases} | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $spinAudioDir 'manifest.json') -Encoding utf8
} finally { $speaker.Dispose() }
Write-Output ('Created '+$phrases.Count+' fixed en-US WAV clips; playback uses 0.8x with pitch preservation.')
