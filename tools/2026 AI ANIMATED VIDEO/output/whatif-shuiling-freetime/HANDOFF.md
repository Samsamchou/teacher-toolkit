# What if you were Ken in Ershui? — Shuiling's Free Time｜交接

照 skill `whatif-situation-video`；規格卡 `rdq/RDQ-spec-whatif-shuiling-freetime-20261114.md`（confirmed 11/14）。
**等 Ken 版 Free Time（`output/whatif-ken-freetime/`）定案後才動工**，直接沿用它的程式（film.html 默劇舞台框、b3d_act.py Mixamo 套用、爸媽角色與聲音）。

## 進度
- 故事稿 v1（11/14）：Google 文件 https://docs.google.com/document/d/1gSvm6t3vDeT_nFfACRGVSB7fDDOfhTn1LJ2gxmv2LKI/edit ，句子改 `script/make_story.py`。等老師看稿。

- **默劇 11 段定案（11/14）**：`mime/final/<act>.mp4`；做法 `mime/make_mime.py`（Codex 首幀＋KIE Seedance；第一次 8 段 KIE 自己加道具 → 描述只寫身體與空手形狀＋STRICT 規則才空手）。KIE 共 1082.4 點。

- **2D 完成（11/14）**：film.js（叮咚開場、yourTurn()、SUF 字尾換色、結尾）＋film.html kara 支援 `suf`；配音 `src/voices.json`（51 句）；插圖 `assets/open_door.png`、`link_s01–s11.png`；默劇逐格 `renders/mime/<act>/`、音效 `mime/sfx/`。全片約 7:07，只差 3D（占位）。預覽 `renders/sl-2d-preview-v1.mp4`。

- **3D（11/14 晚）**：模型檢查 `src/b3d_check.py`（外觀、坐姿、跑步 OK；手指尖爪狀 → 不拍手特寫；Q 版手短）。`src/b3d_act.py` 沿用 Ken 版＋ALIAS＋CAM_OV。第 1 輪試渲 `style-sample/shuiling-3d-test-v1.jpg`。
  **明天先做**：`GPU=G4 python src/colab_3d.py s01,s02,s03,s06,s07,s10 30,100 20 40`（新鏡頭）→ 11 鏡整理成一張檢查圖傳老師 → 通過後一鏡一批正式渲 `bash work/run_pershot.sh s01 … s11`（約 10 單位）→ 合成全片。

## 下一步
1. 故事稿（Google 文件）：水鈴路線 11 題＋時間句＋Your turn（She ____ in her free time.、s/es 提醒、倒數 3 秒）＋Ken 念答案＋串場；開場「水鈴來 Ken 家玩」；結尾 What does YOUR friend do…?
2. KIE 水鈴版默劇：改寫 `3D planet/資料/freetime/clues/video/make_clue_video.py`（首幀＝水鈴站在同一講台、保留原造型）→ 先試拍 1 段給老師看，上限 700 點（每段約 49.2）。
3. 3D：`shuiling_softhand.glb` 先模型檢查（手掌、裙子穿模）再套 Mixamo；約 11 鏡、10–12 單位、分兩天。
