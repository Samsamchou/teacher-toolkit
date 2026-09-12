# 轉盤遊戲：Comic Relief、多巴胺與問答朗讀

日期：2026-09-12。依教師本輪直接修改要求；延續已確認遊戲規則。

## 修改
- 所有遊戲介面英文使用本機載入的 Comic Relief 正體／粗體。轉盤八個星期標籤及GIF標題用同字體文字層顯示，原始PNG/GIF及其雜湊保持不變。
- 粉紅、亮黃、湖水藍、橘、薄荷綠與紫色分組；深色字、粗邊框、按鈕立體陰影及亮色漸層背景。
- 1024×768的六組橫排：組名24px、分數50px、回合16px；大桌機分數依寬度放大至72px。
- 問句、Yes答句與No答句各有朗讀按鈕，標示0.8×。
- 教師已明確選擇否定答句只讀「No, it isn't. It's…」，不讀出星期；畫面仍為空格。
- 固定音源：Microsoft Zira Desktop，已讀回en-US；7個問句＋Yes答句＋No答句，共9個WAV。
- 音檔以原速合成，HTML音訊以playbackRate=0.8、preservesPitch=true播放；不同裝置使用相同音檔。切換按鈕先停止前段，靜音／離開／切換頁籤可停止播放。
- 朗讀載入／播放失敗會提示重試，不自動改用另一個聲音。

## 來源、位置
- 字型來源：[Google Fonts Comic Relief](https://github.com/google/fonts/tree/main/ofl/comicrelief)，OFL授權保存在`public/spin/fonts/OFL.txt`，兩份TTF與SHA-256位於同目錄。
- 音檔與逐句文字清冊：`public/spin/audio/manifest.json`；生成腳本：`scripts/spin-speech.ps1`。未使用付費語音API。
- 樣式：`src/spin-dopamine.css`；畫面：`src/SpinGame.jsx`；音訊控制：`src/SpinAudio.js`。
- 截圖與新功能報告：`qa/spin-redesign-20260912/`。

## 驗證與交付
- 30項程式測試通過，正式建置通過。
- 新瀏覽器測試確認Comic Relief實際載入、8個星期文字層、六組大字、三個音訊按鈕／0.8倍速／保留音高、否定答句音源、靜音停止與快速切換。
- 目視確認1024×768轉盤、問答和GIF任務；完整圖卡及右下按鈕同時可見。390px手機無橫向溢出。
- 完整遊戲回歸報告另存`full-match-report.json`；建置雜湊清冊為`build-manifest.json`。
- 預覽：http://127.0.0.1:5182/ ，選「Spin, ask, answer, do and roll」。若保留舊遊戲畫面請重新整理（會結束當前本局）。
- 本次仍為本機版，未部署／commit／push；實際教室喇叭的音色、音量與大螢幕觀看距離仍由教師試用確認。

## 當前回合辨識追加
- 教師要求後，取消固定組別底色。只有當前組別亮黃色／紫色框，每1.8秒輕微上下浮動5px；其他組別淡底色，300ms換色過渡。
- 已跑Team1→Team2→Team1並確認只有一組啟用效果；結算停止。減少動態設定保留亮色但停止浮動。
- 已保存turn-indicator.json與兩張回合截圖，正式建置通過；尚未部署。

## GIF 置中放大（2026-09-12，尚未更新正式站）
- 八個任務共用置中版面；保留完整原始 GIF，不裁切動作。
- 桌面任務區使用扣除標題、分數、進度後的剩餘高度；操作按鈕位於右下方，不擋 GIF。
- 1024×768：GIF 高 431.7 px（原約 353 px，增加約 22%）；1440×1000：634.7 px（原 525 px，增加約 21%）。
- 1024×768、1440×1000、1920×1080 驗證置中、完整圖卡與按鈕皆在畫面內。390×844 手機採上下排列，可垂直捲動，無水平溢出。
- Try again 保留任務、Good job 進入骰子、瀏覽器無執行錯誤；正式建置成功（保留既有 bundle 大小提示）。
- QA：qa/spin-task-enlarged-20260912/report.json 及四張尺寸截圖。
- 本機預覽：http://127.0.0.1:5182/ 。正式站仍為 DEPLOYMENT-20260912.md 記錄的前一版本。

### 發布狀態更新
GIF 置中放大版已於 2026-09-12 更新至正式網站 https://gamesinclass-5d9d1.web.app 。49/49 線上檔案與新版 SHA-256 一致；證據見 DEPLOYMENT-20260912.md 及 qa/spin-task-production-20260912/files.json。
