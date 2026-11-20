"""Wait for a new complete GLB in Downloads (tripo_convert_*.glb, or a Chrome *.tmp that is a whole GLB)
and copy it to tabletop/models/<name>.glb.  python grab_glb.py <name>   |   python grab_glb.py --mark"""
import hashlib, shutil, struct, sys, time
from pathlib import Path

dl = Path.home() / 'Downloads'
models = Path(__file__).resolve().parent / 'models'
models.mkdir(exist_ok=True)
seen_file = models / '.seen_glb'
seen = set(seen_file.read_text(encoding='utf-8').split()) if seen_file.exists() else set()


def candidates():
    return [f for f in list(dl.glob('tripo_convert_*.glb')) + list(dl.glob('*.tmp')) if f.name not in seen]


def whole_glb(f):
    try:
        head = f.open('rb').read(12)
        return head[:4] == b'glTF' and struct.unpack('<I', head[8:12])[0] == f.stat().st_size
    except OSError:
        return False


if sys.argv[1] == '--mark':
    seen |= {f.name for f in candidates()}
    seen_file.write_text('\n'.join(sorted(seen)) + '\n', encoding='utf-8')
    sys.exit('marked')
# 11/20: Chrome later renames EARLIER .tmp downloads to tripo_convert_*.glb, so a renamed old file looks new
# (the mum came out as the ful pot, the backyard as the bed, the Australian boy as the Singapore girl).
# Never take a file whose bytes equal a model already saved in models/.
digest = lambda f: hashlib.sha256(f.read_bytes()).hexdigest()
known = {}
for m in models.glob('*.glb'):
    known.setdefault(m.stat().st_size, []).append(m)
for _ in range(100):
    for f in sorted(candidates(), key=lambda p: -p.stat().st_mtime):
        if whole_glb(f):
            same = [m for m in known.get(f.stat().st_size, []) if m.stem != sys.argv[1] and digest(m) == digest(f)]
            if same:
                seen.add(f.name)
                with seen_file.open('a', encoding='utf-8') as out:
                    out.write(f.name + '\n')
                print(f'skip {f.name}: same bytes as models/{same[0].name} (renamed old download)', flush=True)
                continue
            time.sleep(1)
            shutil.copy2(f, models / (sys.argv[1] + '.glb'))
            with seen_file.open('a', encoding='utf-8') as out:
                out.write(f.name + '\n')
            sys.exit(f'{sys.argv[1]} <- {f.name} {f.stat().st_size} bytes')
    time.sleep(2)
sys.exit('timeout ' + sys.argv[1])
