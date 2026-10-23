# 由 H3_C06_voice-first_v01/specs 的最新版，建立 Colab 用的 h3_shot 分鏡（9 段）。
# 依 RDQ-spec-hwg5-u03-colab-fullfilm-20261023（confirmed）：首尾幀＋固定英文配音、鎖明亮照明、Veda 關閉。
# 只寫入本資料夾 specs/；原始 specs、分鏡、配音不改。
import hashlib, json, os, sys
from pathlib import Path

HERE = Path(__file__).resolve().parents[1]
SRC = HERE.parent / 'H3_C06_voice-first_v01'
BASE = {'C01': 'C01_v03', 'C03': 'C03_v02', **{f'C{n:02d}': f'C{n:02d}' for n in range(7, 14)}}
SEED0 = 2026102300
LOCKS = [
    "TEMPORAL LIGHTING LOCK: every frame matches the first reference brightness, warm-neutral white balance, soft frontal fill "
    "and shadow intensity. Lighting is static scenery, never an animated action. The supplied first and last guide images "
    "share the same bright daytime lighting.",
    # 正向描述（H3 官方建議）；不列出 spotlight／dimming 等字，避免反向誘發（RunPod C03 v02 寫了 no spotlight 仍出現聚光燈）
    "Bright, even, high-key daylight fills the entire scene from edge to edge in every frame, during speech and during pauses "
    "alike. Every face, the whole background and the floor stay as clearly and warmly lit as in the first guide image. "
    "The white robot plastic stays bright white and skin stays warm and natural.",
]
CAMERA_LOCK = (" Locked manual exposure and locked warm-neutral white balance identical to the approved reference image; "
               "constant brightness from 0.00 through 8.00 seconds.")
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()


def rebase(val, out_dir):
    src = (SRC / 'specs' / val).resolve()
    assert src.exists(), src
    return os.path.relpath(src, out_dir).replace('\\', '/'), src


manifest = {}
only = sys.argv[1:] or list(BASE)
for n, clip in enumerate(BASE):
    if clip not in only:
        continue
    spec = json.loads((SRC / 'specs' / f'{BASE[clip]}.json').read_text(encoding='utf-8-sig'))
    out = HERE / 'specs' / clip
    out.mkdir(parents=True, exist_ok=True)
    files = {}
    for key in ('first_frame', 'last_frame'):
        if spec.get(key):
            spec[key], p = rebase(spec[key], out); files[key] = {'file': spec[key], 'sha256': sha(p)}
    spec['audio']['fixed']['file'], p = rebase(spec['audio']['fixed']['file'], out)
    files['guide'] = {'file': spec['audio']['fixed']['file'], 'sha256': sha(p)}
    spec['style'] = spec['style'].replace('cinematic ', '')
    spec['seed'] = SEED0 + n + 1
    spec['veda'] = False
    for shot in spec['shots']:
        if 'exposure' not in shot['camera']:
            shot['camera'] += CAMERA_LOCK
    # 先移除舊的光線段落（含負面字串），再加正向版
    spec['constraints'] = [c for c in spec['constraints']
                           if not c.startswith(('TEMPORAL LIGHTING LOCK', 'Keep the entire room', 'Keep the entire scene'))] + LOCKS
    spec['constraints'] = [c.replace(' Never transform or project it into a robot, dark room, new scene, wooden paddle, spoon or other object.',
                                     ' It stays the same flat map in the same place on the bright board for all eight seconds.')
                           .replace(' No inserted shot, superimposition, cross-fade, darkening, spotlight, lens change or enlarged face.',
                                    ' The same lens and the same character sizes continue in one unbroken take.')
                           for c in spec['constraints']]
    for shot in spec['shots']:
        shot['action'] = shot['action'].replace('The whole scene stays evenly lit and continuous during all pauses as well as dialogue. ',
                                                'The whole scene stays brightly and evenly lit during all pauses as well as dialogue. ')
        shot['action'] = shot['action'].replace(' No cinematic transition, dissolve, overlay, insert, projection, spotlight, close-up, zoom or new prop at any time.',
                                                ' The shot is one continuous unbroken wide take with the same props throughout.')
    (out / 'spec.json').write_text(json.dumps(spec, ensure_ascii=False, indent=1), encoding='utf-8')
    manifest[clip] = {'base_spec': f'H3_C06_voice-first_v01/specs/{BASE[clip]}.json', 'seed': spec['seed'],
                      'spec_sha256': sha(out / 'spec.json'), **files}
    print(clip, spec['seed'], files['first_frame']['file'], spec.get('last_frame'), files['guide']['file'])

mp = HERE / 'specs' / 'manifest.json'
old = json.loads(mp.read_text(encoding='utf-8')) if mp.exists() else {}
old.update(manifest)
mp.write_text(json.dumps(old, ensure_ascii=False, indent=1), encoding='utf-8')
