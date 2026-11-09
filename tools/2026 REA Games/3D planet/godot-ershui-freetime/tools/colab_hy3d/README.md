# Colab G4：參考圖 → 3D 模型（Hunyuan3D-2，免費替代 Tripo）

2026-11-08 二水小行星 v4 用這套做了 10 棟（每棟約 40–60 秒，含安裝一次約 10 個運算單位以內）。

1. **參考圖**：`gen_refs_codex_example.py`（Codex CLI 畫正面 3/4 視角、灰底、英文佔位招牌字）。
2. **開 Colab 並安裝**（Git Bash 先 `export MSYS_NO_PATHCONV=1`）：
   ```
   colab new -s planet3d --gpu G4
   colab exec -s planet3d -f setup.py --timeout 2400
   ```
   setup.py 會釘版本：`transformers==4.48.3 diffusers==0.31.0 huggingface_hub<0.30`（Colab 內建 5.x 會載入失敗）。
3. **上傳圖片**到 `/content/in/<id>.png`，上傳 `gen.py` 到 `/content/gen.py`。
4. **生成**：`colab exec -s planet3d -f run.py --timeout 3000`（run.py 用 subprocess 另開 python，避免 Jupyter 核心的舊 Pillow 衝突；輸出 `/content/out*.zip`）。
5. **下載＋關機**：`colab download -s planet3d /content/out7.zip out.zip`、`colab stop -s planet3d`。
6. **縮貼圖**：`python -I tools/shrink_glb_texture.py in.glb assets/models/bld_<id>.glb 512 1.15`（3.6 MB → 0.6 MB；最後一個數字是亮度）。
