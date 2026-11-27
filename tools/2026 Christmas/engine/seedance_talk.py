"""seedance_talk.py — 說話鏡改用 KIE Seedance 2.0 Mini 參考模式（老師 11/27 同意，上限 450 點）。
參考圖 1＝本機渲染的首幀、參考圖 2＝角色一覽；參考音＝我們的配音（成片聲音一律換回原配音）。
  python -I seedance_talk.py 480p L23        # 先 480p 試鏡
  python -I seedance_talk.py 720p L23 L06 …  # 老師核准後拍 720p
  python -I seedance_talk.py 480p act L13 L15  # 動作鏡（首幀模式、不送聲音）
輸出 h3/<id>/seedance_<res>_<n>.mp4，花費記在 h3/kie_ledger.json；超過上限就不送出。"""
import json, subprocess, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT.parents[0] / '2026 AI VIDEOS SENSE BAR' / 'kie'))
import kie  # noqa: E402

MODEL, BUDGET = 'bytedance/seedance-2-mini', 1400   # 老師 11/27 擴充：說話 4 句＋動作 10 句
LEDGER = ROOT / 'h3' / 'kie_ledger.json'
SHEET = ROOT / 'renders' / 'sample-shotlineup-still-1.00.png'
STYLE = ('Blocky voxel 3D animation. Every character and every object is built only from flat-sided cubes and boxes with sharp square edges, '
         'pixel-art textures and flat pixel-art faces with square pixel eyes; block arms end in flat block hands. '
         'Smooth, gentle character animation inside this exact blocky style.')
RULES = ('Keep every character exactly as in the reference images: the same cube shapes, proportions, colours and pixel faces, never rounded, never smooth or realistic. '
         'The camera stays fixed with the same framing as reference image 1. No captions, no subtitles, no readable text, letters or numbers. No new characters appear.')
SHOTS = {
    'L23': dict(dur=8, frame='h3/L23/first.png',
                scene='A warm wooden cabin at night with a glowing brick fireplace, a Christmas tree with lights and a night-blue window. '
                      'Santa stands in the centre; Ken (spiky black hair, orange goggles, navy and orange jacket) stands on the left; '
                      'Shuiling (light-blue hair with a water-drop curl, gold ornaments, white sleeves, green dress) stands on the right.',
                action='Santa smiles warmly, nods twice and slowly opens both block arms wide to welcome the two children for a hug. '
                       'Ken and Shuiling listen with happy closed-mouth smiles and sway a little. The fire flickers and the tree lights twinkle.',
                speaker='Santa', line='Thank you, kids! Now everyone can have a merry Christmas!'),
    'L03': dict(dur=8, frame='h3/L03/first.png',
                scene='Santa stands in the snowy yard of the North Pole in front of his little red workshop, with snowy pine trees and a table of Christmas things beside him. Snow is starting to blow.',
                action='Santa looks worried and waves both block arms high above his head, calling for help, then points behind him at the coming storm and holds his head with both hands. Snowflakes blow sideways in the wind.',
                speaker='Santa', line='Help! A big snowstorm blew my Christmas things away!'),
    'L06': dict(dur=6, frame='h3/L06/first.png',
                scene='A bright classroom with wooden desks and a green wall. Ken (spiky black hair, orange goggles, navy and orange jacket, an orange backpack on his back) stands behind his desk; Shuiling is at the right edge.',
                action='Ken grins, then raises one block fist high in the air and bounces once on his feet, full of energy, ready to go on an adventure.',
                speaker='Ken', line="Now we are ready. Let's go!"),
    'L11': dict(dur=6, frame='h3/L11/first.png',
                scene='Inside a long colourful tunnel made of glowing cube rings. Shuiling (light-blue hair with a water-drop curl, gold ornaments, white sleeves, green dress) flies forward holding Ken’s hand; Ken is at the left edge.',
                action='Shuiling shouts with wide eyes, squeezes Ken’s hand tightly, then shivers as tiny white frost specks gather on her hair and sleeves. The glowing rings stream past behind her.',
                speaker='Shuiling', line="Hold on tight! It's getting cold!"),
}


# ---- 動作鏡（首幀模式、不送聲音、鏡頭鎖定）/ action shots: first-frame mode, no audio, locked-off camera ----
ACT_RULES = ('Camera is LOCKED-OFF: one fixed camera, no zoom, no pan, no cut, for the whole clip. '
             'Every character keeps exactly the cube shapes, pixel faces, colours and clothes of the first frame, never rounded or realistic. '
             'No captions, no subtitles, no readable text, letters or numbers. No new characters appear. Nobody talks; all mouths stay closed or smiling.')
ACT = {
    'L13': dict(dur=6, action='Starting from the first frame, Ken and Shuiling walk slowly toward the camera through very deep snow that reaches their knees. '
                'With every step each child pulls one whole leg up and completely out of the snow, so the boot and the whole leg can be seen in the air, '
                'then pushes it forward and plants it back down into the deep snow; white snow chunks spray up around their legs and their bodies rock from side to side. '
                'A strong blizzard blows snow sideways past them. After two steps they press both block hands tightly over their ears '
                'and squeeze their eyes shut because the wind is very loud, then keep walking, still lifting each leg high out of the snow. Both children stay fully in frame.'),
    'L15': dict(dur=8, action='Starting from the first frame, Ken kneels at the small snow pile and digs with both flat block hands, pushing the snow cubes aside to left and right. '
                'Shuiling leans in to watch. A blue gift box with a red ribbon appears from under the snow; Ken grabs it with both hands and lifts it high above his head, '
                'and both children cheer. The gift box stays fully in frame the whole time.'),
    'L17': dict(dur=6, action='Starting from the first frame, the little reindeer shivers hard in the freezing wind: its whole body shakes quickly from side to side, '
                'its legs tremble, its head droops low and little puffs of white breath come from its nose; snow blows across it. '
                'Shuiling walks one step closer, kneels down in the snow right beside the reindeer and strokes its back slowly up and down with her flat open block hand, again and again. '
                'Ken leans forward and watches with a worried face. The reindeer and Shuiling stay fully in frame.'),
    'L18': dict(dur=6, action='Starting from the first frame, Shuiling keeps her right hand flat, open and still, with the red-and-white striped candy cane lying on her open palm. '
                'The reindeer lowers its head to her palm, sniffs the candy cane, then bites the end of the candy cane and chews, taking small bites one after another '
                'until the whole candy cane is gone from her palm. Then the reindeer lifts its head and nods happily twice, and Shuiling and Ken smile. '
                "Shuiling's open hand, the candy cane and the reindeer's mouth stay fully in frame the whole time."),
}


def run_act(res, sid):
    s = ACT[sid]; od = ROOT / 'h3' / sid; od.mkdir(parents=True, exist_ok=True)
    n = len(list(od.glob(f'act_{res}_*.mp4'))) + 1
    ff = kie.upload(od / 'act_first.png', upload_path='xmas2026', file_name=f'{sid}_act_first.png')
    inp = {'prompt': ' '.join([STYLE, s['action'], ACT_RULES]), 'resolution': res, 'aspect_ratio': '16:9', 'duration': s['dur'],
           'web_search': False, 'first_frame_url': ff, 'generate_audio': False}
    (od / f'act_{res}_{n}.request.json').write_text(json.dumps(inp, ensure_ascii=False, indent=1), encoding='utf-8')
    t0 = time.time(); tid = kie.create(MODEL, inp); d = kie.wait(tid)
    rec = dict(shot=sid, kind='act', res=res, take=n, taskId=tid, state=d['state'], credits=d.get('creditsConsumed'), secs=round(time.time() - t0), fail=d.get('failMsg') or '')
    if d['state'] == 'success':
        kie.download(d['result']['resultUrls'][0], od / f'act_{res}_{n}.mp4'); rec['file'] = f'h3/{sid}/act_{res}_{n}.mp4'
    L = ledger(); L.append(rec); LEDGER.write_text(json.dumps(L, ensure_ascii=False, indent=1), encoding='utf-8')
    return rec


def ledger():
    return json.loads(LEDGER.read_text(encoding='utf-8')) if LEDGER.exists() else []


def spent():
    return round(sum(r.get('credits') or 0 for r in ledger()), 1)


def ref_voice(sid):
    src = ROOT / 'audio' / 'lines' / f'{sid}.wav'
    dst = ROOT / 'h3' / sid / f'{sid}_ref.wav'
    dst.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(src), '-af', 'adelay=300,apad=whole_dur=2.5', '-ar', '48000', '-ac', '1', str(dst)], check=True)
    return dst


def prompt(s):
    return ' '.join([STYLE,
                     'Reference image 1 is the opening frame: match its composition, background, lighting and characters. Reference image 2 is the character sheet.',
                     f"Scene: {s['scene']}", f"Action: {s['action']}",
                     f"{s['speaker']} says in clear English: \"{s['line']}\" The speaker's lip movements follow the reference audio exactly. Only {s['speaker']}'s mouth moves.",
                     RULES])


def run(res, sid):
    s = SHOTS[sid]; od = ROOT / 'h3' / sid; od.mkdir(parents=True, exist_ok=True)
    n = len(list(od.glob(f'seedance_{res}_*.mp4'))) + 1
    refs = [kie.upload(ROOT / s['frame'], upload_path='xmas2026', file_name=f'{sid}_first.png'),
            kie.upload(SHEET, upload_path='xmas2026', file_name='cast_sheet.png')]
    inp = {'prompt': prompt(s), 'resolution': res, 'aspect_ratio': '16:9', 'duration': s['dur'], 'web_search': False,
           'reference_image_urls': refs, 'generate_audio': True,
           'reference_audio_urls': [kie.upload(ref_voice(sid), upload_path='xmas2026', file_name=f'{sid}_voice.wav')]}
    (od / f'seedance_{res}_{n}.request.json').write_text(json.dumps(inp, ensure_ascii=False, indent=1), encoding='utf-8')
    t0 = time.time(); tid = kie.create(MODEL, inp); d = kie.wait(tid)
    rec = dict(shot=sid, res=res, take=n, taskId=tid, state=d['state'], credits=d.get('creditsConsumed'), secs=round(time.time() - t0), fail=d.get('failMsg') or '')
    if d['state'] == 'success':
        kie.download(d['result']['resultUrls'][0], od / f'seedance_{res}_{n}.mp4'); rec['file'] = f'h3/{sid}/seedance_{res}_{n}.mp4'
    L = ledger(); L.append(rec); LEDGER.write_text(json.dumps(L, ensure_ascii=False, indent=1), encoding='utf-8')
    return rec


if __name__ == '__main__':
    res, ids = sys.argv[1], sys.argv[2:]
    act = bool(ids) and ids[0] == 'act'
    if act: ids = ids[1:]
    est = sum((ACT if act else SHOTS)[i]['dur'] * (3.8 if res == '480p' else 8.3) for i in ids)
    if spent() + est > BUDGET:
        sys.exit(f'已花 {spent()} 點，這批預估 {est:.0f} 點，會超過上限 {BUDGET}：先問老師。')
    print(f'開始前已花 {spent()} 點；這批預估 {est:.0f} 點；KIE 餘額 {kie.call("GET", "/api/v1/chat/credit")["data"]}', flush=True)
    for i in ids:
        print(json.dumps(run_act(res, i) if act else run(res, i), ensure_ascii=False), flush=True)
    print(f'累計花費 {spent()} 點', flush=True)
