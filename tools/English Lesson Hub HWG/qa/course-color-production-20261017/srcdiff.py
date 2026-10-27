# Usage: python -I srcdiff.py <zip-name> <mode: diff|exact>
import sys, zipfile, hashlib, json, os
from pathlib import Path
T = Path(os.environ['TEMP']); release = T / os.environ['LH_RELEASE']; out = T / os.environ['LH_EVIDENCE']
name, mode = sys.argv[1], sys.argv[2]
sha = lambda b: hashlib.sha256(b).hexdigest()
with zipfile.ZipFile(out / name) as z:
    assert z.testzip() is None
    zipped = {n: sha(z.read(n)) for n in z.namelist() if not n.endswith('/')}
local = {p.relative_to(release / 'functions').as_posix(): sha(p.read_bytes()) for p in (release / 'functions').rglob('*')
         if p.is_file() and 'node_modules' not in p.relative_to(release / 'functions').parts}
changed = sorted(k for k in local if k in zipped and zipped[k] != local[k])
new = sorted(k for k in local if k not in zipped)
missing = sorted(k for k in zipped if k not in local)
result = {'zip': name, 'files': len(zipped), 'changed': changed, 'new': new, 'missingLocally': missing}
(out / (name.replace('.zip', '') + '-diff.json')).write_text(json.dumps(result, indent=2), encoding='utf-8')
print(json.dumps(result))
if mode == 'exact' and (changed or missing): sys.exit(1)
