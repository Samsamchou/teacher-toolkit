"""make_cand.py：爸媽聲音候選試聽檔 → audio/_cand/voices-mom-dad.mp3（旁白先報「Mom A」再念第 1／2 段問句）。"""
import asyncio, json, pathlib, subprocess, edge_tts
here = pathlib.Path(__file__).parent; cfg = json.loads((here / "voices.json").read_text(encoding="utf-8"))
out = here.parent / "audio" / "_cand"; out.mkdir(parents=True, exist_ok=True)
async def say(text, voice, pitch, f, rate="-20%"):
    for _ in range(4):
        try: await edge_tts.Communicate(text, voice, rate=rate, pitch=pitch).save(str(f)); return
        except Exception: await asyncio.sleep(3)
async def main():
    parts = []
    for who, key in (("mom", "s01_ask"), ("dad", "s02_ask")):
        for k, (v, p) in cfg["candidates"][who].items():
            lab = out / f"lab_{who}{k}.mp3"; f = out / f"{who}_{k}.mp3"
            await say(f"{'Mom' if who == 'mom' else 'Dad'}, voice {k}.", "en-US-JennyNeural", "+0Hz", lab, "+0%")
            await say(cfg["lines"][key][1], v, p, f); parts += [lab, f]
    lst = out / "list.txt"; sil = out / "sil.mp3"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", "0.8", "-c:a", "libmp3lame", str(sil)], check=True)
    lst.write_text("".join(f"file '{p.name}'\nfile 'sil.mp3'\n" for p in parts), encoding="utf-8")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-ar", "24000", "-ac", "1", "-c:a", "libmp3lame", "-b:a", "96k", str(out / "voices-mom-dad.mp3")], check=True)
    print("->", out / "voices-mom-dad.mp3")
asyncio.run(main())
