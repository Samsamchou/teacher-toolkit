import sys,pathlib,json,subprocess,math
sys.path.insert(0,str(pathlib.Path.home()/'AppData/Local/Temp/gsg-media-deps'))
import imageio_ffmpeg
from PIL import Image,ImageDraw,ImageChops,ImageStat
root=pathlib.Path.cwd();out=root/'qa/spin-fastload-20260915';out.mkdir(parents=True,exist_ok=True)
data=json.loads((root/'src/spin-media.json').read_text());sheet=Image.new('RGB',(800,8*240),'white');draw=ImageDraw.Draw(sheet);report=[]
for i in range(1,9):
 m=data[f'task-{i}'];gif=Image.open(root/f'public/spin/tasks/{i}.gif');t=m['duration']/2;elapsed=0
 for f in range(gif.n_frames):
  gif.seek(f);elapsed+=gif.info.get('duration',100)/1000
  if elapsed>t:break
 x,y,w,h=m['crop'];ref=gif.convert('RGB').crop((x,y,x+w,y+h));target=out/f'task-{i}-decoded.png'
 subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-loglevel','error','-y','-i',str(root/('public'+m['url'])),'-vf',f'select=eq(n\,{f})','-frames:v','1',str(target)],check=True)
 frame=Image.open(target).convert('RGB').crop((0,0,w,h));ref.thumbnail((360,215));frame.thumbnail((360,215));sheet.paste(ref,(10,(i-1)*240+25));sheet.paste(frame,(410,(i-1)*240+25));draw.text((10,(i-1)*240+5),f'Task {i}: original GIF',fill='black');draw.text((410,(i-1)*240+5),'MP4 at same frame index',fill='black')
 frames,seconds=imageio_ffmpeg.count_frames_and_secs(str(root/('public'+m['url'])))
 report.append({'task':i,'original_seconds':m['duration'],'video_seconds':seconds,'video_frames':frames,'original_frames':m['frames'],'bytes':m['bytes']})
sheet.save(out/'comparison.jpg');(out/'media-check.json').write_text(json.dumps(report,indent=2))
print(json.dumps(report))
