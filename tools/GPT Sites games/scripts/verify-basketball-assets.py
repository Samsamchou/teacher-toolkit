"""Read-only validation of generated art and provenance; does not edit image pixels."""
import hashlib,json
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parent.parent
records=[]
for name in ['cat-dog','rabbit-panda','fox-penguin','court']:
    path=root/'public'/'basketball'/f'{name}.png'
    meta=json.loads(path.with_suffix('.json').read_text(encoding='utf-8'))
    digest=hashlib.sha256(path.read_bytes()).hexdigest()
    assert meta['sha256']==digest, f'Hash mismatch: {name}'
    assert meta['prompt'] and meta['tool']=='built-in Image'
    with Image.open(path) as image:
        image.load()
        assert image.size==(1536,1024)
        row={'file':path.name,'size':list(image.size),'mode':image.mode,'sha256':digest,'bytes':path.stat().st_size}
        if name!='court':
            assert image.mode=='RGBA',f'Not transparent: {name}'
            alpha=image.getchannel('A');hist=alpha.histogram()
            assert hist[0]>image.width*image.height*.25,f'Background not transparent: {name}'
            row['transparent_pixels']=hist[0]
            row['poses']=8
            assert all(alpha.crop((c*384,r*512,(c+1)*384,(r+1)*512)).getbbox() for r in range(2) for c in range(4))
        records.append(row)
print(json.dumps({'passed':True,'images':records,'animals':6,'poses':24},ensure_ascii=False,indent=2))
