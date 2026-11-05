"""seedance.py（Birds）— KIE Seedance 2.0 Mini 首幀模式：#41 暴風夜空，媽媽在後面追女兒（老師 11/05 同意報價）。
首幀＝我們 3D 畫面（無字幕、無圖卡），不送音訊；字幕與圖卡之後由播放頁疊上。
  python -I seedance.py 480p K41     # 試拍
  python -I seedance.py 720p K41     # 正式版
輸出 K41/<res>_<n>.mp4，花費記在 ledger.json。上限 200 credits（老師同意的報價），超過就拒絕開始。
"""
import json, sys, time
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, r"G:\我的雲端硬碟\teacher-toolkit\tools\2026 AI VIDEOS SENSE BAR\kie")
import kie  # noqa: E402

MODEL, BUDGET, LEDGER = "bytedance/seedance-2-mini", 200, HERE / "ledger.json"
STYLE = ("Stylized 3D animated film look exactly like the opening frame (soft cartoon 3D characters, cinematic dark-blue night lighting, heavy rain streaks).")
RULES = ("Keep both characters' faces, hair, clothes and white feathered wings exactly as in the opening frame: the teenage girl in a red hoodie and dark skirt, "
         "her mother in a mustard-yellow cardigan with brown hair. Wings stay attached to their upper backs. Same 3D cartoon style for the whole clip, no realism. "
         "No lightning bolts hitting anyone, no new characters, no captions or readable text.")
SHOTS = {
 'K41': dict(dur=8, action=("Stormy night sky in heavy rain. On the right, the teenage girl with white wings flies wildly and desperately upward, "
        "tossed and spun by strong gusts of wind, flapping hard. On the left behind her, her mother with white wings chases after her, "
        "flapping strongly, reaching one hand forward toward her daughter, slowly closing the distance. Dark clouds swirl, distant faint flicker in the clouds. "
        "Camera follows both of them, tracking slowly upward.")),
}
def ledger(): return json.loads(LEDGER.read_text(encoding='utf-8')) if LEDGER.exists() else []
def spent(): return sum(r.get('credits') or 0 for r in ledger())
def run(sid, res):
    s = SHOTS[sid]; od = HERE / sid; od.mkdir(exist_ok=True); n = len(list(od.glob(f'{res}_*.mp4'))) + 1
    inp = {'prompt': ' '.join([STYLE, 'Action: ' + s['action'], RULES]), 'resolution': res, 'aspect_ratio': '16:9', 'duration': s['dur'],
           'web_search': False, 'generate_audio': False,
           'first_frame_url': kie.upload(HERE / 'frames' / f'{sid}.png', upload_path='birds', file_name=f'{sid}_first.png')}
    (od / f'{res}_{n}.request.json').write_text(json.dumps(inp, ensure_ascii=False, indent=1), encoding='utf-8')
    t0 = time.time(); tid = kie.create(MODEL, inp); d = kie.wait(tid)
    rec = dict(shot=sid, res=res, take=n, taskId=tid, state=d['state'], credits=d.get('creditsConsumed'), secs=round(time.time() - t0), fail=d.get('failMsg') or '')
    if d['state'] == 'success': kie.download(d['result']['resultUrls'][0], od / f'{res}_{n}.mp4'); rec['file'] = f'{sid}/{res}_{n}.mp4'
    L = ledger(); L.append(rec); LEDGER.write_text(json.dumps(L, ensure_ascii=False, indent=1), encoding='utf-8'); return rec
if __name__ == '__main__':
    res, ids = sys.argv[1], sys.argv[2:]
    est = sum(SHOTS[i]['dur'] for i in ids) * (4 if res == '480p' else 9)
    if spent() + est > BUDGET: sys.exit(f'已花 {spent()} credits，這次預估 {est}，會超過上限 {BUDGET}：先問老師。')
    print(f"開始前已花 {spent()}；KIE 餘額 {kie.call('GET', '/api/v1/chat/credit')['data']}；這次預估約 {est}", flush=True)
    for i in ids: print(json.dumps(run(i, res), ensure_ascii=False), flush=True)
    print(f'累計花費 {spent()} credits', flush=True)
