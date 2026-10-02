"""Shared local media primitives. Paths come from jobs, never from old productions."""
from __future__ import annotations
import hashlib, json, math, re, shutil, subprocess, wave
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps

SR, FPS, W, H = 48000, 30, 1920, 1080

def read_json(path):
    return json.loads(Path(path).read_text(encoding='utf-8-sig'))

def sha(path):
    digest=hashlib.sha256()
    with Path(path).open('rb') as f:
        for chunk in iter(lambda:f.read(1024*1024),b''): digest.update(chunk)
    return digest.hexdigest()

def fingerprint(obj):
    return hashlib.sha256(json.dumps(obj,sort_keys=True,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()

def save_json(path,obj):
    path=Path(path); path.parent.mkdir(parents=True,exist_ok=True)
    with path.open('x',encoding='utf-8',newline='\n') as f:
        json.dump(obj,f,ensure_ascii=False,indent=2); f.write('\n')

def run(args):
    return subprocess.run([str(x) for x in args],check=True,capture_output=True)

def probe(path):
    return json.loads(run(['ffprobe','-v','error','-show_streams','-show_format','-of','json',path]).stdout)

def resolve(root,path):
    p=Path(path).expanduser()
    return (p if p.is_absolute() else root/p).resolve()

def output_path(root,path):
    p=resolve(root,path)
    if p==root or not p.is_relative_to(root): raise ValueError('Output must be a subdirectory of --project.')
    return p

def verified_asset(root,record):
    p=resolve(root,record['path'])
    if not p.is_file() or sha(p)!=record['sha256']: raise ValueError('Missing or changed asset: '+p.name)
    return p

def audio(path):
    channels=next(s['channels'] for s in probe(path)['streams'] if s['codec_type']=='audio')
    if channels not in (1,2): raise ValueError('Only mono/stereo audio supported.')
    filt='pan=mono|c0=0.5*c0+0.5*c1' if channels==2 else 'anull'
    return np.frombuffer(run(['ffmpeg','-v','error','-i',path,'-af',filt,'-ar',SR,'-ac','1','-f','f32le','pipe:1']).stdout,'<f4').copy()

def wav(path,x):
    if Path(path).exists(): raise ValueError('Preserve existing audio: '+str(path))
    if np.max(np.abs(x))>=1: raise ValueError('Audio clipping; adjust the mix before saving.')
    samples=np.repeat(x[:,None],2,axis=1) if x.ndim==1 else x
    with wave.open(str(path),'wb') as f:
        f.setparams((samples.shape[1],2,SR,len(samples),'NONE','not compressed'))
        f.writeframes((samples*32767).astype('<i2').tobytes())

def rms_curve(x,win=.004,hop=.001):
    w,h=round(win*SR),round(hop*SR)
    starts=np.arange(0,max(0,len(x)-w+1),h); sums=np.r_[0,np.cumsum(x.astype(float)**2)]
    return (starts+w/2)/SR,np.sqrt(np.maximum(0,(sums[starts+w]-sums[starts])/w))

def drum_hits(x,beat):
    t,e=rms_curve(x); rise=np.maximum(0,e-np.r_[np.zeros(4),e[:-4]]); hits=[]
    for center in [i*beat for i in range(4)]:
        ix=np.flatnonzero((t>=max(.002,center-.03))&(t<=center+.09))
        if not len(ix) or rise[ix].max()<=1e-8: raise ValueError('No clear drum transient in expected window.')
        peak=int(ix[np.argmax(rise[ix])]); edge=peak
        while edge>ix[0] and t[peak]-t[edge]<.025 and rise[edge-1]>=.2*rise[peak]: edge-=1
        hits.append(float(t[edge]-.002))
    return hits

def routes(items,mode='auto'):
    n=len(items)
    if mode=='auto':
        mode='repeat' if n in (8,9) else 'two-rounds' if n==16 else 'two-segments' if n==32 else ''
    if mode=='repeat' and n in (8,9): return [[items,items]]
    if mode=='two-rounds' and n==16: return [[items[:8],items[8:]]]
    if mode=='two-segments' and n==32: return [[items[:8],items[8:16]],[items[16:24],items[24:]]]
    raise ValueError('Image routing needs 8/9 repeat, 16 two-rounds, or 32 two-segments; no images were discarded.')

def display_word(text,exceptions=None):
    """Lowercase ordinary vocabulary; language names and acronyms retain their case."""
    fixed={'chinese':'Chinese','english':'English','pe':'PE'}
    if exceptions is not None:
        if not isinstance(exceptions,dict):raise ValueError('display_case_exceptions must be an object.')
        for key,value in exceptions.items():
            if not isinstance(value,str) or key.casefold()!=value.casefold() or value!=value.strip():
                raise ValueError('Case exceptions may change case only, not the word.')
            if key.casefold() in fixed and value!=fixed[key.casefold()]:
                raise ValueError('Chinese, English and PE must keep their standard case.')
            fixed[key.casefold()]=value
    value=text.strip()
    return fixed.get(value.casefold(),value.lower())

def overview_layout(count):
    if not 1<=count<=9:raise ValueError('Overview supports one to nine cards.')
    if count==8:
        return {'columns':4,'rows':2,'side':290,'label_offset':196,'font_size':42,
                'centers':[(x,y) for y in (302,766) for x in (285,735,1185,1635)]}
    return {'columns':3,'rows':math.ceil(count/3),'side':205,'label_offset':146,'font_size':36,
            'centers':[([480,960,1440][j%3],[263,558,853][j//3]) for j in range(count)]}

def inventory(folder):
    rows=[];seen=set()
    for p in Path(folder).iterdir():
        if not p.is_file() or p.suffix.lower() not in ('.png','.jpg','.jpeg'): continue
        match=re.match(r'^(\d+)[ _-]+(.+)$',p.stem)
        if not match: raise ValueError('Filename needs a numeric prefix and word: '+p.name)
        number=int(match[1])
        if number in seen: raise ValueError('Duplicate numeric prefix: '+str(number))
        seen.add(number)
        word=display_word(match[2])
        rows.append({'id':f'card-{number:02d}','number':number,'word':word,'source_word':match[2].strip(),
                     'spoken_text':'P. E.' if word=='PE' else word,'image':{'path':str(p.resolve()),'sha256':sha(p)}})
    rows.sort(key=lambda r:r['number'])
    if not rows: raise ValueError('No numbered images found.')
    return rows

def font_path(config):
    value=config.get('font') or 'C:/Windows/Fonts/comicbd.ttf'
    p=Path(value)
    if not p.is_file(): raise ValueError('Comic font missing; explicitly set job font. Do not silently substitute.')
    ImageFont.truetype(str(p),30)
    return str(p)

def card(path,side):
    result=Image.new('RGBA',(side+30,side+30),(0,0,0,0));d=ImageDraw.Draw(result)
    d.rounded_rectangle((8,12,side+26,side+28),18,fill=(0,0,0,95))
    d.rounded_rectangle((2,2,side+20,side+20),15,fill=(245,245,237,255),outline=(194,201,194,255),width=5)
    with Image.open(path) as source:
        source=ImageOps.exif_transpose(source).convert('RGBA')
        white=Image.new('RGBA',source.size,'white');white.alpha_composite(source)
        im=ImageOps.contain(white.convert('RGB'),(side,side),Image.Resampling.LANCZOS)
    result.paste(im,(12+(side-im.width)//2,12+(side-im.height)//2))
    return result

def place(canvas,im,center,angle=0,scale=1):
    if abs(scale-1)>.004: im=im.resize((max(1,round(im.width*scale)),max(1,round(im.height*scale))),Image.Resampling.BICUBIC)
    if abs(angle)>.02: im=im.rotate(angle,resample=Image.Resampling.BICUBIC,expand=True)
    canvas.alpha_composite(im,(round(center[0]-im.width/2),round(center[1]-im.height/2)))

def label(draw,xy,text,size,font,fill='white',shadow=False):
    face=ImageFont.truetype(font,size)
    while draw.textbbox((0,0),text,font=face)[2]>1700 and size>40:
        size-=2;face=ImageFont.truetype(font,size)
    if shadow: draw.text((xy[0]+3,xy[1]+4),text,font=face,fill=(15,25,29),anchor='mm')
    draw.text(xy,text,font=face,fill=fill,anchor='mm')
