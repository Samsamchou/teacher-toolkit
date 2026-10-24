"""Read-only media inspection and full decode. Requires ffprobe and ffmpeg."""
import argparse,json,subprocess,hashlib
from pathlib import Path
from fractions import Fraction

def check(path,ffprobe,ffmpeg,duration,width,height,fps):
    probe=json.loads(subprocess.check_output([ffprobe,'-v','error','-show_streams','-show_format','-of','json',str(path)]))
    streams=probe['streams'];v=next(s for s in streams if s['codec_type']=='video');has_audio=any(s['codec_type']=='audio' for s in streams)
    d=subprocess.run([ffmpeg,'-v','error','-nostdin','-i',str(path),'-f','null','-'],capture_output=True,text=True)
    actual=float(probe['format']['duration']);rate=float(Fraction(v['avg_frame_rate']))
    checks={'dimensions':(v['width'],v['height'])==(width,height),'fps':abs(rate-fps)<.001,'duration':abs(actual-duration)<=max(2/fps,.1),'audio_present':has_audio,'full_decode':d.returncode==0 and not d.stderr.strip()}
    return {'file':str(path.resolve()),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'seconds':actual,'checks':checks,'passed':all(checks.values()),'audio_alignment_verified':False,'visual_quality_verified':False,'teacher_accepted':False}
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('video');p.add_argument('--ffprobe',default='ffprobe');p.add_argument('--ffmpeg',default='ffmpeg');p.add_argument('--duration',required=True,type=float);p.add_argument('--width',type=int,default=1920);p.add_argument('--height',type=int,default=1080);p.add_argument('--fps',type=float,default=30);p.add_argument('--output');a=p.parse_args()
    if a.duration<=0 or a.fps<=0:p.error('Duration and fps must be positive')
    if a.output and Path(a.output).exists():p.error('Report already exists; choose a new path')
    r=check(Path(a.video),a.ffprobe,a.ffmpeg,a.duration,a.width,a.height,a.fps);text=json.dumps(r,ensure_ascii=True,indent=2)
    if a.output:Path(a.output).write_text(text,encoding='utf8')
    print(text);raise SystemExit(0 if r['passed'] else 1)
