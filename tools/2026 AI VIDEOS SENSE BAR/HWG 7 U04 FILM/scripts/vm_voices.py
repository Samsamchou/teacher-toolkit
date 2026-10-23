"""Run ON THE COLAB VM with the voice venv:  /content/AI/Voice/venv/bin/python vm_voices.py /content/u04
Reads <root>/shots.json + <root>/voices.json, writes <root>/voices/:
  ref_<who>.wav            one designed voice per character (VoxCPM2 voice design, fixed seed)
  <shot>_t<k>.wav          takes per line, cloned from ref_<who>.wav
  <shot>.wav               best take (English dictation closest to the script), trimmed of edge silence
  picks.json               heard text, match score, duration per line
Prints [voices] progress lines and VOICES_DONE at the end.
"""
import json, re, sys, difflib
from pathlib import Path
sys.path.insert(0, "/content/repo/tools")
from stt import _add_cuda_dll_dirs  # preloads the pip CUDA 12 libs that faster-whisper needs on Linux

ROOT = Path(sys.argv[1])
OUT = ROOT / "voices"; OUT.mkdir(parents=True, exist_ok=True)
SHOTS = json.loads((ROOT / "shots.json").read_text(encoding="utf-8"))
VCFG = json.loads((ROOT / "voices.json").read_text(encoding="utf-8"))
MODEL = "/content/AI/Voice/models/VoxCPM2"


def lines():
    for s in SHOTS["shots"]:
        if s.get("line"):
            yield s["id"], s["line"]["who"], s["line"]["text"]
        if s.get("narr"):
            yield s["id"] + "_narr", "narrator", s["narr"]


def norm(t):
    return re.sub(r"[^a-z0-9 ]", " ", t.lower().replace("'", "")).split()


def main():
    import numpy as np, soundfile as sf, torch
    from voxcpm import VoxCPM
    _add_cuda_dll_dirs()
    from faster_whisper import WhisperModel

    tts = VoxCPM.from_pretrained(MODEL, load_denoiser=False, optimize=False, device="cuda")
    sr = tts.tts_model.sample_rate
    asr = WhisperModel("large-v3", device="cuda", compute_type="float16", download_root="/content/AI/Voice/models/whisper")

    def gen(text, seed, ref=None, control=None):
        torch.manual_seed(seed)
        kw = dict(text=(f"({control}){text}" if control else text), cfg_value=2.0, inference_timesteps=10, normalize=False, denoise=False)
        if ref:
            kw["reference_wav_path"] = str(ref)
        return np.asarray(tts.generate(**kw), dtype=np.float32)

    def trim(w, thr=0.01, pad=0.08):
        idx = np.where(np.abs(w) > thr)[0]
        if len(idx) == 0:
            return w
        a, b = max(0, idx[0] - int(pad * sr)), min(len(w), idx[-1] + int(pad * sr))
        return w[a:b]

    import parselmouth

    def f0(path):
        """Median pitch in Hz of the voiced parts (to check that voices are distinguishable)."""
        p = parselmouth.Sound(str(path)).to_pitch(pitch_floor=60, pitch_ceiling=700).selected_array["frequency"]
        p = p[p > 0]
        return round(float(np.median(p)), 1) if len(p) else 0.0

    # 1) one designed reference voice per character
    refs = {}
    for who, desc in VCFG["voices"].items():
        ref = OUT / f"ref_{who}.wav"
        if not ref.exists():
            rp = VCFG.get("ref_pick", {}).get(who)
            if rp:  # try several seeds, keep the lowest / highest voice
                tries = []
                for sd in rp["seeds"]:
                    t = OUT / f"_ref_{who}_{sd}.wav"
                    sf.write(t, trim(gen(VCFG["design_text"], sd, control=desc)), sr, subtype="PCM_16")
                    tries.append((f0(t), t))
                    print(f"[voices] ref {who} seed {sd} f0={tries[-1][0]}Hz", flush=True)
                tries.sort(key=lambda x: x[0], reverse=rp.get("want") == "high")
                tries[0][1].replace(ref)
            else:
                sf.write(ref, trim(gen(VCFG["design_text"], 1000, control=desc)), sr, subtype="PCM_16")
        refs[who] = f0(ref)
        print(f"[voices] ref {who} ok f0={refs[who]}Hz", flush=True)
    (OUT / "refs_f0.json").write_text(json.dumps(refs, indent=1), encoding="utf-8")

    # 2) takes per line, cloned from the reference and steered by voice + tone; pick the take whose dictation matches best
    only = sys.argv[2:]  # optional: only redo these line ids, keep the other picks
    pf = OUT / "picks.json"
    picks = json.loads(pf.read_text(encoding="utf-8")) if (only and pf.exists()) else {}
    for sid, who, text in lines():
        if only and sid not in only:
            continue
        best = None
        control = (f"{VCFG['voices'][who]}; {VCFG.get('tone', {}).get(sid, 'natural')}"
                   if VCFG.get("line_control", {}).get(who, True) else None)
        for k in range(VCFG.get("takes", 3)):
            f = OUT / f"{sid}_t{k}.wav"
            w = trim(gen(text, 2000 + k, ref=OUT / f"ref_{who}.wav", control=control))
            sf.write(f, w, sr, subtype="PCM_16")
            segs, _ = asr.transcribe(str(f), language="en", beam_size=5)
            heard = " ".join(s.text.strip() for s in segs)
            score = difflib.SequenceMatcher(None, norm(text), norm(heard)).ratio()
            cand = dict(take=k, heard=heard, match=round(score, 3), secs=round(len(w) / sr, 2), f0=f0(f))
            if best is None or score > best["match"] or (score == best["match"] and cand["secs"] < best["secs"]):
                best = cand
        sf.write(OUT / f"{sid}.wav", sf.read(OUT / f"{sid}_t{best['take']}.wav")[0], sr, subtype="PCM_16")
        picks[sid] = dict(who=who, text=text, **best)
        print(f"[voices] {sid} {who} match={best['match']} secs={best['secs']} heard={best['heard']!r}", flush=True)
    (OUT / "picks.json").write_text(json.dumps(picks, ensure_ascii=False, indent=1), encoding="utf-8")
    print("VOICES_DONE", flush=True)


if __name__ == "__main__":
    main()
