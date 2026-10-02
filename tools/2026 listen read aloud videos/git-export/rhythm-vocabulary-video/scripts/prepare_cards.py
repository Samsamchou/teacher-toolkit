"""Conservative local square padding; preserve raw crops and handwritten content."""
import argparse
from PIL import ImageFilter
from media_core import *

def prepare(root,manifest,out,side=1024):
    source=read_json(resolve(root,manifest));dest=output_path(root,out)
    if dest.exists():raise ValueError('Output exists; choose another version.')
    rows=source.get('items',source.get('records',[]));images=[];ids=set()
    for r in rows:
        ident=r['id']
        if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,79}',ident) or ident.casefold() in ids:raise ValueError('Invalid or duplicate image id.')
        ids.add(ident.casefold());p=resolve(root,r.get('raw_output',r.get('path','')))
        if sha(p)!=r['sha256']:raise ValueError('Image source changed.')
        with Image.open(p) as original:
            im=ImageOps.exif_transpose(original).convert('RGBA');white=Image.new('RGBA',im.size,'white');white.alpha_composite(im)
            # No denoise by default: preserve faint pencil strokes and uncolored areas.
            im=white.convert('RGB').filter(ImageFilter.UnsharpMask(radius=.6,percent=70,threshold=3))
            im=ImageOps.contain(im,(side,side),Image.Resampling.LANCZOS)
            canvas=Image.new('RGB',(side,side),'white');canvas.paste(im,((side-im.width)//2,(side-im.height)//2))
            images.append((ident,p,r,canvas))
    dest.mkdir(parents=True);records=[]
    for ident,p,r,im in images:
        target=dest/(ident+'.png');im.save(target)
        record={'id':ident,'source':str(p),'source_sha256':r['sha256'],'path':str(target.relative_to(root)),'sha256':sha(target),
                'size':[side,side],'method':'local mild unsharp mask and proportional white padding; no generative edits','teacher_acceptance':'pending'}
        save_json(target.with_suffix('.json'),record);records.append(record)
    save_json(dest/'cards.json',{'records':records,'api_calls':0});return records

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--project',type=Path,default=Path.cwd());p.add_argument('--manifest',required=True);p.add_argument('--out',required=True);p.add_argument('--side',type=int,default=1024);a=p.parse_args()
    if not 256<=a.side<=4096:p.error('side must be 256..4096')
    print(json.dumps({'prepared':len(prepare(a.project.resolve(),a.manifest,a.out,a.side))}))
