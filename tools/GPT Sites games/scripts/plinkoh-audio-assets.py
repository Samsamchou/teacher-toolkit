import pathlib,wave,json,hashlib,numpy as np
root=pathlib.Path.cwd();qa=root/'qa/plinkoh-20260919';out=root/'public/plinkoh/audio';out.mkdir(parents=True,exist_ok=True);ref=qa/'audio';ref.mkdir(exist_ok=True)
with wave.open(str(qa/'reference-full.wav'),'rb') as w:sr=w.getframerate();audio=np.frombuffer(w.readframes(w.getnframes()),dtype='<i2').astype(float)/32768

def write(path,x):
 x=np.asarray(x);x=np.nan_to_num(x);x=np.clip(x,-.98,.98)
 with wave.open(str(path),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr);w.writeframes((x*32767).astype('<i2').tobytes())
 return {'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'bytes':path.stat().st_size,'seconds':len(x)/sr,'rms':float(np.sqrt(np.mean(x*x))),'peak':float(np.max(np.abs(x)))}
def denoise(x,noise):
 n=1024;hop=256;win=np.hanning(n);xp=np.pad(x,(n,n));frames=np.lib.stride_tricks.sliding_window_view(xp,n)[::hop];z=np.fft.rfft(frames*win);nf=np.lib.stride_tricks.sliding_window_view(np.pad(noise,(0,n)),n)[::hop];floor=np.median(np.abs(np.fft.rfft(nf*win)),axis=0);mag=np.abs(z);gain=np.maximum(.07,1-1.5*floor/(mag+1e-9));y=np.zeros(len(xp)+n);weight=np.zeros_like(y)
 for i,f in enumerate(np.fft.irfft(z*gain)):y[i*hop:i*hop+n]+=f*win;weight[i*hop:i*hop+n]+=win**2
 return (y/(weight+1e-9))[n:n+len(x)]
# Event mapping is a candidate inferred from frame/energy timing, pending teacher A/B.
cues=[('ui',21.018,.19,'UI confirmation','candidate isolated'),('peg',99.635,.32,'Ordinary peg','mixed candidate'),('pink',146.028,.32,'Pink peg','mixed candidate'),('reveal',103.02,.68,'Score reveal','mixed candidate'),('transfer',104.05,.4,'Score transfer','mixed candidate'),('team',124.85,.6,'Team entrance','mixed candidate'),('round',123.5,.9,'Round entrance','mixed candidate')]
records=[]
for key,start,duration,label,source in cues:
 x=audio[int(start*sr):int((start+duration)*sr)].copy();rp=ref/f'{key}-reference.wav';rm=write(rp,x)
 y=denoise(x,audio[int((start-.4)*sr):int((start-.08)*sr)]) if source.startswith('mixed') else x.copy()
 fade=min(240,len(y)//8);y[:fade]*=np.linspace(0,1,fade);y[-fade:]*=np.linspace(1,0,fade);peak=np.max(np.abs(y));y*=min(2,.65/max(peak,.001))
 p=out/f'{key}.wav';stats=write(p,y);spectrum=np.abs(np.fft.rfft(y))**2;freq=np.fft.rfftfreq(len(y),1/sr)
 records.append({'eventId':key,'label':label,'sourceTime':[start,start+duration],'sourceStatus':source,'evidence':'INFERRED event mapping; MEASURED signal','processing':'spectral subtraction of preceding noise estimate; fades; bounded normalization' if source.startswith('mixed') else 'trim, fades, bounded normalization','reference':'/qa/plinkoh-20260919/audio/'+rp.name,'url':'/plinkoh/audio/'+p.name,'referenceStats':rm,**stats,'spectralCentroidHz':float(np.sum(freq*spectrum)/max(np.sum(spectrum),1e-12)),'abStatus':'pending teacher listening','rights':'user supplied video; reference-derived local evaluation candidate; publication clearance not established','trigger':key+' event with unique event id','overlap':True,'stop':'pause, hidden, restart, exit','volume':.6})
# Harmonic masking removes transient peaks from a music-only visual wait interval; residuals remain possible.
x=audio[int(84.7*sr):int(88.7*sr)];n=2048;hop=512;win=np.hanning(n);xp=np.pad(x,(n,n));frames=np.lib.stride_tricks.sliding_window_view(xp,n)[::hop];z=np.fft.rfft(frames*win);mag=np.abs(z);pad=np.pad(mag,((8,8),(0,0)),mode='edge');h=np.median(np.lib.stride_tricks.sliding_window_view(pad,17,axis=0),axis=-1);mask=h*h/(h*h+np.maximum(mag-h,0)**2+1e-12);y=np.zeros(len(xp)+n);weight=np.zeros_like(y)
for i,f in enumerate(np.fft.irfft(z*mask)):y[i*hop:i*hop+n]+=f*win;weight[i*hop:i*hop+n]+=win**2
y=(y/(weight+1e-9))[n:n+len(x)];fade=int(.15*sr);y[:fade]*=np.linspace(0,1,fade);y[-fade:]*=np.linspace(1,0,fade);y*=min(3,.32/max(np.max(np.abs(y)),.001));stats=write(out/'music.wav',y);rm=write(ref/'music-reference.wav',x)
records.append({'eventId':'music','label':'Background music loop candidate','sourceTime':[84.7,88.7],'sourceStatus':'mixed harmonic-filtered candidate','processing':'temporal median harmonic mask and 150ms edge fades; audible loop/residuals need listening','evidence':'INFERRED separation; MEASURED signal','reference':'/qa/plinkoh-20260919/audio/music-reference.wav','url':'/plinkoh/audio/music.wav','referenceStats':rm,**stats,'abStatus':'pending teacher listening','rights':'user supplied video; local evaluation only; publication clearance not established','trigger':'active game','overlap':False,'stop':'pause, hidden, restart, exit','volume':.28})
for i,(a,b) in enumerate([(95,105),(113,123),(142,152),(160,169)],1):write(ref/f'mixed-drop-{i}.wav',audio[int(a*sr):int(b*sr)])
manifest={'source':'參考遊戲/plink oh.mp4','sourceSha256':'bce91c6b1ef61aee77ad93d72223b5ebd6f579ce549e6fe50d70adc6a1732dab','sampleRate':sr,'channels':1,'status':'local audition candidates, NOT approved fidelity','cues':records,'unmapped':['drop','wall','landing','victory','special effects'],'unmappedPolicy':'No invented cue; silent until supported by evidence.'}
(out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');(qa/'audio-cue-sheet.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print('8 candidate sounds; 8 paired references; 4 mixed-drop references; hashes verified on write')
