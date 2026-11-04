"""teacher_1 用的單字音檔：老師念（成人女聲）＋孩子跟讀（童聲）。輸出 sfx/<name>.wav，場景用 sfx 名稱播放。"""
import asyncio, subprocess
from pathlib import Path
import edge_tts

ROOT = Path(__file__).resolve().parents[1]
CLIPS = {
    "w_t_turkey": ("Turkey.", "en-US-JennyNeural", "-10%"),
    "w_k_turkey": ("Turkey!", "en-US-AnaNeural", "-20%"),
    "w_t_pie": ("Pie.", "en-US-JennyNeural", "-10%"),
    "w_k_pie": ("Pie!", "en-US-AnaNeural", "-20%"),
}


async def main():
    (ROOT / "sfx").mkdir(exist_ok=True)
    for name, (text, voice, rate) in CLIPS.items():
        mp3 = ROOT / "sfx" / f"{name}.mp3"
        await edge_tts.Communicate(text, voice, rate=rate).save(str(mp3))
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(mp3), "-ac", "1", "-ar", "44100",
                        "-af", "silenceremove=start_periods=1:start_threshold=-45dB", str(mp3.with_suffix(".wav"))], check=True)
        mp3.unlink()
        print(name)

asyncio.run(main())
