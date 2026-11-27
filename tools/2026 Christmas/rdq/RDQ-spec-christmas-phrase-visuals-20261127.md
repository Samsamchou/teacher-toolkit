---
rdq_version: 1
edition: claude-code
task: 每個片語都有畫面＋關鍵字慢動作特寫
domain: video
date: 2026-11-27
status: confirmed
telemetry:
  mode: full
  rounds: 1
  questions: 4
  q4_adopted: 4
  revisions: 0
downstream: self（畫風 K 引擎；H3 走 hwg-sentence-film-h3）
---

# RDQ 需求規格：聖誕方塊繪本「片語 × 畫面」改版

## 一句話任務
依老師回饋，把 24 句拆成片語，每個片語都有動作、插入畫面或關鍵字慢動作特寫，讓學生只看畫面就懂句意；單字卡不擋臉。

## 已確認（老師 11/27 回饋）
- 第 2 句 Santa 單字卡擋到水鈴的臉 → 單字卡不能擋臉。
- 第 3 句 a big snowstorm／blew away／Christmas things 都要有畫面或動作。
- map、candy cane 這類關鍵字要慢動作特寫特效。
- 其他句子比照辦理；檢查哪些句子適合 Colab H3。
- 逐句表 v2：`script/逐句片語畫面_v2.md`。
- 沿用：每句 2 鏡以上、說話句 6／11／23 用 H3（先試 23、上限 10 單位）、每 2 幕交逐句抽格表。

## 訪談結果
- 時間：配音照常唸，句子之間多留 **2–3 秒**做慢動作特寫，全片約 **5 分鐘**（1A）。
- 慢動作特寫：8 個指定單字＋學生可能不懂的具體名詞，約 20 個（2A）。
- 抽象片語：3D 動作演出，關鍵處加 2D 小箭頭／小圖示（3C）。
- H3：第 **3、6、11、23** 句（4B，第 3 句＝Santa 在北極親口唸求救信）。

## 已採納建議
1. 單字卡自動避開人臉（每格算臉的位置，挑空角落）。
2. 統一慢動作特效包：背景壓暗、物件放大旋轉、金色光框、0.4 倍慢動作＋「叮」。
3. 關鍵字物件旁加小英文標籤（例：map、coat）。
4. 先重做第 1–2 幕（第 1–6 句）當樣本，老師看過再做其他句。

## 待確認假設
- 慢動作特寫清單（23 個）：**Ershui School、a letter、Santa、a big snowstorm、map、warm coat、backpack、a candy cane、ice door、a star、purple light、tunnel、a snowman、deep snow、a gift、red ribbon、pine tree、a reindeer、cabin、fireplace、a stocking、red coat、Christmas tree**（23 個，老師可刪）。
- 第 3 句做法：H3 Santa 在北極院子說「Help!」（第 1 鏡）→ 本機程式暴風雪捲走聖誕物品（a big snowstorm／blew away／my Christmas things，Santa 的聲音持續）→ 句後慢動作看東西飛走。
- H3 共 4 鏡：開機約 1.5＋4×1.3 ≈ **6.7 單位**；上限維持 **10 單位**（含重拍），超過先問。先試第 23 句，方塊造型沒跑掉才做 3、6、11。
- 片長變長後配樂照樣 −18 dB、整片 −16 LUFS；2D 朗讀版的節奏之後另算，不受 3D 版慢動作影響。

## 本次不納入
- 換模型（Fable 5.2）；KIE Seedance；Blender Colab。

## 一段式需求規格
依 **script/逐句片語畫面_v2.md** 重做聖誕方塊繪本 3D 版，每個片語都有 3D 動作，抽象片語（blew away、everywhere、above、loud、deep）另加 2D 小箭頭或小圖示；約 **23 個**關鍵字（8 個指定單字＋map、warm coat 等具體名詞）在句子之間多留 **2–3 秒**做統一的慢動作特效包（背景壓暗、放大旋轉、金色光框、0.4 倍、叮聲、物件旁小英文標籤），全片約 **5 分鐘**；單字卡每格自動避開人臉。說話句第 **3、6、11、23** 句用 **Colab H3**（第 3 句 Santa 在北極唸信，接本機暴風雪畫面），先試第 23 句，H3 共約 6.7 單位、上限 **10 單位**。先重做第 **1–2 幕（第 1–6 句）**當樣本，交逐句抽格表＋720p 預覽給老師，核准後才做第 3–8 幕。

## 驗收條件
- [ ] 逐句抽格表每個片語都對到一格畫面，老師逐句打勾。
- [ ] 每個關鍵字都有慢動作特寫，物件在畫面中央、清楚可辨。
- [ ] 單字卡、字幕都不擋任何角色的臉。
