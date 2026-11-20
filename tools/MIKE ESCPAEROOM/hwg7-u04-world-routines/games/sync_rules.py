"""Copy games/rules.json into every game project (data/rules.json).  python games/sync_rules.py"""
import shutil
from pathlib import Path
root = Path(__file__).parent
for proj in sorted(root.iterdir()):
    if (proj / 'project.godot').exists():
        (proj / 'data').mkdir(exist_ok=True)
        shutil.copyfile(root / 'rules.json', proj / 'data' / 'rules.json')
        print('synced', proj.name)
