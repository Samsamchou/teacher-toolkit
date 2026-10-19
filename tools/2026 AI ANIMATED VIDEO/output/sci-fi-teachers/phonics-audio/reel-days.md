# 七個星期單字：發音試聽帶 v4

開頭是 a/e/i/o/u 短母音（老師提供的音檔），接著每個星期單字先播重點母音，再播完整單字（美式真人錄音），最後是組合音。時間為試聽帶內的秒數。

| 時間 | 單字 | 播放內容 | 檔案 |
|---|---|---|---|
|   0.0s | 短母音 | short a /æ/（老師音檔） | short-a-1 |
|   1.0s | 短母音 | short e /ɛ/（老師音檔） | short-e-1 |
|   2.0s | 短母音 | short i /ɪ/（老師音檔） | short-i-1 |
|   3.0s | 短母音 | short o /ɑ/（老師音檔） | short-o-1 |
|   4.0s | 短母音 | short u /ʌ/（老師音檔） | short-u-1 |
|   6.4s | Sunday | u /ʌ/（老師音檔 short u） | short-u-1 |
|   7.4s | Sunday | ay /eɪ/（字母名 A） | En-us-A_upper |
|   9.2s | Sunday | 完整單字 | En-us-Sunday |
|  12.0s | Monday | o 唸 /ʌ/（老師音檔 short u） | short-u-1 |
|  12.9s | Monday | ay /eɪ/（字母名 A） | En-us-A_upper |
|  14.8s | Monday | 完整單字 | En-us-Monday |
|  17.4s | Tuesday | ue /uː/（美式單字 blue） | En-us-blue |
|  18.7s | Tuesday | ay /eɪ/ | En-us-A_upper |
|  20.6s | Tuesday | 完整單字 | En-us-Tuesday |
|  23.3s | Wednesday | e /ɛ/（老師音檔 short e） | short-e-1 |
|  24.3s | Wednesday | ay /eɪ/ | En-us-A_upper |
|  26.2s | Wednesday | 完整單字 | En-us-Wednesday |
|  28.9s | Thursday | th /θ/（老師音檔 th voiceless） | dg-th-voiceless |
|  30.6s | Thursday | ur /ɝ/（美式單字 er） | En-us-er |
|  31.9s | Thursday | ay /eɪ/ | En-us-A_upper |
|  33.8s | Thursday | 完整單字 | En-us-Thursday |
|  36.7s | Friday | i /aɪ/（字母名 I） | En-us-I |
|  37.9s | Friday | ay /eɪ/ | En-us-A_upper |
|  39.7s | Friday | 完整單字 | En-us-Friday |
|  42.4s | Saturday | a /æ/（老師音檔 short a） | short-a-1 |
|  43.4s | Saturday | ur /ɚ/（美式單字 er） | En-us-er |
|  44.7s | Saturday | ay /eɪ/ | En-us-A_upper |
|  46.6s | Saturday | 完整單字 | En-us-Saturday |
|  49.3s | 組合音 | wh（老師音檔） | dg-wh |
|  50.5s | 組合音 | sh /ʃ/（老師音檔） | dg-sh |
|  51.9s | 組合音 | th /θ/ 無聲（老師音檔） | dg-th-voiceless |
|  53.6s | 組合音 | th /ð/ 有聲（老師音檔） | dg-th-voiced |
|  55.0s | 組合音 | ph /f/（老師音檔） | dg-ph |
|  57.0s | 組合音 | ch /tʃ/（老師音檔） | dg-ch |

## 音檔來源
- 短母音 a/e/i/o/u：老師提供（`references/[a|e|i|o|u].mp3`，每檔唸兩次，取第一次；第二次存為 `short-<v>-2.wav` 備用）。
- 組合音 wh、sh、th（無聲／有聲）、ph、ch：老師提供（`references/[wh].mp3` 等，每檔一次）。
- 其他：維基共享資源（見 `sources.json`；CC BY-SA 3.0 需在片尾標註作者與授權）。
- 本機 ffmpeg 9.0.1 解舊 Ogg 會截斷，Commons 檔已改用 libsndfile 解碼（`process_audio.py`）。
