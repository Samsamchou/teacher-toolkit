$ErrorActionPreference = "Stop"
$testAudioPath = [System.IO.Path]::Combine(
    [System.IO.Path]::GetTempPath(),
    "hwg7-q13-smoke-$([guid]::NewGuid().ToString('N')).wav"
)

try {
    Add-Type -AssemblyName System.Speech
    $synthesizer = [System.Speech.Synthesis.SpeechSynthesizer]::new()
    try {
        $synthesizer.SetOutputToWaveFile($testAudioPath)
        $synthesizer.Speak("She would like some salad.")
    }
    finally {
        $synthesizer.Dispose()
    }

    $startBody = @{
        unitId = "hwg7-sr"
        students = @("00001", "00002")
        requestId = "smoke-$([guid]::NewGuid().ToString('N'))"
    } | ConvertTo-Json -Depth 4 -Compress
    $session = Invoke-RestMethod -Uri "http://127.0.0.1:4173/api/game/start" -Method Post -ContentType "application/json" -Body $startBody

    $audioBase64 = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($testAudioPath))
    $body = @{
        questionId = "HWG7-SR-013"
        mimeType = "audio/wav"
        audioBase64 = $audioBase64
        gameSessionId = $session.gameSessionId
        turnIndex = 0
        attemptNumber = 1
        metrics = @{
            speechWindowMs = 2600
            mediumPauses = 0
            longPauses = 0
        }
    } | ConvertTo-Json -Depth 5 -Compress

    try {
        $result = Invoke-RestMethod -Uri "http://127.0.0.1:4173/api/evaluate-speech" -Method Post -ContentType "application/json" -Body $body
    }
    finally {
        $abandonBody = @{ gameSessionId = $session.gameSessionId } | ConvertTo-Json -Compress
        Invoke-RestMethod -Uri "http://127.0.0.1:4173/api/game/abandon" -Method Post -ContentType "application/json" -Body $abandonBody | Out-Null
    }
    [ordered]@{
        gameSessionId = $session.gameSessionId
        attemptId = $result.attemptId
        questionId = $result.questionId
        transcript = $result.transcript
        scores = $result.scores
        passed = $result.passed
        valid = $result.valid
        feedback = $result.feedback
        rubricVersion = $result.rubricVersion
        transcriptionModel = $result.provider.transcriptionModel
    } | ConvertTo-Json -Depth 6
}
finally {
    if (Test-Path -LiteralPath $testAudioPath) {
        Remove-Item -LiteralPath $testAudioPath -Force
    }
}
