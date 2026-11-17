"""seedance.py (A Day in Vienna) - KIE Seedance 2.0 Mini first-frame mode for support shots V1 orchestra, V2 audience clapping, V3 street.
  python -I seedance/seedance.py 720p V1 V2 V3
Output seedance/V?/<res>_<n>.mp4, cost in seedance/ledger.json. Budget 250 credits (teacher approved quote 115-125 on 2026-11-17, room for one retake each)."""
import json, sys, threading, time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
LOCK = threading.Lock()
HERE = Path(__file__).resolve().parent
sys.path.insert(0, r"G:\我的雲端硬碟\teacher-toolkit\tools\2026 AI VIDEOS SENSE BAR\kie")
import kie  # noqa: E402

MODEL, BUDGET, LEDGER = "bytedance/seedance-2-mini", 250, HERE / "ledger.json"
STYLE = ("2D flat vector cutout-puppet animation exactly like the opening frame: thick dark-brown outlines, flat colour fills with one hard-edged shadow block, "
         "simple round mitten hands, small dot eyes. Limbs move like jointed paper puppets, simple and clear.")
RULES = ("Keep every character, costume, colour and the background exactly as in the opening frame for the whole clip. Same flat cartoon style, no realism, no 3D shading. "
         "No captions, no subtitles, no text, no letters. No new characters appear, nobody leaves. Static locked camera, no zoom, no cuts.")
SHOTS = {
 'V1': dict(dur=5, action="An 18th-century orchestra plays a lively piece on the opera stage. The violinists and the cellist move their bows back and forth across the strings in rhythm, "
            "the flute player sways gently, the conductor in the middle waves his baton up and down in a steady beat. The musicians nod slightly with the music. The audience silhouettes at the bottom stay still."),
 'V2': dict(dur=4, action="The opera audience applauds happily. Everyone claps their two hands together again and again in front of the chest, a quick steady clapping rhythm, "
            "hands meeting and separating, heads bobbing a little, big smiles. The chandelier glows."),
 'V3': dict(dur=4, action="A calm sunny street. The five pedestrians walk along the sidewalk at an easy pace with swinging arms and stepping legs, the small dog trots on its leash wagging its tail, "
            "the man pushes his bicycle and the wheels turn, the pigeons on the ground peck, and the two pigeons in the sky flap their wings and fly across. The clouds drift slowly."),
}


def ledger(): return json.loads(LEDGER.read_text(encoding='utf-8')) if LEDGER.exists() else []
def spent(): return sum(r.get('credits') or 0 for r in ledger())


def run(sid, res):
    s = SHOTS[sid]; od = HERE / sid; od.mkdir(exist_ok=True)
    n = len(list(od.glob(f'{res}_*.mp4'))) + 1
    inp = {'prompt': ' '.join([STYLE, 'Action: ' + s['action'], RULES]), 'resolution': res, 'aspect_ratio': '16:9', 'duration': s['dur'],
           'web_search': False, 'generate_audio': False,
           'first_frame_url': kie.upload(HERE / 'frames' / f'{sid}.png', upload_path='vienna-cutout', file_name=f'{sid}_first.png')}
    (od / f'{res}_{n}.request.json').write_text(json.dumps(inp, ensure_ascii=False, indent=1), encoding='utf-8')
    t0 = time.time(); tid = kie.create(MODEL, inp); d = kie.wait(tid)
    rec = dict(shot=sid, res=res, take=n, taskId=tid, state=d['state'], credits=d.get('creditsConsumed'), secs=round(time.time() - t0), fail=d.get('failMsg') or '')
    if d['state'] == 'success':
        kie.download(d['result']['resultUrls'][0], od / f'{res}_{n}.mp4'); rec['file'] = f'{sid}/{res}_{n}.mp4'
    with LOCK: L = ledger(); L.append(rec); LEDGER.write_text(json.dumps(L, ensure_ascii=False, indent=1), encoding='utf-8')
    return rec


if __name__ == '__main__':
    res, ids = sys.argv[1], sys.argv[2:]
    est = sum(SHOTS[i]['dur'] for i in ids) * (4 if res == '480p' else 9)
    if spent() + est > BUDGET: sys.exit(f'spent {spent()}, estimate {est}, over budget {BUDGET}: ask the teacher first.')
    print(f"spent before {spent()}; KIE balance {kie.call('GET', '/api/v1/chat/credit')['data']}; estimate {est}", flush=True)
    with ThreadPoolExecutor(5) as ex:
        for r in ex.map(lambda i: run(i, res), ids): print(json.dumps(r, ensure_ascii=False), flush=True)
    print(f'total spent {spent()} credits', flush=True)
