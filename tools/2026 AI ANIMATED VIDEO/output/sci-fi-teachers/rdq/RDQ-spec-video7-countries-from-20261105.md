# RDQ 規格卡｜影片 7〈Countries — I'm from ___.〉（confirmed）

- 日期：2026-11-05
- 狀態：**confirmed**（2026-11-05 老師：1B 2A 3A、建議全採；朋友改為各自不同聲音，試聽 v1「聲音可以」）
- 出處：翰林 HWG7（六年級上學期）U01 Target Language A「Listen, Say, and Number」Countries（老師截圖，含手寫音節底線、大寫圈、補充 Korea／Vietnam、the USA = United States of America）
- 位置：放在影片 6〈Is she from India?〉之前上課
- 程式起點：複製 `video4-families/`（單字＋帶唸流程）＋影片 6 的 `world_board.py`、國旗、十位朋友照片卡

## 老師的選擇

- 1B：長度 **7–9 分鐘**
- 2A：教 **拍音節＋重音**（每個國名拍一次手）
- 3A：**十位朋友用自己的照片卡自我介紹**（Hi! I'm Mia. I'm from Australia.），最後換學生說 I'm from Taiwan.
- 建議 ①②③④⑤ 全部採用

## 目標

學生看完能：
1. 唸出 10 個國名，拍出音節、唸對重音。
2. 知道國名第一個字母大寫、the UK／the USA 要加 the。
3. 用 I'm from ___. 介紹自己，用 He's from ___.／She's from ___. 介紹別人。

## 內容

| 類別 | 內容 |
|---|---|
| 國名（8＋2） | Australia, India, Japan, Singapore, Spain, Taiwan, the UK, the USA, Korea, Vietnam |
| 音節＋重音 | 例：Aus-TRA-li-a（4）、IN-di-a（3）、Ja-PAN（2）、SIN-ga-pore（3）、SPAIN（1）、Tai-WAN（2）、the U-K（2）、the U-S-A（3）、Ko-RE-a（3）、Viet-NAM（2）；音節數與重音照字典核對後再寫腳本 |
| 補充 | the USA = the United States of America、the UK = the United Kingdom |
| 句型 | I'm from ___. → He's from ___.／She's from ___.（I'm = I am、He's = He is、She's = She is） |

## 建議段落（約 8 分鐘）

1. 開場：Nova、Cosmo＋十位朋友照片卡飛進來
2. 十個國名：國旗＋照片卡，Repeat after me 兩輪
3. 拍音節＋重音：國名切成音節塊、重音塊放大，拍手音效＋拍手圖示，學生跟著拍
4. 大寫與 the：第一個字母發光；the UK、the USA；全名
5. I'm from ___.：十位朋友輪流自我介紹（照片卡＋字卡），學生跟唸；最後「Now you! I'm from Taiwan.」
6. He's from ___.／She's from ___.：老師指著朋友介紹，男生藍 He's、女生粉 She's
7. Game time：看國旗說國名（4 題）＋聽 I'm from ___. 找人（3 題）
8. 複習＋預告下一支〈Is she from India?〉

## 待確認假設

- 朋友的聲音：2026-11-05 老師改為「每位朋友不同聲音」（取代建議④）。試聽 v1 `video7-countries/voice-test/friends-audition-v1.mp3`：
  Mia＝en-AU-Natasha +30Hz、Raj＝en-IN-Prabhat +50Hz、Yuki＝en-US-Jenny +35Hz、Wei＝en-SG-Wayne +50Hz、Sofia＝en-IE-Emily +30Hz、
  Kai＝en-HK-Sam +50Hz、Lily＝en-GB-Maisie（童聲）、Tom＝en-US-Eric +50Hz、Jisu＝en-NZ-Molly +30Hz、Nam＝en-PH-James +50Hz（老師 2026-11-05 試聽通過）。
- 拍手聲用程式音效（不用 AI 生成），音節塊、重音由程式畫。
- 沿用十位朋友的名字：Mia, Raj, Yuki, Wei, Sofia, Kai, Lily, Tom, Jisu, Nam。
- 不另生新圖（0 元）；如果拍手需要老師姿勢，先用現有 P07 比讚／P02 揮手，不做新 Tripo 姿勢。

## 影片 6 連動（建議①②⑤）

- 影片 6 開場改成「Remember our ten friends?」，只重做那幾句配音。
- 影片 6 的「from＝來自」段縮短（約省 30 秒）。
- 影片 6 試片 B（對話段兩處修正）已重渲，給老師看。

## 限制與規則

- 語速 0.8×；"Repeat after me."；AI 圖不能有字；國旗用 Wikimedia Commons 官方版。
- 全部本機渲染；每關先給老師看；影音不入庫、不 push。

## 驗收

規格卡 → 腳本（Google 文件）→ 配音試聽 → 抽格 → 60–90 秒試片 → 全片 v1 → 老師說「定案」。

## 進度

- 2026-11-05：資料夾 `video7-countries/`（複製影片 6 程式、國旗、照片卡）；腳本 `script_v1.py`（推估約 8.8 分鐘）。
  Google 文件腳本：1ieRhES5REFc9Xpopc3dUhWW2HZF4xyD3d8DT3QZEiwA。拍音節 TTS 拼法 `SYL_TTS`（全大寫會被拼成字母；Australia 用 Awss），
  試聽 `voice-test/syllables-audition-v2.mp3` 已傳。**等老師看腳本、聽拍音節**。
- 2026-11-05 晚：腳本與拍音節 v3（Vietnam＝Vi-et-NAM 三拍，老師指正）都通過。配音 v1 9:28（`voice_v1.mp3` 已傳；比規格 7–9 分鐘多 28 秒，等老師決定要不要刪）。
  build_voice 加十位朋友聲音（FRIEND）、拍音節 TTS_FIX、程式拍手（每音節一聲、重音大聲，時間取字詞邊界）。
  踩坑：en-IN Prabhat 把「I'm Raj」唸成 I am（Aim 又會變 /eɪm/）→ TTS 寫成「I'm, Raj」。**等老師聽配音**。
- 2026-11-05 晚：配音 v1 9:28 老師「通過，不用刪」。畫面：render_v1.py 的 board_v7＋world_board.py（clap_board 拍音節方塊、merge_word I am→I'm、big_flag、find_board 四選一不放國旗）。
  試片 A（拍音節 2:30–4:00）、B（朋友自我介紹 4:46–5:31）720p 已傳。**等老師看試片**。影片 6 試片也在等老師看。
- 踩坑（2026-11-05 22:40）：影片 6、7 同時渲染共用 pilot-nova/renders/segs 互相覆蓋（影片 6 session 發現並加了 `--segdir`）。
  影片 7 試片已核對沒被混到；之後影片 7 渲染一律 `--segdir "$PWD/renders/segs"`。影片 6 改由另一個 session（HWG7 U01 句型教學影片）負責。
