"""Free Time Guess 渲染器。
單格：python render.py baseball --still 3.8 4.2 12 15 --out ../qa
全段：python render.py baseball --video --out ../renders   （30 fps 逐格截圖 → ffmpeg）
"""
import argparse, base64, pathlib, subprocess, sys
from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent


def open_page(p, seg):
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 1920, "height": 1080})
    page.on("console", lambda m: print("[console]", m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: print("[pageerror]", e))
    page.goto((HERE / "player.html").as_uri() + f"?seg={seg}&t=0")
    page.wait_for_function("window.READY === true", timeout=60000)
    return browser, page


def grab(page, t):
    # 偶爾第一格會拿到空白 PNG（33 bytes），重抓到正常為止
    for _ in range(5):
        data = page.evaluate(f"(() => {{ window.renderAt({t}); return document.getElementById('c').toDataURL('image/png'); }})()")
        png = base64.b64decode(data.split(",", 1)[1])
        if len(png) > 2000:
            return png
    raise RuntimeError(f"empty frame at t={t}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("seg")
    ap.add_argument("--still", nargs="*", type=float, default=[])
    ap.add_argument("--video", action="store_true")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--out", default=str(HERE.parent / "qa"))
    a = ap.parse_args()
    out = pathlib.Path(a.out); out.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser, page = open_page(p, a.seg)
        dur = page.evaluate("SEG.act + 6")
        for t in a.still:
            f = out / f"{a.seg}_t{t:05.2f}.png"; f.write_bytes(grab(page, t)); print("still", f)
        if a.video:
            frames = out / f"_frames_{a.seg}"; frames.mkdir(exist_ok=True)
            n = int(round(dur * a.fps))
            for i in range(n):
                (frames / f"{i:05d}.png").write_bytes(grab(page, i / a.fps))
                if i % 60 == 0:
                    print(f"frame {i}/{n}", flush=True)
            print("frames done", n)
        browser.close()


if __name__ == "__main__":
    main()
