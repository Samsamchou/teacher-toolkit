"""Free Time 線索音效：11 個活動各 8 秒，重點聲音大聲、背景小聲（沿用 Listen and Guess 環境音做法）。

用法：
  python -I make_clue_sfx.py gen [活動...]   # KIE Suno Sounds 生成缺少的聲音層（每層 2.5 點，出 2 段）
  python -I make_clue_sfx.py mix [活動...]   # 混成 8 秒 A／B 兩版，-16 LUFS → sfx/<活動>_A.mp3、_B.mp3
素材：sfx/layers/<活動>/<層>_<0|1>.mp3；老師提供的免費音效在 sfx/teacher/（來源見 sfx/SOURCES.md）。
"""
import os, subprocess, sys, concurrent.futures as cf
import numpy as np

sys.path.insert(0, r"G:\我的雲端硬碟\teacher-toolkit\tools\2026 AI VIDEOS SENSE BAR\kie")
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "sfx")
TEACHER = os.path.join(ROOT, "teacher")
SR = 44100
DUR = 8.0
TAIL = " Isolated single sound effect, close-up foley recording, dry, no music, no melody, no singing, no speech."
BEDTAIL = " Steady quiet background ambience, no music, no melody, no singing, no clear words."
MUSTAIL = " Instrumental only, no singing, no words."
# 每層：(提示詞 或 "teacher:<檔名>", 開始秒, 長度秒, 增益 dB, 結尾)
P = {
 "jogging": {
  "steps": ("Rhythmic jogging footsteps of one runner on a dirt park path, steady running pace, sneakers, about two steps per second.", 0, 8, 0, TAIL),
  "breath": ("Steady rhythmic heavy breathing and panting of a boy jogging, in-in-out-out breathing pattern.", 0, 8, -3, TAIL),
  "bed": ("Early morning park ambience with birds chirping softly.", 0, 8, 0, BEDTAIL)},
 "music": {
  "click": ("A single small plastic button click of a phone or music player, very short.", 0.1, 0.6, 0, TAIL),
  "song": ("Cheerful upbeat pop instrumental song heard leaking out of headphones, slightly tinny and thin, steady beat.", 0.5, 7.5, 0, MUSTAIL),
  "bed": ("Quiet living room room tone, very soft.", 0, 8, 0, BEDTAIL)},
 "baseball": {
  "crack": ("A wooden baseball bat hitting a baseball: one very loud sharp crack, then the ball flying away whoosh.", 1.2, 2.0, 2, TAIL),
  "cheer": ("A small crowd at a youth baseball game cheering and clapping excitedly after a big hit.", 2.6, 5.4, -2, " Crowd sound effect, no music, no clear words."),
  "bed": ("Outdoor baseball field ambience, light wind, distant crowd murmur.", 0, 8, 0, BEDTAIL)},
 "basketball": {
  "court": ("teacher:basketball-voices-and-surroundings-67778.mp3", 0, 8, 0, ""),
  "swish": ("A basketball dropping cleanly through a nylon net: crisp swish sound, then the ball bouncing twice on a wooden gym floor.", 5.6, 2.4, 2, TAIL)},
 "bike": {
  "bell": ("A classic bicycle bell ringing twice: ring-ring, bright metallic.", 0.3, 1.6, 2, TAIL),
  "chain": ("teacher:bike-chain-75419.mp3", 0.8, 7.2, -1, ""),
  "bell2": ("A classic bicycle bell ringing twice: ring-ring, bright metallic.", 5.6, 1.6, 2, TAIL),
  "bed": ("Quiet countryside road ambience, light breeze, a few birds.", 0, 8, 0, BEDTAIL)},
 "english": {
  "page": ("Turning the pages of a paper textbook: two or three crisp page flips.", 0.2, 1.8, 0, TAIL),
  "pencil": ("A pencil writing quickly on paper in a notebook: scratching and scribbling, short words, small pauses.", 2.0, 6.0, 0, TAIL),
  "bed": ("Quiet study room with a wall clock ticking softly.", 0, 8, 0, BEDTAIL)},
 "internet": {
  "clicks": ("Computer mouse clicking several times, then light typing on a keyboard, then more mouse clicks, scrolling wheel.", 0, 8, 0, TAIL),
  "ding": ("A soft short computer notification chime, two gentle tones.", 3.0, 1.2, -2, TAIL),
  "ding2": ("A soft short computer notification chime, two gentle tones.", 6.2, 1.2, -2, TAIL)},
 "tv": {
  "remote": ("Pressing a TV remote control button: small click and a short electronic beep, then TV channels switching quickly with short static bursts between channels.", 0, 4.0, 0, " Isolated sound effect, no music, no clear words."),
  "laugh": ("A TV sitcom studio audience laugh track, warm laughter heard from a television in a living room.", 4.0, 4.0, -2, " Sound effect, no music, no clear words."),
  "bed": ("Quiet living room room tone, very soft.", 0, 8, 0, BEDTAIL)},
 "camping": {
  "zip": ("Unzipping a camping tent door zipper slowly, long nylon zipper sound.", 0.2, 2.0, 0, TAIL),
  "fire": ("A crackling and popping campfire burning wood logs close up.", 1.5, 6.5, 0, TAIL),
  "bed": ("Night outdoors in the countryside: crickets and insects chirping steadily.", 0, 8, 0, BEDTAIL)},
 "games": {
  "keys": ("Very fast gaming keyboard key presses and rapid mouse clicking, an excited gamer playing.", 0, 8, -2, TAIL),
  "game": ("Retro video game sound effects: coin pickups, jumps, then a happy 8-bit level up jingle.", 1.0, 7.0, 0, " Video game sound effects, no singing, no speech."),
  },
 "recorder": {
  "melody": ("A child playing a simple slow children's melody on a soprano recorder (school recorder flute), three notes going down and repeating like Hot Cross Buns, breathy wooden tone.", 0, 8, 0, " Solo soprano recorder only, no other instruments, no singing."),
  "bed": ("Quiet classroom room tone, very soft.", 0, 8, 0, BEDTAIL)},
}


def gen(act):
    import kie
    d = os.path.join(ROOT, "layers", act)
    os.makedirs(d, exist_ok=True)

    def one(layer):
        txt, *_rest, tail = P[act][layer]
        if txt.startswith("teacher:") or layer.endswith("2") or os.path.exists(os.path.join(d, layer + "_0.mp3")):   # xxx2 重用 xxx 的另一段，不另花點數
            return layer, "skip"
        t = kie.create("ai-music-api/sounds", {"prompt": txt + tail, "model": "V5", "sound_loop": layer == "bed"})
        r = kie.wait(t)
        clips = (r.get("response") or {}).get("data") or []
        for i, c in enumerate(clips[:2]):
            kie.download(c["audio_url"], os.path.join(d, f"{layer}_{i}.mp3"))
        return layer, len(clips)

    with cf.ThreadPoolExecutor(5) as ex:
        for res in ex.map(one, P[act]):
            print(act, *res, flush=True)


def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def gain_to(x, target_db):
    rms = np.sqrt(np.mean(x ** 2) + 1e-12)
    return 10 ** ((target_db - 20 * np.log10(rms)) / 20)


def best_window(x, n):
    if len(x) <= n:
        return np.pad(x, (0, n - len(x)))
    e = np.convolve(x ** 2, np.ones(SR // 10), "same")
    cs = np.concatenate([[0], np.cumsum(e)])
    starts = np.arange(0, len(x) - n, SR // 20)
    s = starts[np.argmax(cs[starts + n] - cs[starts])]
    return x[s:s + n]


def fade(x, a=0.03, b=0.2):
    na, nb = min(int(a * SR), len(x) // 4), min(int(b * SR), len(x) // 4)
    if na: x[:na] *= np.linspace(0, 1, na)
    if nb: x[-nb:] *= np.linspace(1, 0, nb)
    return x


def mix(act):
    d = os.path.join(ROOT, "layers", act)
    for tag, v in (("A", 0), ("B", 1)):
        out = np.zeros(int(SR * DUR), np.float32)
        for layer, (txt, st, ln, db, _t) in P[act].items():
            if txt.startswith("teacher:"):
                f = os.path.join(TEACHER, txt[8:])
            elif layer.endswith("2"):
                f = os.path.join(d, f"{layer[:-1]}_{1 - v}.mp3")
            else:
                f = os.path.join(d, f"{layer}_{v}.mp3")
                if not os.path.exists(f):
                    f = os.path.join(d, f"{layer}_0.mp3")
            seg = best_window(load(f), int(ln * SR))
            if layer == "bed":
                seg = seg * gain_to(seg, -36)
            else:
                act_s = seg[np.abs(seg) > 0.05 * (np.abs(seg).max() + 1e-9)]
                seg = seg * gain_to(act_s if len(act_s) > SR // 20 else seg, -16 + db)
            seg = fade(seg.astype(np.float32))
            i = int(st * SR)
            out[i:i + len(seg)] += seg[: len(out) - i]
        out = fade(out, 0.05, 0.5)
        tmp = os.path.join(d, f"_tmp_{tag}.f32")
        out.tofile(tmp)
        dst = os.path.join(ROOT, f"{act}_{tag}.mp3")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", tmp,
                        "-af", "loudnorm=I=-16:TP=-1.5:LRA=18", "-ar", str(SR), "-ac", "2", "-b:a", "160k", dst],
                       check=True)
        os.remove(tmp)
        print("mixed", dst, flush=True)


if __name__ == "__main__":
    cmd, acts = sys.argv[1], (sys.argv[2:] or list(P))
    for a in acts:
        (gen if cmd == "gen" else mix)(a)
