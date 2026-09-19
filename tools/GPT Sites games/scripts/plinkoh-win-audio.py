import pathlib,numpy as np,wave,json,hashlib,datetime
root=pathlib.Path.cwd();sr=48000;duration=5.;n=int(sr*duration);audio=np.zeros((n,2));rand=np.random.default_rng(19192026)
def brass(start,length,freq,amp):
 count=min(int(length*sr),n-int(start*sr));t=np.arange(count)/sr;env=np.minimum(t/.018,1)*np.minimum((length-t)/.15,1);env=np.maximum(0,env)*np.exp(-t*.45);v=np.zeros(count)
 for h in range(1,9):v+=np.sin(2*np.pi*freq*h*t+0.012*np.sin(2*np.pi*5.5*t))*np.exp(-h/4)/h**.55
 i=int(start*sr);audio[i:i+count,0]+=amp*env*v;audio[i:i+count,1]+=amp*env*(v*.96+.025*np.sin(2*np.pi*freq*1.003*t))
for t,f,l in [(0,523.25,.3),(.3,523.25,.25),(.55,659.25,.3),(.85,783.99,.35),(1.2,1046.5,.65),(1.9,783.99,.3),(2.2,1046.5,.3),(2.5,1318.51,.45),(3.0,1046.5,.4)]:brass(t,l,f,.10)
for f in [261.63,523.25,659.25,783.99,1046.5]:brass(3.45,1.55,f,.055)
# Deterministic layered clap bursts and a diffuse filtered crowd-like noise bed.
for j in range(90):
 start=.45+rand.random()*4.4;length=.025+rand.random()*.065;count=min(int(length*sr),n-int(start*sr));t=np.arange(count)/sr;noise=rand.normal(0,1,count);noise=np.convolve(noise,[.25,.5,.25],mode='same');env=np.exp(-t/(length*.18));gain=.018+rand.random()*.04;pan=rand.random();i=int(start*sr);audio[i:i+count,0]+=noise*env*gain*(.35+pan);audio[i:i+count,1]+=noise*env*gain*(1.35-pan)
noise=rand.normal(0,1,n);freq=np.fft.rfftfreq(n,1/sr);z=np.fft.rfft(noise);z*=np.exp(-((freq-1100)/1100)**2);bed=np.fft.irfft(z,n);t=np.arange(n)/sr;env=np.minimum(t/1,1)*np.minimum((5-t)/.35,1);audio[:,0]+=bed*env*.014;audio[:,1]+=np.roll(bed,337)*env*.014
audio[-int(.08*sr):]*=np.linspace(1,0,int(.08*sr))[:,None];audio*=.86/max(np.max(np.abs(audio)),.01);pcm=(np.clip(audio,-1,1)*32767).astype('<i2');p=root/'public/plinkoh/audio/win.wav'
with wave.open(str(p),'wb') as w:w.setnchannels(2);w.setsampwidth(2);w.setframerate(sr);w.writeframes(pcm.tobytes())
meta={'eventId':'win','seconds':duration,'sampleRate':sr,'channels':2,'frames':n,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size,'rms':float(np.sqrt(np.mean(audio**2))),'peak':float(np.max(np.abs(audio))),'source':'Original deterministic PCM synthesis: brass-like harmonic fanfare, clap bursts, filtered noise bed. No external samples.','evidence':'EXTENSION approved by RDQ','generator':'scripts/plinkoh-win-audio.py','createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'abStatus':'pending teacher listening','stop':'5 seconds, skip, pause, exit, restart; master mute honored'}
(p.with_suffix('.json')).write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps(meta))
