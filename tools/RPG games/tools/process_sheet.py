"""把 Codex 生的 4×4 精靈圖切格、去背、對齊，輸出遊戲用的透明 webp。

用法：python tools/process_sheet.py <原始.png> <輸出.webp> [--cell 256] [--debug 資料夾]

做法：
1. 均分 4×4 切格。
2. 去背：rembg（isnet-anime）抓角色本體 → 不透明；
   本體以外用「白色轉透明」保留光效、星星的半透明感。
3. 對齊：角色有粗黑輪廓、光效沒有，所以用深色輪廓像素找
   「腳底基準線」與「身體水平中心」，把每格放到同一個錨點，播放才不會跳。
   整格都沒有輪廓（例如消失的光點）就沿用原本位置。
"""
import argparse
from pathlib import Path

import numpy as np
from PIL import Image
from rembg import new_session, remove

SESSION = None


def cut_alpha(cell: Image.Image) -> Image.Image:
    global SESSION
    if SESSION is None:
        SESSION = new_session("isnet-anime")
    rgb = np.asarray(cell.convert("RGB")).astype(np.float32)
    mask = np.asarray(remove(cell.convert("RGB"), session=SESSION, only_mask=True)).astype(np.float32) / 255
    # 白色轉透明：離白色越遠越不透明
    c2a = (255 - rgb.min(axis=2)) / 255
    c2a = np.clip((c2a - 0.04) / 0.96, 0, 1)
    alpha = np.maximum(mask, c2a)
    # 本體外的半透明像素去掉白色成分，避免白邊
    a = np.maximum(c2a, 1e-3)[..., None]
    unwhite = np.clip((rgb - 255 * (1 - a)) / a, 0, 255)
    body = (mask > 0.5)[..., None]
    color = np.where(body, rgb, unwhite)
    alpha = drop_edge_fragments(alpha)
    # 邊緣 14px 漸隱：越界被切的光效不會留下硬直線
    h, w = alpha.shape
    f = 14
    ramp_x = np.clip(np.minimum(np.arange(w), np.arange(w)[::-1]) / f, 0, 1)
    ramp_y = np.clip(np.minimum(np.arange(h), np.arange(h)[::-1]) / f, 0, 1)
    alpha = alpha * ramp_y[:, None] * ramp_x[None, :]
    out = np.dstack([color, alpha * 255]).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def drop_edge_fragments(alpha: np.ndarray) -> np.ndarray:
    """刪掉碰到格子邊緣的小塊（鄰格角色或光效越界的碎片），保留最大的本體。"""
    from scipy import ndimage
    lab, n = ndimage.label(alpha > 0.08)
    if n == 0:
        return alpha
    sizes = ndimage.sum(np.ones_like(alpha), lab, range(1, n + 1))
    main = int(np.argmax(sizes)) + 1
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    kill = np.isin(lab, [i for i in edge if i != main])
    alpha = alpha.copy()
    alpha[kill] = 0
    return alpha


def anchor(rgba: np.ndarray):
    """回傳 (中心 x, 腳底 y)；找不到輪廓回傳 None。"""
    rgb, a = rgba[..., :3].astype(int), rgba[..., 3]
    dark = (rgb.max(axis=2) < 70) & (a > 200)
    ys, xs = np.nonzero(dark)
    if len(xs) < 50:
        return None
    return float(np.median(xs)), float(np.percentile(ys, 99.5))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("out")
    ap.add_argument("--cell", type=int, default=256)
    ap.add_argument("--debug")
    ap.add_argument("--rows", type=int, default=4)
    ap.add_argument("--cols", type=int, default=4)
    args = ap.parse_args()

    sheet = Image.open(args.src).convert("RGB")
    W, H = sheet.size
    cw, ch = W / args.cols, H / args.rows
    cells, anchors = [], []
    for r in range(args.rows):
        for c in range(args.cols):
            box = (round(c * cw), round(r * ch), round((c + 1) * cw), round((r + 1) * ch))
            rgba = cut_alpha(sheet.crop(box))
            cells.append(rgba)
            anchors.append(anchor(np.asarray(rgba)))
            print(f"cell r{r+1}c{c+1} anchor={anchors[-1]}")

    # 目標錨點：所有格的中位數，再縮放到輸出格大小
    found = [a for a in anchors if a]
    tx = float(np.median([a[0] for a in found]))
    ty = float(np.median([a[1] for a in found]))
    src_cell = int(round(min(cw, ch)))
    scale = args.cell / src_cell
    out = Image.new("RGBA", (args.cell * args.cols, args.cell * args.rows), (0, 0, 0, 0))
    # 水平：第 1 列（待機）逐格對齊；其他列整列平移（以最後一格「回到站姿」為準），保留衝刺位移
    row_dx = []
    for r in range(args.rows):
        row = anchors[r * args.cols:(r + 1) * args.cols]
        ref = next((a for a in reversed(row) if a), None)
        dx = tx - ref[0] if ref else 0
        # 夾住位移：整列內容不能被推出格子（避免腳或光效被切掉）
        lo, hi = -1e9, 1e9
        for img in cells[r * args.cols:(r + 1) * args.cols]:
            xs = np.nonzero(np.asarray(img)[..., 3].max(axis=0) > 20)[0]
            if len(xs):
                lo = max(lo, -xs[0])
                hi = min(hi, img.size[0] - 1 - xs[-1])
        row_dx.append(float(np.clip(dx, lo, hi)) if lo <= hi else 0.0)
    for i, (img, a) in enumerate(zip(cells, anchors)):
        r = i // args.cols
        if a:
            dx = (tx - a[0]) if r == 0 else row_dx[r]
            dy = ty - a[1]          # 腳底每格都貼齊地面
        else:
            dx, dy = row_dx[r], 0
        canvas = Image.new("RGBA", img.size, (0, 0, 0, 0))
        canvas.alpha_composite(img, (int(round(dx)), int(round(dy))))
        # 預乘透明度後再縮圖，避免半透明光效發灰
        canvas = canvas.convert("RGBa").resize((args.cell, args.cell), Image.LANCZOS).convert("RGBA")
        r, c = divmod(i, args.cols)
        out.alpha_composite(canvas, (c * args.cell, r * args.cell))
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    out.save(args.out, "WEBP", quality=90, method=6)
    print("saved", args.out, out.size, f"{Path(args.out).stat().st_size//1024} KB")
    if args.debug:
        d = Path(args.debug)
        d.mkdir(parents=True, exist_ok=True)
        bg = Image.new("RGBA", out.size, (60, 70, 110, 255))
        bg.alpha_composite(out)
        bg.convert("RGB").save(d / (Path(args.out).stem + "_check.png"))


if __name__ == "__main__":
    main()
