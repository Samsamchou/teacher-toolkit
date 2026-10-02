"""Exact-request speech cache and local 0.85 processing; reviewed anchors stay explicit."""
from __future__ import annotations
import argparse, io, os, re, urllib.error, urllib.request, wave
from datetime import datetime, timezone
from pathlib import Path
from media_core import *

TEACHER='Read exactly the supplied single vocabulary term, once. You are a warm American English elementary-school teacher demonstrating clear pronunciation for children. Use natural word stress, a friendly clear voice and crisp consonants. Speak at a moderate natural pace, with a lively but controlled rhythm. Do not sing. Do not add introductions, counts, punctuation names, music, sound effects, or any extra words. Leave only a brief natural pause before and after the term.'
CHILD='Read exactly the supplied single vocabulary term, once, in a light, bright, youthful American English voice, like a cheerful elementary-school student confidently repeating a teacher\'s word. Use a naturally higher register and small, light vocal resonance, with clear consonants and natural word stress. Sound friendly and attentive. Keep a moderate, natural pace. Do not sound like an adult classroom instructor. Avoid exaggerated cartoon squeaks, baby talk, breathiness, singing or shouting. Do not add introductions, counts, music, sound effects, or any extra words. Leave only a brief natural pause before and after the term.'

def key_from_private_store():
    key=os.environ.get('OPENAI_API_KEY','').strip()
    if not key:
        private=Path('C:/Users/User/.codex/.env.local')
        if private.is_file():
            for line in private.read_text(encoding='utf-8-sig').splitlines():
                m=re.match(r'^\s*(?:export\s+)?OPENAI_API_KEY\s*=\s*[\"\']?(sk-[A-Za-z0-9_-]{16,})[\"\']?\s*(?:#.*)?$',line)
                if m:key=m[1];break
    if not re.fullmatch(r'sk-[A-Za-z0-9_-]{16,}',key):raise ValueError('Authorized private API key unavailable; no request made.')
    return key

def generate(root,manifest,execute=False,approved=False,reuse_key=False):
    job=read_json(resolve(root,manifest));cache=output_path(root,job['cache_dir']);prepared=[]
    for item in job['requests']:
        role=item['role']
        if role not in ('teacher','child'):raise ValueError('Unknown speech role.')
        payload={'model':job.get('model','gpt-4o-mini-tts'),'voice':item.get('voice','marin' if role=='teacher' else 'coral'),
                 'input':item['spoken_text'],'instructions':item.get('instructions',TEACHER if role=='teacher' else CHILD),'response_format':'wav'}
        if not payload['input'].strip():raise ValueError('Empty spoken text.')
        identity=fingerprint(payload);dest=cache/identity;raw=dest/'raw.wav';meta=dest/'raw.json'
        existing=False
        if raw.exists() and meta.exists():
            rec=read_json(meta)
            if rec['request']!=payload or sha(raw)!=rec['sha256']:raise ValueError('Changed speech cache; preserve and inspect.')
            existing=True
        elif dest.exists():raise ValueError('Incomplete/unknown-outcome request retained; inspect it before any retry.')
        prepared.append((item,payload,dest,existing))
    missing=sum(not p[3] for p in prepared)
    if missing>int(job.get('max_new_requests',0)):raise ValueError('Required new requests exceed this job request limit.')
    if not execute:
        print(json.dumps({'requests':len(prepared),'cache_hits':len(prepared)-missing,'new_requests':missing,'sent':0}));return
    if missing and not (approved and reuse_key and job.get('authorization_note')):raise ValueError('Explicit current-task paid and key-use authorization required.')
    key=key_from_private_store() if missing else None;records=[]
    for item,payload,dest,existing in prepared:
        if not existing:
            dest.mkdir(parents=True,exist_ok=False)
            save_json(dest/'attempt.json',{'timestamp_utc':datetime.now(timezone.utc).isoformat(),'request_fingerprint':fingerprint(payload),
                                         'status':'sent_or_outcome_unknown','authorization_note':job['authorization_note']})
            req=urllib.request.Request('https://api.openai.com/v1/audio/speech',data=json.dumps(payload).encode(),
                                       headers={'Authorization':'Bearer '+key,'Content-Type':'application/json'},method='POST')
            try:
                with urllib.request.urlopen(req,timeout=120) as response:data=response.read();request_id=response.headers.get('x-request-id')
            except urllib.error.HTTPError as error:
                save_json(dest/'error.json',{'http_status':error.code,'request_id':error.headers.get('x-request-id'),'retry':'none; review before bounded retry'})
                raise ValueError('Speech API failed with HTTP '+str(error.code)+'; no fallback or automatic retry.')
            except (urllib.error.URLError,TimeoutError):
                raise ValueError('Speech outcome unknown; retained attempt and stopped without retry.')
            with wave.open(io.BytesIO(data)) as f:
                pcm=f.readframes(f.getnframes());duration=len(pcm)/f.getsampwidth()/f.getnchannels()/f.getframerate()
            if duration<=0:raise ValueError('Empty generated WAV; attempt retained.')
            (dest/'raw.wav').write_bytes(data)
            save_json(dest/'raw.json',{'kind':'normal-speed-source','request':payload,'sha256':sha(dest/'raw.wav'),'speed':1,
                                      'request_id':request_id,'timestamp_utc':datetime.now(timezone.utc).isoformat(),'duration_sec':duration,
                                      'usage':None,'actual_charge':None,'voice_note':'Built-in synthetic voice; coral is directed to sound youthful, not a real child recording.'})
        records.append({'spoken_text':item['spoken_text'],'role':item['role'],'voice':payload['voice'],
                        'path':str((dest/'raw.wav').relative_to(root)),'sha256':sha(dest/'raw.wav'),
                        'source_record':str((dest/'raw.json').relative_to(root))})
    index=cache/'raw-index.json'
    if index.exists():
        if read_json(index)['records']!=records:raise ValueError('Cache index belongs to another request set; use another cache_dir.')
    else:save_json(index,{'records':records})
    print(json.dumps({'index':str(index),'new_requests':missing,'reused':len(records)-missing},ensure_ascii=False))

def prepare(root,index,out,speed=.85):
    dest=output_path(root,out)
    if dest.exists():raise ValueError('Processed output exists; preserve and use a new version.')
    sources=read_json(resolve(root,index))['records'];loaded=[]
    for r in sources:
        source=verified_asset(root,r);meta=read_json(resolve(root,r['source_record']))
        if meta.get('kind')!='normal-speed-source' or meta.get('speed')!=1 or meta.get('sha256')!=sha(source):
            raise ValueError('Normal-speed source record required; prevents double 0.85 processing.')
        loaded.append((r,audio(source)))
    dest.mkdir(parents=True);records=[]
    for number,(r,x) in enumerate(loaded,1):
        active=np.flatnonzero(abs(x)>max(float(abs(x).max())*.007,.0004))
        if not len(active):raise ValueError('Silent source; stopped.')
        lo=max(0,int(active[0])-round(.08*SR));hi=min(len(x),int(active[-1])+round(.13*SR));x=x[lo:hi].copy()
        x*=min(10**(-19/20)/float(np.sqrt(np.mean(x*x))),10**(-2/20)/float(abs(x).max()))
        fade=min(round(.004*SR),len(x)//10);x[:fade]*=np.linspace(0,1,fade);x[-fade:]*=np.linspace(1,0,fade)
        normal=dest/f'{number:03d}-normal.wav';wav(normal,x)
        pad=round(.5*SR);padded=dest/f'{number:03d}-padded.wav';wav(padded,np.pad(x,(pad,pad)))
        stretched=dest/f'{number:03d}-stretched.wav';filt=f'rubberband=tempo={speed}:pitch=1:formant=preserved:pitchq=quality'
        run(['ffmpeg','-v','error','-n','-i',padded,'-af',filt,'-c:a','pcm_s24le',stretched])
        result=audio(stretched);start=round(pad/speed);length=round(len(x)/speed)
        if len(result)<start+length:raise ValueError('Incomplete stretched signal.')
        y=result[start:start+length];target=dest/f'{number:03d}-processed.wav';wav(target,y)
        active=np.flatnonzero(abs(y)>max(float(abs(y).max())*.008,.0004))
        rec={**r,'path':str(target.relative_to(root)),'sha256':sha(target),'speed':speed,'filter':filt,
             'source_sha256':r['sha256'],'source_trim_sec':[lo/SR,hi/SR],'normal_path':str(normal.relative_to(root)),
             'input_samples':len(x),'output_samples':len(y),'effective_speed':len(x)/len(y),'pitch_parameter':1,
             'audible_last_sec':int(active[-1])/SR,'anchor_sample':None,'anchor_reviewed':False}
        run(['ffmpeg','-v','error','-n','-i',target,'-lavfi','showspectrumpic=s=1200x420:legend=1:scale=log:fscale=lin:stop=5000:color=intensity','-frames:v','1',dest/f'{number:03d}-spectrum.png'])
        records.append(rec)
    save_json(dest/'unreviewed-bank.json',{'records':records,'status':'requires_spectrogram_review_and_anchor_windows'})
    print(json.dumps({'processed':len(records),'bank':str(dest/'unreviewed-bank.json'),'api_calls':0}))

def anchor(root,bank,windows,out):
    records=read_json(resolve(root,bank))['records'];reviews=read_json(resolve(root,windows))['reviews'];result=[]
    for r in records:
        choices=[w for w in reviews if w['spoken_text']==r['spoken_text'] and w['role']==r['role']]
        if len(choices)!=1 or choices[0].get('spectrogram_reviewed') is not True:raise ValueError('Each clip needs one inspected anchor window.')
        w=choices[0];x=audio(verified_asset(root,r));lo,hi=w['window_sec']
        if not 0<=lo<hi<=len(x)/SR:raise ValueError('Anchor window outside clip.')
        ft=np.fft.rfft(x.astype(float));hz=np.fft.rfftfreq(len(x),1/SR);ft[(hz<100)|(hz>1200)]=0
        t,e=rms_curve(np.fft.irfft(ft,n=len(x)),win=.030,hop=.001);ix=np.flatnonzero((t>=lo)&(t<=hi))
        if not len(ix):raise ValueError('Empty anchor window.')
        if w.get('selector')=='energy-rise':
            rise=e-np.r_[np.zeros(10),e[:-10]];j=int(ix[np.argmax(rise[ix])])
        else:
            peak=int(ix[np.argmax(e[ix])]);candidates=ix[(ix<=peak)&(e[ix]>=.5*e[peak])];j=int(candidates[0])
        if j in (ix[0],ix[-1]):raise ValueError('Anchor touches search boundary; inspect and adjust window.')
        result.append({**r,'anchor_sample':round(t[j]*SR),'anchor_reviewed':True,'anchor_review':w,'anchor_method':'reviewed 100–1200Hz energy window'})
    save_json(output_path(root,out),{'records':result,'teacher_listening_acceptance':'pending'})
    print(json.dumps({'reviewed':len(result),'api_calls':0}))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('stage',choices=['generate','prepare','anchor']);p.add_argument('--project',type=Path,default=Path.cwd())
    p.add_argument('--manifest');p.add_argument('--index');p.add_argument('--out');p.add_argument('--bank');p.add_argument('--windows');p.add_argument('--speed',type=float,default=.85)
    p.add_argument('--execute',action='store_true');p.add_argument('--approved-paid-generation',action='store_true');p.add_argument('--approved-reuse-key',action='store_true');a=p.parse_args();root=a.project.resolve()
    try:
        if a.stage=='generate':generate(root,a.manifest,a.execute,a.approved_paid_generation,a.approved_reuse_key)
        elif a.stage=='prepare':prepare(root,a.index,a.out,a.speed)
        else:anchor(root,a.bank,a.windows,a.out)
    except (ValueError,OSError,KeyError,subprocess.CalledProcessError) as e:raise SystemExit('Speech stage stopped: '+str(e))
