"""Cut the Codex sticker sheets into single transparent icons."""
import sys, numpy as np
from PIL import Image, ImageDraw
from pathlib import Path
root = Path(__file__).resolve().parent.parent
SETS = {
 'shape': ['donut','pencil','swan','ear','flag','hook','whistle','scythe','gourd','ladle'],
 'homo':  ['bell','clothes','crocodile','mountain','persimmon','weapons','skate','paint','trumpet','bottle'],
}
SRC = {'shape':'shape_sheet.png','homo':'homophone_sheet.png'}
def bands(mask, min_gap=12):
    idx = np.where(mask)[0]; out=[]; s=idx[0]; p=idx[0]
    for i in idx[1:]:
        if i-p > min_gap: out.append((s,p)); s=i
        p=i
    out.append((s,p)); return out
for key,names in SETS.items():
    im = Image.open(root/'assets'/'source'/SRC[key]).convert('RGB'); a = np.asarray(im)
    ink = (a.min(axis=2) < 235)
    boxes=[]
    rows=[b for b in bands(ink.any(axis=1)) if b[1]-b[0]>=40]
    assert len(rows)==3, rows
    for (y0,y1),n in zip(rows,[4,4,2]):
        prof = ink[y0:y1+1].sum(axis=0); xs = np.where(prof>0)[0]; xa,xb = xs[0],xs[-1]
        cuts=[xa]
        for k in range(1,n):
            e = int(xa+(xb-xa)*k/n); lo,hi = e-70,e+70
            cuts.append(lo+int(np.argmin(prof[lo:hi])))
        cuts.append(xb+1)
        for a_,b_ in zip(cuts,cuts[1:]):
            sub = ink[y0:y1+1, a_:b_]; cx = np.where(sub.any(axis=0))[0]; cy = np.where(sub.any(axis=1))[0]
            boxes.append((a_+cx[0], y0+cy[0], a_+cx[-1], y0+cy[-1]))
    print(key, len(boxes))
    assert len(boxes)==len(names), boxes
    for name,(x0,y0,x1,y1) in zip(names,boxes):
        pad=3; c = im.crop((max(0,x0-pad),max(0,y0-pad),x1+pad,y1+pad)).convert('RGBA')
        w,h = c.size
        seeds=[(0,0),(w-1,0),(0,h-1),(w-1,h-1),(w//2,0),(w//2,h-1),(0,h//2),(w-1,h//2)]
        if name=='donut': seeds.append((w//2,h//2))
        for s in seeds:
            if c.getpixel(s)[3] and min(c.getpixel(s)[:3])>225:
                ImageDraw.floodfill(c, s, (255,255,255,0), thresh=38)
        side=max(w,h); sq=Image.new('RGBA',(side,side),(0,0,0,0)); sq.paste(c,((side-w)//2,(side-h)//2))
        sq.resize((400,400),Image.LANCZOS).save(root/'assets'/'icons'/f'{key}_{name}.png')
