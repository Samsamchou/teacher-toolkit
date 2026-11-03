# 影片 4〈Families〉定案紀錄

- 2026-11-03 老師「影片 4 定案」：正式版 `renders/video4-families-v1.1.mp4`（8:26，15,194 格，1080p）＋`video4-families-v1.1-720p.mp4`（25 MB）。影音檔與圖片不進 Git。
- 出處 SF3 U01 Families（四年級）；規格卡 `2026 AI ANIMATED VIDEO/rdq/RDQ-spec-video4-families-20261103.md`、`sci-fi-teachers/rdq/RDQ-spec-video4-ipa-spoken-20261103.md`；腳本 Google 文件 1o0UIM0AncmkdPXBRDLTWWAh5T5Jk_S3aoHSl-Bby24U。
- 單字：father (dad)、mother (mom)、grandfather (grandpa)、grandmother (grandma)、brother、sister。句型：He's my ___. / She's my ___. / It's me.
- 段落：01 開場全家福 → 02 字尾 -er → 03 有聲 th → 04 短母音（grand 的 a、sister 的 i、mother／brother 的 o＝/ʌ/、father 的 a＝/ɑ/）→ 05 六個單字（拆音再合起、跟唸兩輪、短稱、中文）→ 06 句型（He's 藍、She's 粉＋男女圖示）→ 07 Emma 剪紙動畫介紹家人（8 句）→ 08 猜猜看 → 09 複習與片尾。
- 素材：Emma 一家 7 人原創（Codex 生圖，不照課本）、客廳場景、Emma 4 個說話姿勢＋斜臉嘴型（`gen_family_art.py`、`mouth_variants.py`、手動嘴位 `talk-art/cut/cut.json`）。新畫面程式在 `family_board.py`，`render_v1.py` 由影片 3 複製後修補。
- 發音只用老師錄音：ref-er-1、dg-th-voiced、short-a-1、short-i-1、short-u-1、short-o-1（/ɑ/）。
- 配音修正（TTS_FIX）：Fa/Mo/Bro... ther → Fah/Muh/Bruh；"letter I, in sister"。
- 版本：v1（8:27）→ v1.1：中文台詞裡的 KK 音標被 TTS 唸成「斜線」，3 句改成在音標處拆句、插老師錄音一次（vis 標「句中」，前後留 0.25 秒），字幕仍顯示音標；第 3 句改「像短 o 的音」。影片 1–3 已檢查，台詞沒有音標。
