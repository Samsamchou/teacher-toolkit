"""一次輸出：python build.py [seg ...]（不給就全部）
每段：逐格截圖 → 音效（倒數嗶＋答案叮）→ renders/final/Qxx_<片語>.mp4
最後：renders/final/Free-Time-Guess_Q01-Q11.mp4（每段前 1.5 秒題號卡）
"""
import pathlib, subprocess, sys, shutil
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE.parent / "renders" / "final"
TMP = HERE.parent / "renders"
ORDER = [  # (題號, seg id, 檔名)
    (1, "baseball", "play-baseball"), (2, "jogging", "go-jogging"), (3, "tv", "watch-TV"),
    (4, "bike", "ride-a-bike"), (5, "music", "listen-to-music"), (6, "basketball", "play-basketball"),
    (7, "internet", "surf-the-Internet"), (8, "games", "play-online-games"), (9, "study", "study-English"),
    (10, "camping", "go-camping"), (11, "recorder", "play-the-recorder"),
]
FPS = 30
FONT = HERE / "fonts" / "ComicRelief-Bold.ttf"


def run(cmd):
    print(">", " ".join(map(str, cmd))[:160], flush=True)
    subprocess.run(cmd, check=True)


def act_of(seg):
    import re
    src = (HERE / f"seg_{seg}.js").read_text(encoding="utf-8")
    m = re.findall(r"return \{ act: (\d+(?:\.\d+)?)", src)
    return float(m[-1])


def build_segment(q, seg, name):
    act = act_of(seg)
    frames = TMP / f"_frames_{seg}"
    if frames.exists():
        shutil.rmtree(frames)
    run([sys.executable, str(HERE / "render.py"), seg, "--video", "--out", str(TMP)])
    wav = TMP / f"sfx_act{act:g}.wav"
    run([sys.executable, str(HERE / "make_sfx.py"), f"{act:g}", str(wav)])
    out = OUT / f"Q{q:02d}_{name}.mp4"
    run(["ffmpeg", "-v", "error", "-y", "-framerate", str(FPS), "-i", str(frames / "%05d.png"), "-i", str(wav),
         "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium",
         "-c:a", "aac", "-b:a", "160k", "-ar", "48000", "-ac", "2", "-shortest", "-movflags", "+faststart", str(out)])
    shutil.rmtree(frames)
    return out


def title_card(q):
    img = Image.new("RGB", (1920, 1080), (20, 15, 58))
    glow = Image.new("RGB", (1920, 1080), (0, 0, 0))
    d = ImageDraw.Draw(glow)
    d.ellipse((560, 240, 1360, 840), fill=(122, 42, 122))
    glow = glow.filter(ImageFilter.GaussianBlur(160))
    img = Image.blend(img, glow, 0.55)
    d = ImageDraw.Draw(img)
    f1 = ImageFont.truetype(str(FONT), 300)
    f2 = ImageFont.truetype(str(FONT), 64)
    txt = f"Q{q}"
    w = d.textlength(txt, font=f1)
    d.text(((1920 - w) / 2, 300), txt, font=f1, fill=(255, 255, 255))
    sub = "Watch and guess!"
    w2 = d.textlength(sub, font=f2)
    d.text(((1920 - w2) / 2, 700), sub, font=f2, fill=(255, 211, 107))
    p = TMP / f"_title_Q{q:02d}.png"
    img.save(p)
    mp4 = TMP / f"_title_Q{q:02d}.mp4"
    run(["ffmpeg", "-v", "error", "-y", "-loop", "1", "-t", "1.5", "-framerate", str(FPS), "-i", str(p),
         "-f", "lavfi", "-t", "1.5", "-i", "anullsrc=r=48000:cl=stereo",
         "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-c:a", "aac", "-b:a", "160k", "-shortest", str(mp4)])
    return mp4


def compilation():
    parts = []
    for q, seg, name in ORDER:
        f = OUT / f"Q{q:02d}_{name}.mp4"
        if not f.exists():
            print("missing", f); return
        parts += [title_card(q), f]
    lst = TMP / "_concat.txt"
    lst.write_text("".join(f"file '{p.as_posix()}'\n" for p in parts), encoding="utf-8")
    run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst),
         "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-preset", "medium",
         "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", str(OUT / "Free-Time-Guess_Q01-Q11.mp4")])


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    want = sys.argv[1:]
    for q, seg, name in ORDER:
        if want and seg not in want and want != ["compile"]:
            continue
        if want == ["compile"]:
            break
        build_segment(q, seg, name)
    if not want or want == ["compile"]:
        compilation()
