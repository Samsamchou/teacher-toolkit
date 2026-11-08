"""grab_glb.py <名字> — 等「下載」資料夾出現新的完整 GLB（Chrome 常停在 .tmp：只要檔頭是 glTF、長度和檔頭記載相同就算完整），
複製到 props/<名字>.glb。已收過的檔（雜湊相同）不會再收。"""
import sys, time, hashlib, pathlib, shutil, struct
DL = pathlib.Path.home() / 'Downloads'; P = pathlib.Path(__file__).resolve().parent / 'props'; P.mkdir(exist_ok=True)
name = sys.argv[1]; seen = P / '.seen_sha'; known = set(seen.read_text().split()) if seen.exists() else set()
t_end = time.time() + 240
while time.time() < t_end:
    for f in sorted(DL.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True):
        if not f.is_file() or time.time() - f.stat().st_mtime > 1800 or f.stat().st_size < 100_000: continue
        with open(f, 'rb') as fh: h = fh.read(12)
        if len(h) < 12 or h[:4] != b'glTF' or struct.unpack('<I', h[8:12])[0] != f.stat().st_size: continue
        sha = hashlib.sha256(f.read_bytes()).hexdigest()
        if sha in known: continue
        shutil.copy(f, P / f'{name}.glb'); seen.open('a').write(sha + '\n')
        print(f'{name} <- {f.name} {f.stat().st_size} bytes'); sys.exit(0)
    time.sleep(3)
print('timeout', name); sys.exit(1)
