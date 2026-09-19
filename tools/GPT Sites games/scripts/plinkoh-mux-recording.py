import pathlib,json,subprocess,sys,wave,numpy as np
sys.path.insert(0,str(pathlib.Path.home()/'AppData/Local/Temp/gsg-media-deps'));import imageio_ffmpeg
root=pathlib.Path.cwd();p=root/'qa/plinkoh-20260919/recording';m=json.loads((p/'capture.json').read_text());offset=m['audioStart']-m['firstFrame'];ff=imageio_ffmpeg.get_ffmpeg_exe();cmd=[ff,'-v','error','-y','-f','concat','-safe','0','-i',str(p/'frames.txt')]
if offset<0:cmd+=['-ss',str(-offset)]
else:cmd+=['-itsoffset',str(offset)]
cmd+=['-i',str(p/'game-audio.webm'),'-map','0:v:0','-map','1:a:0','-c:v','libx264','-r','30','-pix_fmt','yuv420p','-crf','21','-c:a','aac','-b:a','160k','-shortest','-movflags','+faststart',str(root/'qa/plinkoh-20260919/gameplay-with-audio.mp4')];subprocess.run(cmd,check=True)
subprocess.run([ff,'-v','error','-y','-i',str(root/'qa/plinkoh-20260919/gameplay-with-audio.mp4'),'-vn','-ac','1','-ar','48000',str(p/'recorded-output.wav')],check=True)
with wave.open(str(p/'recorded-output.wav'),'rb') as w:a=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2')/32768;seconds=len(a)/w.getframerate()
report={'capturedFrames':m['frameCount'],'duration':seconds,'audioRms':float(np.sqrt(np.mean(a*a))),'audioPeak':float(np.max(np.abs(a))),'alignmentSeconds':offset,'scope':m['method'],'listeningAcceptance':'pending teacher A/B','nonzeroAudio':bool(np.max(np.abs(a))>.001)};(root/'qa/plinkoh-20260919/recording-report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
