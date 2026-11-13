# 畫風 I 樣張（2026-11-13）
- `sample-A-title.png` 片名畫面；`sample-B-oneword.png` 第 1 段＋一次一個字大字幕；`sample-C-karaoke.png` 第 1 段＋整句卡拉 OK＋中文句意。
- 素材：Codex CLI 生成（`assets/p_ken.txt`、`p_bg.txt`；參考圖＝小行星 `listen-3clues/video/stage_ken.png`、`generated-images/buildings/station.png`）。Ken 綠幕去背 `src/cutout.py`。
- 合成：`src/sample.html`（光束、雨、散景、HUD、字幕都是程式畫）＋`src/render.py`（Playwright）。工作副本在 `C:\Users\User\whatif-ken-work\`（Codex 不能寫 G 槽）。
- 版面規則：Ken 與字幕都在 y 835 以上（重點物件不放下方 1/4）。
