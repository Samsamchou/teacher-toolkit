---
rdq_version: 1
edition: claude-code
task: 畫風 H 的 Blender 全部改在 Colab 跑
domain: dev
date: 2026-11-07
status: confirmed
telemetry:
  mode: lite
  rounds: 1
  questions: 3
  q4_adopted: 4
  revisions: 0
downstream: self（classroom-tabletop）
---

# RDQ 需求規格：Blender 只在 Colab 跑

## 一句話任務
感恩節課堂版（畫風 H）從現在起，所有 Blender 工作（測試單張、縮圖總表、正式渲染）都在 Colab 跑，本機不開 Blender。

## 已確認
- **1A**：工作時段 Colab G4 一直開著，**閒置 20 分鐘自動關**。
- **2A**：本機只寫程式、檢查語法、合成影片與字幕，**完全不開 Blender**。
- **3A**：一天 Colab 超過 **20 單位**先問老師。
- 採納建議：
  - ① 一鍵腳本：上傳有改的檔案 → Colab 渲染 → 下載縮圖總表。
  - ② Blender 與模型放在 Google Drive，開機時掛載（開機約 1 分鐘）。
  - ③ 測試用 Cycles 16 樣本、33% 大小；看光線用 32 樣本、50%。
  - ④ 寫進記憶與總覽 A7。

## 待確認假設
- Google Drive 放一份 Blender 5.2.2 Linux 版加模型，約 **400 MB**，位置：`我的雲端硬碟/colab-cache/blender-h/`。
- 「閒置 20 分鐘」的算法：最後一批渲染結束後，在 Colab 上開一個 20 分鐘計時；這段時間內沒有新的工作就自動 stop。
- 單位用量每批回報，並記在 HANDOFF。

## 一段式需求規格
在 **tools/2026 Thanksgiving/classroom-tabletop/** 建立 `src/colab_run.sh`，讓 Blender 只在 Colab G4 執行：
1. 第一次開機時把 Blender 和 props 放到 Google Drive 的 **colab-cache/blender-h/**，之後 drivemount 直接使用。
2. 每次只上傳有改的 src 檔案，依序渲染指定段落（測試 16 樣本 33%、看光線 32 樣本 50%、正式 64 樣本 100% 偶數格），再打包下載。
3. 每批結束後設定閒置 20 分鐘自動 stop。
4. 一天超過 20 單位先問老師。

本機不再執行 Blender。把規則寫進記憶 [[no-parallel-blender-local]] 與總覽 A7。

## 驗收條件
- [ ] 一個指令就能完成上傳、渲染、下載縮圖總表，本機沒有 Blender 程序。
- [ ] 第二次開機到能渲染 ≤ 2 分鐘。
- [ ] 閒置 20 分鐘後 Colab 自動關閉，並回報這批用了幾單位。
