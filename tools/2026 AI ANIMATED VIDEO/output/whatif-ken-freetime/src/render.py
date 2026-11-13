"""render.py：What if you were Ken in Ershui? 2D 引擎渲染（Playwright 逐格截圖 → ffmpeg 合成＋混音）。

用法（在專案根目錄 output/whatif-ken-ershui/ 執行）：
  python src/render.py still 3.2 8.0 12.5     → renders/stills/t3.20.png …（單格檢查）
  python src/render.py sheet                  → renders/sheet.jpg（每 1 秒一格的縮圖總表）
  python src/render.py video [名稱]           → renders/<名稱>.mp4（1080p 24fps，-16 LUFS）
每格只由時間 t 決定（engine.html 的 renderAt）。字型 Comic Relief；工作暫存在 C 槽 %TEMP%。
"""
import sys, json, glob, os, pathlib, threading, http.server, functools, subprocess, shutil, tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
FPS = 24


def load_lines():
    lines = {}
    for f in glob.glob(str(ROOT / "audio" / "*" / "*.json")):
        d = json.loads(pathlib.Path(f).read_text(encoding="utf-8"))
        d["dur"] = d["words"][-1]["t1"]
        lines[pathlib.Path(f).stem] = d
    return lines


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


PAGE = "film.html"
OPTS = {"kara": True}


def open_page(p):
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(ROOT)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": 1920, "height": 1080})
    pg.on("pageerror", lambda e: print("PAGEERROR", e, flush=True))
    pg.add_init_script("window.LINES = " + json.dumps(load_lines()) + "; window.OPTS = " + json.dumps(OPTS) + ";")
    pg.goto(f"http://127.0.0.1:{srv.server_address[1]}/{PAGE}")
    pg.evaluate("window.ready")
    pg.wait_for_timeout(300)
    return srv, b, pg


def shoot(pg, t, path, jpg=False):
    pg.evaluate(f"window.renderAt({t})")
    if jpg:
        pg.screenshot(path=str(path), type="jpeg", quality=93)
    else:
        pg.screenshot(path=str(path))


def mix_audio(seg_audio, dur, out_wav):
    """SEG.audio：[檔案, 開始秒, 音量 dB, (長度秒)] → 一條混好的 48k 立體聲。"""
    cmd, filt = ["ffmpeg", "-v", "error", "-y"], []
    for i, a in enumerate(seg_audio):
        f, start, db = a[0], a[1], a[2]
        if len(a) > 4 and a[4] == "loop":
            cmd += ["-stream_loop", "-1"]
        cmd += ["-i", str(ROOT / f)]
        trim = f"atrim=0:{a[3]}," if len(a) > 3 else ""
        ms = int(round(start * 1000))
        duck = ""
        if len(a) > 5 and a[5]:   # 背景音樂閃避：[[開始, 結束], …] 這段時間音量降到 0.25（約 -12 dB），前後 0.4 秒漸變
            g = "*".join(f"(1-0.75*clip(min((t-{s0 - start:.2f})/0.4,({s1 - start:.2f}-t)/0.4),0,1))" for s0, s1 in a[5])
            duck = f"volume='{g}':eval=frame,"
        filt.append(f"[{i}]aresample=48000,aformat=channel_layouts=stereo,{trim}volume={db}dB,{duck}adelay={ms}|{ms}[a{i}]")
    n = len(seg_audio)
    filt.append("".join(f"[a{i}]" for i in range(n)) + f"amix=inputs={n}:normalize=0,atrim=0:{dur}[m]")
    cmd += ["-filter_complex", ";".join(filt), "-map", "[m]", str(out_wav)]
    subprocess.run(cmd, check=True)


def main():
    from playwright.sync_api import sync_playwright
    global PAGE
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if "--nokara" in sys.argv: OPTS["kara"] = False          # 聽力版：不出卡拉 OK 字幕
    if "--seg" in sys.argv: PAGE = "engine.html"             # 舊的第 1 段試片引擎
    sys.argv = [sys.argv[0]] + args
    mode = sys.argv[1]
    out = ROOT / "renders"; out.mkdir(exist_ok=True)
    with sync_playwright() as p:
        srv, b, pg = open_page(p)
        seg = pg.evaluate("({dur: window.SEG.dur, audio: window.SEG.audio})")
        if mode == "still":
            (out / "stills").mkdir(exist_ok=True)
            for t in sys.argv[2:]:
                shoot(pg, float(t), out / "stills" / f"t{float(t):05.2f}.png")
            print("stills ->", out / "stills")
        elif mode == "sheet":
            tmp = pathlib.Path(tempfile.mkdtemp(prefix="wk_sheet_"))
            step = float(os.environ.get("SHEET_STEP", "1"))
            ts = [x * step + step / 2 for x in range(int(seg["dur"] / step))]
            for i, t in enumerate(ts):
                shoot(pg, t, tmp / f"s{i:03d}.jpg", jpg=True)
            cols = 8 if len(ts) > 40 else 5
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", "1", "-i", str(tmp / "s%03d.jpg"),
                            "-vf", f"scale=480:-1,drawtext=fontfile='C\\:/Windows/Fonts/arial.ttf':text='%{{n}}':x=8:y=8:fontsize=28:fontcolor=yellow:box=1:boxcolor=black@0.6,tile={cols}x{-(-len(ts) // cols)}",
                            "-frames:v", "1", str(out / "sheet.jpg")], check=True)
            shutil.rmtree(tmp)
            print("sheet ->", out / "sheet.jpg", "(格號＝秒數，每格取 x.5 秒)")
        elif mode == "video":
            name = sys.argv[2] if len(sys.argv) > 2 else "s01-trial"
            tmp = pathlib.Path(tempfile.mkdtemp(prefix="wk_frames_"))
            nf = int(round(seg["dur"] * FPS))
            for i in range(nf):
                shoot(pg, i / FPS, tmp / f"f{i:05d}.jpg", jpg=True)
                if i % 480 == 0:
                    print(f"frame {i}/{nf}", flush=True)
            wav = tmp / "mix.wav"
            mix_audio(seg["audio"], seg["dur"], wav)
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", str(FPS), "-i", str(tmp / "f%05d.jpg"), "-i", str(wav),
                            "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18",
                            "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest", str(out / f"{name}.mp4")], check=True)
            shutil.rmtree(tmp)
            print("video ->", out / f"{name}.mp4")
        elif mode == "preview":
            # 只輸出有改的段落：python src/render.py preview <名稱> 18.5-24 53.31-59.11 …（全片秒數），各段直接接起來
            name, ranges = sys.argv[2], [tuple(map(float, r.split("-"))) for r in sys.argv[3:]]
            tmp = pathlib.Path(tempfile.mkdtemp(prefix="wk_prev_")); k = 0
            for a, b_ in ranges:
                for i in range(int(round(a * FPS)), int(round(b_ * FPS))):
                    shoot(pg, i / FPS, tmp / f"f{k:05d}.jpg", jpg=True); k += 1
            wav = tmp / "mix.wav"; mix_audio(seg["audio"], seg["dur"], wav)
            parts = "".join(f"[0]atrim={int(round(a * FPS)) / FPS}:{int(round(b_ * FPS)) / FPS},asetpts=PTS-STARTPTS,afade=t=in:d=0.08,afade=t=out:st={(int(round(b_ * FPS)) - int(round(a * FPS))) / FPS - 0.12}:d=0.12[p{j}];" for j, (a, b_) in enumerate(ranges))
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(wav), "-filter_complex", parts + "".join(f"[p{j}]" for j in range(len(ranges))) + f"concat=n={len(ranges)}:v=0:a=1[o]",
                            "-map", "[o]", str(tmp / "prev.wav")], check=True)
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-framerate", str(FPS), "-i", str(tmp / "f%05d.jpg"), "-i", str(tmp / "prev.wav"),
                            "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-vf", "scale=1280:-2",
                            "-c:a", "aac", "-b:a", "160k", "-shortest", str(out / f"{name}.mp4")], check=True)
            shutil.rmtree(tmp)
            print("preview ->", out / f"{name}.mp4", f"({k / FPS:.1f}s)")
        b.close(); srv.shutdown()


if __name__ == "__main__":
    main()
