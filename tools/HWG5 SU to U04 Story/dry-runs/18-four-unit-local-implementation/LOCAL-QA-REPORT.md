# 四單元本機實作與 QA 報告

日期：2026-08-27

## 核准與範圍

- 教師核准語句：`確認內容`
- 模式：`extend-existing`
- 固定目標：`hwg5-su-to-u04-story`
- 寫入單元：HWG7 U02（8 句）、HWG7 U03（8 句）、HWG7 U04（9 句）、HWG5 U04（9 句），共 34 句。
- 正規化已套用：`You’re`／`We’re`／`o’clock`／`doesn’t` 改為現站 tokenizer 相容的 ASCII 引號。

本次授權只允許本機來源實作。沒有部署、GitHub push、Firebase 配額變更、學生紀錄搬移／回寫／刪除或保存政策變更。

## 實際變更

- `public/index.html`
  - 新增四個 `allPracticeData` key：`HWG7-U02`、`HWG7-U03`、`HWG7-U04`、`HWG5-U04`。
  - 每句保留 `id / en / zh / focus / ssml` 欄位。
  - 新增 52 個不重複的必要字典提示；字典目前共 156 個 key，重複 key 為 0。
  - 未改動評分公式、結構化 JSON、App Check、TTS callable、每日三次、`reading_records` 或七個月到期日程式。
- `tests/content-data.test.js`
  - 新增四單元句數、英文、中文、ASCII 引號、SSML 與字典提示回歸測試。

## SHA-256

| 檔案 | 實作前 | 實作後 |
|---|---|---|
| `public/index.html` | `ab382ae5d1683e2174135115c769715411fc54b3dfa21dd67acdd6746eb678dd` | `a39a98a13a21d554d32f2353795dc44b8c7450c8a5d964a065a0a02c14762a37` |
| `tests/content-data.test.js` | `a10a7e3a84b2a2e8207c67333f4a9398037f65f16479343be8466b1e42c90800` | `da335e813546ae8b45934277776f7cf5526285322ac9447495b792a90e38e296` |

下列保護檔案雜湊未變：

- `public/ai-scoring.js`：`ed3be9e7aab88cbd2a1c4af40d4ba43e564e51917bcfe62318982b2b15458d8f`
- `public/ai-scoring-core.js`：`e16f797d345f5cd1de96539c0b065517cc5acfa92c103fd9154b0ccec2f7bd92`
- `functions/index.js`：`a8a6c00c576f80505d5e01e55c92d55bfede252a76da2afe1a240e563c563e04`
- `firebase.json`：`257ed2a4d06d6281d5b27824ef83f24977f3b78004882e56878826192b583edc`
- `firestore.indexes.json`：`da839572e06f9b9f3ec881e0d1bcf3b7d0c08cfa7f82cc02e9f8d1f218904f43`

## 自動與瀏覽器 QA

- Node 測試：20/20 通過，0 fail。
- 四個題庫區塊：句數分別為 8、8、9、9；SSML 數相同；彎引號命中 0。
- 字典：156 個 key；重複 key 0。
- 本機 HTTP：首頁回應 200。
- 本機瀏覽器：四個新 key 均載入；HWG7 U02、U03、U04 與 HWG5 U04 的按鈕切換 active 狀態均成功。
- 瀏覽器 console error：0。僅有既存 Tailwind CDN production 警告，非本次內容變更造成。
- 敏感資料：硬編碼 App Check debug token 0、私鑰標記 0。既存 localhost 邏輯只設定 debug 模式旗標，不保存實際 token 值。

## 尚未執行

- 未接受瀏覽器麥克風權限，因此未進行真人錄音、逐句 TTS 聽讀或 AI 語音評分校準。
- 未登入 Firebase Console，未測 production App Check／TTS／寫入流程。
- 未部署、未讀回正式網址、未建立雲端備份、未 commit 或 push。

若要進入部署前審核，仍需教師另行明確回覆 `確認正式部署`；執行前必須先顯示專案 ID、網址、模型、實際總題數、理論用量、保存期限與預計變更清單。
