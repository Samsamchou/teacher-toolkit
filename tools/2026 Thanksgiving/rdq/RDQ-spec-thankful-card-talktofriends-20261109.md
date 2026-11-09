# RDQ 規格卡：Write a Thankful Card 上 talktofriends 網站

- status: confirmed
- 日期：2026-11-09
- 模式：Lite（程式／部署）

## 一段式需求規格
把已完成的感恩例句聆聽網頁（`2026 Thanksgiving/thankful-listen`）放上 Firebase 網站 talktofriends-6b58d，成為 festivals 分類裡的第二個活動「Write a Thankful Card」，網址 `/festivals/write-a-thankful-card/`。學生在 iPad 上不登入、聽完 35 句並用 ⭐ 標記，再抄到紙本 A4 卡片上。只部署 hosting，不動 Monster in My Mind 的雲端功能與規則。取代原本的 GitHub Pages 方案。

## 已確認
1. **寫卡片（1A）**：紙本。網頁只負責聽、標記、整理句子；學生抄到印好的 A4 卡片。
2. **登入（2A）**：不登入。進度只存在該台 iPad 的 localStorage，不收任何學生資料。
3. **位置（3A）**：festivals 頁面，排在 Monster in My Mind 旁邊，新增第二張活動卡片。
   - 卡片內容：🦃 **Write a Thankful Card**／Listen, pick, and write. / 聽、選、寫感恩卡。
4. **建議採納**：
   - ① 頁面最下方用小字放老師下載區：學生卡 A4、示範卡 A3、詞語庫 A4 三份 PDF。
   - ② 只部署 hosting（`firebase deploy --only hosting --account u9431818@gmail.com`）。部署前先比對線上版和本機版，確認不會把 Monster 尚未 commit 的改動一起推上線。
   - ③ 音檔、音效、圖片設長效快取（`firebase.json` headers）。
   - ④ 原稿只留一份：正式原稿留在 `thankful-listen`，用複製腳本放進網站的 `public/festivals/write-a-thankful-card/` 再 build。

## 本次不納入
- 建議⑤：網頁上填空的完成卡（因為第 1 題選紙本）。
- GitHub Pages 的大資料夾排除設定（`_config.yml`）：先不做，repo 維持原樣。

## 待確認假設
- 活動卡片的 emoji 和副標題用上面寫的文字。
- 聆聽頁左上角加一個「← festivals」回上一頁的連結，其他畫面不變。
- 網站其他部分（首頁、Monster、老師後台）完全不改。
- 上線後檢查：在電腦和 iPad 尺寸下確認網頁、音檔、圖片、PDF 都打得開；Monster 頁面照常運作。
