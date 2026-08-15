# 電子語音繪本館

入口：`index.html`

正式網址：<https://ershui-storybooks.web.app/>

目前學生輸入 5 位數學號後，可選擇「學扶」「五年級」「六年級」。
「學扶」書櫃已收錄：

- Friends meet（7 頁）
- School day（12 頁）

每頁朗讀必須完整聽完兩次才會解鎖下一頁箭頭。五、六年級分類目前顯示
「繪本即將上架」提示。

## 本機預覽

```powershell
& "C:\firebase-deploy\allstorybooks\start-site.ps1"
```

預覽網址：`http://127.0.0.1:4173/`

## 更新正式網站

```powershell
& "$env:APPDATA\npm\firebase.cmd" deploy --only hosting:storybooks
```

Firebase Hosting 只發布網站成品；原始 PDF、WAV、建置腳本與聯絡表圖片均已排除。
