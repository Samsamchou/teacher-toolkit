# REA 影片分析與使用說明（2026-10-23）

來源：`YT/` 三支影片（本機 faster-whisper small.en 轉逐字稿，存於 `transcripts/`；口音辨識可能有錯字）
＋ REA 官方 repo https://github.com/morluto/rea（README、docs/installation.md、DISCLAIMER.md）。

## 一、三支影片重點

| 影片 | 長度 | 示範對象 | 重點 |
|---|---|---|---|
| How To ACTUALLY Reverse Engineer Anything (REA + Claude Code)（youtu.be/7rhIiGmXv8s） | 10:06 | Notion 桌面版 → 自寫「資料庫＋會議筆記」網頁 | 安裝只要把 repo 網址貼給 Claude Code；**四條規則**；只用在自己擁有、有權檢視的 App |
| This Viral Open Source Repo Lets Claude Clone ANYTHING（youtu.be/6MpHBHw30OE） | 9:10 | Wispr Flow（Electron＋原生小程式） | REA 的**四步驟**運作：提問 → 拆解對應工具（Ghidra 27 分鐘找到 5.6 萬個函式；JS 分析 7 分鐘）→ 問答取證 → 寫新程式；每個結論標 seen／inferred／unknown |
| I Reverse Engineered Mario 64 to Make My Own Game（youtu.be/o8LjTSvza0E） | 22:21 | Super Mario 64 的移動系統 → 自製「Super Mach 64」 | 只取**移動數值與手感**（單／二段／三段跳、側翻、後空翻、跳遠、滑行），**沒用任天堂任何素材或程式碼**；原創角色與劇情；Godot；3 關＋1 魔王 |

### Mario 64 影片的實際成本（影片自述）
- 準備需求文件約 5 小時，製作 2 天多，同時跑 7–10 個 agent。
- 用掉 Claude Max ×20 約 1.3 週額度，約 60 億 tokens，若照 API 計價約 2,600 美元。
- 3D／圖片素材另花 100 美元（Higgsfield API：Tripo 類 3D 模型 182 個、圖片 168 張）。
- 作者自評：第 2、3 關素材不足，動畫仍有問題，只是原型。

## 二、REA 是什麼

- 全名 Reverse Engineer Anything，是給 AI agent 用的 **MCP 伺服器＋技能（skill）＋CLI**，MIT 授權，npm 套件 `rea-agents`。
- 它讓 Claude 檢視「沒有原始碼的成品」（執行檔、Electron／JS、.NET、Android APK、網站、HAR、**Godot PCK**、IL2CPP 等），回報「這功能怎麼運作＋證據在哪＋哪些不確定」，再由 Claude 寫**自己的新程式**。
- 分析原生執行檔需要另外裝 Ghidra（免費，要 Java）或 IDA／Hopper；REA 不會幫你裝。Hopper 不支援 Windows，Ghidra 在 Windows 屬實驗性。
- 官方免責聲明明列**不協助**：破解 DRM／授權、遊戲作弊、**複製專有軟體或重製其受保護的程式碼與素材**。

## 三、REA 怎麼用（四條規則＋四步驟）

**四條規則（影片 1）**
1. 一次一個功能，不要叫它「整個複製」。
2. 先在原 App 裡實際用過那個功能（REA 只看得到電腦上真的有的程式）。
3. 一定要它附證據，避免亂猜。
4. 讀它「查不出來」的清單，那就是你要測試的地方。

**四步驟（影片 2）**：提問 → 拆解與建圖 → Claude 與 REA 一問一答取證 → 產出說明並寫新實作。

**提示詞範例**：「用 REA 看 Notion 桌面版的資料庫怎麼運作，附證據，再做一個我自己的簡單網頁版。」

## 四、本機安裝紀錄（2026-10-23）

- 環境：Windows 11、Node v24.13.1（符合 ≥24.11）、npm 11.8.0；npm 最新版 `rea-agents@6.7.0`。
- 先預覽：`npx -y rea-agents@6.7.0 setup --client claude_code --dry-run`
- 安裝：`npx -y rea-agents@6.7.0 setup --client claude_code --yes`
  - 在 `C:\Users\User\.claude.json` 加入 `mcpServers.rea`（備份：`C:\Users\User\.claude.json.rea.backup`）
  - 技能裝在 `C:\Users\User\.claude\skills\reverse-engineer-anything`
- 結果：doctor `healthy: true`；Ghidra／IDA／JADX 未裝（要分析原生執行檔時才需要）。
- **要重開 Claude Code** 後 REA 的 MCP 工具才會出現在新對話裡。
- 移除：`npx -y rea-agents@6.7.0 uninstall`（加 `--purge-data` 一併清 `~/.rea`）。

## 五、對本專案的意義

- 「做 Mario 64」在法律上只能走影片 3 的路線：**學手感、不搬素材**。角色、造型、名稱、音樂、關卡外觀都要原創，否則不能公開給學生使用。
- REA 對我們最直接的用途：檢查自己匯出的 Godot `.pck`（例如確認哪些大檔被打包進去，有助於縮小 iPad 下載量）、研究自己擁有的軟體功能。
