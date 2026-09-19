# Unscramble 重新加入與 15 組正式部署紀錄

- 日期：2026-09-19（Asia/Taipei）
- Firebase project／Hosting site：`gamesinclass-5d9d1`
- 正式網址：https://gamesinclass-5d9d1.web.app/unscramble
- 最終版本：`2026.09.19-unscramble-rejoin.3`
- Git 基準：`dc5d32dbc4f800579dc8211d03e3f03da3578898`（未 commit、未 push）

## 部署內容

首次以精確 selector 部署：

```text
firebase deploy --only hosting,functions:classroom-games:liveActivity --project gamesinclass-5d9d1 --non-interactive
```

結果：退出碼 0。`classroom-games:liveActivity` 於 `asia-east1` 更新成功，Hosting release 成功。

最終稽核發現首頁遊戲卡仍寫「八組同步」，修正為「2–15 組同步」並將版本提升至 `.3`。重新測試與建置後只補部署 Hosting：

```text
firebase deploy --only hosting --project gamesinclass-5d9d1 --non-interactive
```

結果：退出碼 0，Hosting 上傳 3 個新檔並完成 release。未再次部署函式。

## 明確未變更

- 正式題組、場次與作答資料
- Firestore／Storage 規則
- `teacherLogin` 函式與教師通行碼設定
- Git commit／push
- C2C 訊息

## 驗證結果

- `npm test`：67／67 通過。
- `npm run build`：退出碼 0；release manifest 驗證 10 個來源檔、12 個媒體檔。
- Firebase dry-run：退出碼 0，只解析 Hosting 與 `classroom-games:liveActivity`。
- 正式 `release.json`：`2026.09.19-unscramble-rejoin.3`。
- 正式 `/unscramble`：HTTP 200，內容與建置的 `index.html` 相符。
- 安全標頭：`nosniff`、`DENY`、`strict-origin-when-cross-origin`。
- API 防線：GET 405 `METHOD_NOT_ALLOWED`；未登入教師操作 401；不存在場次 404 `ROOM_REMOVED`。
- `liveActivity`：Node.js 22、`asia-east1`、狀態 `ACTIVE`；部署後函式 hash `2a5e083225cd000debc3803f4d52ecb41a7524ea`。
- Playwright／系統 Chrome：教師 1440×1000、學生 1024×768、學生 390×844 均為 HTTP 200，無水平溢出、console error 或 page error。

## 正式 release 檔案 SHA-256

| 檔案 | SHA-256 | 結果 |
|---|---|---|
| `assets/index-Cl350Cd5.js` | `17bdaf0deb439d13ed1cf829a9c491bb61dfd68548c3c8fa9fe7820ff79bc2a0` | 一致 |
| `assets/index-Dg2jR9eU.css` | `0c64d1a1de2f3bba517cf2eb4f92429abdc10b922227d2204e94a7febe4b44c2` | 一致 |
| `index.html` | `2456fbb5688b9906ab536a0f9712644f220b6f8d63298f3225af047372e8b70f` | 一致 |
| `release.json` | `e101c2b3e16e7aa020899a43284244effaaa7cfb24562ed8e2539074bd428ec6` | 一致 |

Firebase 回報本次 Hosting 最終補部署有 3 個新檔；CSS 未改但仍一併核對。完整建置共 71 個檔案，未重新下載未變更的大型 GIF／影片。

## QA 證據

去識別化部署記錄、退出碼、正式雜湊報告、瀏覽器報告與截圖位於：

`qa/unscramble-rejoin-production-20260919/`

實體平板重登、教室跨裝置同步及音效聽感仍屬教師現場驗收；本次沒有使用正式班級資料進行寫入測試。
