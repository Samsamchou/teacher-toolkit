import sys,pathlib,subprocess,json,hashlib
sys.path.insert(0,str(pathlib.Path.home()/'AppData/Local/Temp/gsg-media-deps'))
import imageio_ffmpeg
from PIL import Image,ImageDraw
root=pathlib.Path.cwd(); out=root/'qa/plinkoh-20260919';out.mkdir(parents=True,exist_ok=True)
ff=imageio_ffmpeg.get_ffmpeg_exe(); src=root/'參考遊戲/plink oh.mp4'
times=[12,22,35,78,84,95,99,102,114,122,126,143,146,164,171]
canvas=Image.new('RGB',(1000,((len(times)+1)//2)*272),'#191326');draw=ImageDraw.Draw(canvas)
for i,t in enumerate(times):
 p=out/f'reference-{t}.jpg'
 subprocess.run([ff,'-v','error','-y','-ss',str(t),'-i',str(src),'-frames:v','1',str(p)],check=True)
 im=Image.open(p);im.thumbnail((500,248));x=(i%2)*500;y=(i//2)*272;canvas.paste(im,(x,y));draw.text((x+8,y+249),f'{t}s',fill='white')
canvas.save(out/'reference-contact.jpg')
subprocess.run([ff,'-v','error','-y','-i',str(src),'-vn','-ar','48000','-ac','1','-c:a','pcm_s16le',str(out/'reference-full.wav')],check=True)
print(json.dumps({'ffmpeg':ff,'frames':len(times),'sha256':hashlib.sha256(src.read_bytes()).hexdigest()}))
try:
 import numpy,scipy;print('numpy/scipy ready')
except ImportError as e:print(str(e))
