import sys,json,hashlib,subprocess,pathlib
sys.path.insert(0,str(pathlib.Path.home()/'AppData/Local/Temp/gsg-media-deps'))
import imageio_ffmpeg
from PIL import Image,ImageSequence
root=pathlib.Path.cwd(); out=root/'public/spin/optimized';out.mkdir(exist_ok=True)
windows=[[65,300,662,653],[70,398,666,666],[59,327,657,657],[78,344,639,643],[83,275,635,635],[81,302,641,637],[81,298,638,638],[68,298,665,665]]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
records={}
for name in ['wheel','pointer','dice-faces','mascot']:
 source=root/f'public/spin/{name}.png';target=out/f'{name}.webp';Image.open(source).save(target,lossless=True,method=6)
 records[name]={'url':f'/spin/optimized/{target.name}','bytes':target.stat().st_size,'source_sha256':sha(source),'sha256':sha(target)}
for i,(x,y,w,h) in enumerate(windows,1):
 source=root/f'public/spin/tasks/{i}.gif';target=out/f'task-{i}.mp4'
 subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-hide_banner','-loglevel','error','-y','-i',str(source),'-vf',f'crop={w}:{h}:{x}:{y},pad=ceil(iw/2)*2:ceil(ih/2)*2','-an','-c:v','libx264','-crf','20','-preset','slow','-pix_fmt','yuv420p','-fps_mode','vfr','-movflags','+faststart',str(target)],check=True)
 im=Image.open(source);duration=sum(f.info.get('duration',100) for f in ImageSequence.Iterator(im))/1000
 records[f'task-{i}']={'url':f'/spin/optimized/{target.name}','bytes':target.stat().st_size,'source_bytes':source.stat().st_size,'source_sha256':sha(source),'sha256':sha(target),'duration':duration,'frames':im.n_frames,'crop':[x,y,w,h],'width':w+(w%2),'height':h+(h%2)}
 print(i,target.stat().st_size,flush=True)
(root/'src/spin-media.json').write_text(json.dumps(records,indent=2)+'\n',encoding='utf-8')
(out/'manifest.json').write_text(json.dumps(records,indent=2)+'\n',encoding='utf-8')
