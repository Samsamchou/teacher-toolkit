---
rdq_version: 1
edition: claude-code
task: 畫風 G 扁平科普＋畫風 H Blender 微縮各一支 10 秒試片
domain: video
date: 2026-11-04
status: confirmed
telemetry:
  mode: lite
  rounds: 1
  questions: 3
  q4_adopted: 2
  revisions: 0
downstream: self
---

# RDQ 需求規格：畫風 G／H 10 秒試片

## 一句話任務
各做一支 **10 秒**英語課試片：**畫風 G 扁平科普風**（HyperFrames）與**畫風 H 桌上微縮**（Blender＋Tripo 模型），看效果決定要不要列為正式畫風。

## 已確認
- 兩種都做（1C）；H 的角色用 **Tripo 模型**（1C 補充）。
- 主題：英語課的**一個句型或一組單字**，英文標籤（2B）。
- 角色：沿用現有角色（3A）。
- 只做畫面＋**程式合成音效**，**不配音**（採納①③）。
- **安裝 HyperFrames**（`npx hyperframes`，免費開源）做 G。

## 待確認假設
- 句型 → 預設 **HWG5〈How do you go to school?〉→ "I go to school by bus."**（兩支用同一句，方便比較）。
- G 角色 → **六位學生其中一位**，重畫成扁平向量；H 角色 → **Nova**（已有 Tripo GLB，**不再花 Tripo 點數**；要新模型會先報價）。
- G 畫風參考圖 → 用今天抽的 Kurzgesagt 教學片截圖，**只在本機研究、不入庫**；不畫他們的角色或鳥。
- H 需要**安裝 Blender 5.2**（官方免費，約 400 MB）；先量本機一格幾秒再渲染全片，1080p 24fps。
- 書桌道具（玩具公車、校門、課本）用 Blender 程式建，不另生模型。
- 成品放 `output/style-pilots-20261104/g-flat-science/`、`h-tabletop/`；不 commit、不上傳。

## 已採納建議
- ① 先做 10 秒、不配音。
- ③ 程式合成音效（雨聲、公車引擎、叮聲等）。

## 本次不納入
- ② 沿用 Canvas 引擎（改用 HyperFrames）；旁白、字幕、正式長片；4K／租 GPU。

## 一段式需求規格
在 **output/style-pilots-20261104/** 做兩支 **10 秒、1080p** 試片，主題 **"I go to school by bus."**：**G** 用 **HyperFrames** 寫 HTML 動畫，以參考圖鎖畫風（配色、飽和度、發光、文字動畫），扁平向量的學生角色、夜色背景、一個紅色重點（公車）、粗體英文標籤；**H** 用 **Blender 5.2** Python 腳本，夜晚書桌微縮場景、**Nova Tripo GLB**、玩具公車開過課本、淺景深、角色每 2 格換姿勢；兩支都用 Python 合成音效。每支先給一張縮圖總表給老師看，再出 MP4。

## 驗收條件
- [ ] 兩支 MP4 各約 10 秒、1080p、有音效、無配音。
- [ ] G 看得出 Kurzgesagt 式扁平科普感，但角色是我們自己的。
- [ ] H 看得出玩具微縮＋淺景深，並記下本機每格渲染秒數。
- [ ] 報告兩條流程各花多少時間，建議是否列為正式畫風。
