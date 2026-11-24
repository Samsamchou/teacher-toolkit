---
rdq_version: 1
edition: claude-code
task: HWG5 U4 野生動物 Safari 數數解謎網站
domain: dev
date: 2026-11-24
status: confirmed
telemetry:
  mode: full
  rounds: 1
  questions: 4
  q4_adopted: 5
  revisions: 1
downstream: self（World Routines 架構＋godot-games＋桌上微縮 3D）
---

# RDQ 需求規格：Safari Count（HWG5 U4 How Many Koalas Are There?）

## 一句話任務
照 World Routines 的流程，做一個五年級「搭車看野生動物、解謎數動物」的英語網站，六個國家、12 題，每題最後播放 3D 桌上微縮情境動畫。

## 已確認
- 對象：HWG5 第四課（How Many Koalas Are There?）。謎底是 11 個動物複數：horses, lions, tigers, koalas, turtles, elephants, zebras, monkeys, bears, pandas, rhinos。
- 1A：謎題只解出「動物名稱」；數量由情境圖去數。
- 2B＋新加坡：六國，依 World Routines 地圖順序＝台灣 → 日本 → 肯亞 → 印度 → 新加坡 → 澳洲。
- 3B：每國 2 種動物，一共 12 題。
- 4A：答案動畫用 World Routines 桌上微縮 3D（Blender＋Tripo，只在 Colab 渲染）。
- 每站流程：國家主角問 **How many ___ are there?** → I 版主角解謎 → 拖放（How (many) ___ (koalas) (are) there? There (are) three (koalas).＋干擾選項）或口說 **There are three koalas.**（評分照 World Routines）→ 情境動畫（例：三隻無尾熊在尤加利樹上慢慢爬）。
- 網站放 talktofriends 網站的 class activities 底下（新路徑，例 **/safari-count**）。
- 解謎六大題型：T01 圖像單字加減、T02 符號替換密碼、T05 鏡像／遮擋、T07 九宮格軌跡拼字、T08 圖像代數、T12 三線索語意彙聚；12 題輪流使用，每種用 2 次。

## 已採納建議
1. 加 **3 題**單數 **There's one ___.**（老師 11/24 修訂；拖放挖空 's／is 與 one，干擾選項 are、複數字）。12 題＝9 題複數＋3 題單數。
2. 每站加課本第二句型 **Does he/she like ___? Yes, he/she does. / No, he/she doesn't.**（多一句配音、多一題拖放）。
3. 最後的小遊戲改成「數動物拍照」（Godot 新遊戲：按快門拍到正確數量）。
4. 國家主角沿用 World Routines 已做好的學生（taiwan_girl、japan_boy、kenya_girl、india_boy、singapore_girl、australia_boy），I 版主角沿用 traveler girl／boy。
5. 首頁先不放入口；老師紀錄頁照 World Routines 做一份。

## 待確認假設
- 動物分配 → 台灣（臺北市立動物園遊園車）pandas、bears（臺灣黑熊）；日本（富士 Safari 叢林巴士）lions、horses；肯亞（Nairobi 國家公園吉普車）zebras、rhinos；印度（Ranthambore／Kaziranga 吉普車）tigers、monkeys；新加坡（Night Safari 遊園車＋River Wonders）elephants、turtles；澳洲（Werribee safari 巴士＋Moonlit Sanctuary）koalas、**There's one lion.**。單數 3 題放在台灣 **There's one panda.**、肯亞 **There's one rhino.**、澳洲 **There's one lion.**（11 種動物都用到，lion 單複數各一次）。horses、turtles、monkeys 和各地是否真有乘車要再上網查證，查不到就換國家。
- 數量 → 複數題 2～9 之間不重複太多；單數題都是 1，問句仍是 How many ___ are there?（課本句型）。
- 第二句型 → 由國家主角問 I 版主角關於「車上的導遊（he/she）」喜不喜歡這種動物。
- 拖放／口說 → 照 World Routines 交錯（大約一半拖放、一半口說）。
- 動物模型 → Tripo 新建 11 種＋獅子共用；四腳動物要 Tripo「Other」綁骨架。估 11 × 約 75 點 ≈ **825 點**＋車子 3～4 台約 220 點，合計約 **1,050 點**（現在 Tripo 只剩 **20 點**，要老師加購）。Colab 每段約 2 單位，12 段約 **24 單位**＋檢查圖。每批花錢前先報。
- 配音 → edge-tts（主角聲音沿用 World Routines）。

## 本次不納入
- 2D 動畫、AI 生成短片；horses／turtles／monkeys 以外的新動物；首頁入口。

## 一段式需求規格
在 **talktofriends-6b58d** 網站新增 **/safari-count**（老師頁 **/safari-count/teacher**），流程照 World Routines：開場地圖 → 六國（台灣、日本、肯亞、印度、新加坡、澳洲）→ 每國兩題。國家主角問 How many ___ are there?，I 版主角用六大題型之一（T01、T02、T05、T07、T08、T12，各用 2 次）解出動物名稱，再數情境圖，接著拖放或口說 There are N ___.（台灣、肯亞、澳洲各一題單數 There's one ___.），然後再做一句 Does he/she like ___?。答對後播放 Blender 桌上微縮動畫，最後玩 Godot「數動物拍照」小遊戲。成績照 World Routines 存在獨立的 collection，口說每日上限沿用。動物用 Tripo 建模（約 1,050 點，先報價），渲染只在 Colab，每批先報單位。做法先出 12 題謎題總表＋對話稿給老師確認，再一站做試片，再全部做，最後比對線上、老師同意才部署（只部署需要的部分，--account u9431818）。

## 驗收條件
- [ ] 12 題謎題總表（題型、謎面、謎底、數量、干擾選項）老師確認，且每題答案唯一。
- [ ] 六國對話稿（含 Does he/she like ___?）與動物地點經網路查證，老師確認。
- [ ] 第一站（台灣）完整走完：解謎 → 拖放／口說 → 動畫 → 拍照遊戲 → 老師頁看得到紀錄。
- [ ] 全部 12 段動畫老師定案，部署後線上檔案逐位元組相同。
