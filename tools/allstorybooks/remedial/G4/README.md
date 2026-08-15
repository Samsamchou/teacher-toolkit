# 四年級學扶電子語音繪本

本資料夾保留兩本繪本的原始 PDF／音訊、切割腳本及完成的電子閱讀器。

## 已完成繪本

1. **Friends meet**
   - 原始 PDF：7 頁。
   - 完整 WAV：17.08 秒、24 kHz 單聲道。
   - 輸出位置：`public\`。
2. **School day**
   - 原始 PDF：12 頁。
   - 音訊檔雖命名為 `.wav`，實際編碼為 MP3、48 kHz 單聲道，
     解碼長度約 42.41 秒。
   - 輸出位置：`school-day\public\`。

兩本書均採用相同閱讀規則：每頁必須按喇叭並完整播放兩次；播放中無法
重複點擊，第二次播放結束後才會顯示右側箭頭。

## 開啟完整網站

```powershell
& "C:\firebase-deploy\allstorybooks\start-site.ps1"
```

網站首頁為 `C:\firebase-deploy\allstorybooks\index.html`。輸入 5 位數學號
並按 Enter 後，選擇「學扶」即可看見兩本繪本。

## 重建資產

```powershell
& "C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" `
  "C:\firebase-deploy\allstorybooks\remedial\G4\scripts\build_story_assets.py"

& "C:\Users\User\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" `
  "C:\firebase-deploy\allstorybooks\remedial\G4\school-day\scripts\build_story_assets.py"
```

## School day 句子

1. `The bell rings.`
2. `Are you ready?`
3. `Take out your book.`
4. `Raise your hand.`
5. `Put down your hand.`
6. `Come here.`
7. `Read this, please.`
8. `Put away your book.`
9. `It is break time.`
10. `Let’s play.`
11. `They run outside.`
12. `The red ball rolls away.`

## School day ImageGen 提示詞摘要

- 封面：溫暖水彩教室、橘髮黃衣男孩、雙馬尾紫色吊帶褲女孩與粉色外套
  老師；左側黑板保留標題空間；不產生圖片文字。
- 封底：相同角色在教室擊掌慶祝，老師鼓掌；保留完成訊息及按鈕空間；
  不產生圖片文字。
