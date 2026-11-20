# usage: TIMING=timing.json python3 sfx.py  -> sfx.wav (sound effects auto-placed from the shot list)
import json, sys, os, numpy as np, wave
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'examples'))
import money_explainer as S
from engine import W
SR=44100
events=[]
def collect(shots, off):
    for i,sh in enumerate(shots):
        if i>0: events.append((off+sh.t0-0.15,'whoosh'))
        if not sh.ov: continue
        cur={'t0':sh.t0}
        def mk(kind, idx):
            def f(*a, **k):
                events.append((off+cur['t0']+a[idx], kind))
            return f
        saved={n:getattr(S,n) for n in ('tag','stamp','icon','bigword','caption','card','counter','arrow_label','speech','qlist','flow')}
        S.tag=mk('pop',2); S.stamp=mk('thud',2); S.icon=mk('pop',2); S.bigword=mk('boom',2); S.caption=mk('swish',2)
        S.card=mk('paper',2); S.counter=mk('coins',2); S.arrow_label=mk('swish',2)
        def sp(c, lt, ch, t0, t1, txt, **k):
            events.append((off+cur['t0']+t0,'pop')); n=min(len(txt), 40); d=min(1.2,(t1-t0)*0.4)
            for j in range(0,n,3): events.append((off+cur['t0']+t0+0.1+d*j/n,'tick'))
        S.speech=sp
        def ql(c, lt, x, y, title, items, **k):
            t0=k.get('t0',0); events.append((off+cur['t0']+t0,'paper'))
            for it in items: events.append((off+cur['t0']+it[0],'ding' if it[2]=='check' else 'tock'))
        S.qlist=ql
        def fl(c, lt, t0, t1, *a, **k): events.append((off+cur['t0']+t0,'paper')); events.append((off+cur['t0']+t1,'paper'))
        S.flow=fl
        sh.ov(None, 1e6)
        for n,v in saved.items(): setattr(S,n,v)
p1=S.part1(); p2=S.part2(); off2=S.TIM[0][-1]['t1']
collect(p1,0); collect(p2,off2)
total=off2+S.TIM[1][-1]['t1']
rng=np.random.default_rng(1)
def env(n,a=0.003,dec=8): t=np.arange(n)/SR; return np.minimum(1,t/a)*np.exp(-t*dec)
def snd(kind):
    if kind=='pop':
        n=int(.12*SR); t=np.arange(n)/SR; f=900*np.exp(-t*25)+300; return 0.5*np.sin(2*np.pi*np.cumsum(f)/SR)*env(n,0.002,30)
    if kind=='whoosh':
        n=int(.5*SR); x=rng.standard_normal(n); t=np.arange(n)/SR
        y=np.convolve(x,np.ones(30)/30,'same'); e=np.sin(np.pi*t/0.5)**2; return 0.35*y*e/np.abs(y).max()
    if kind=='swish':
        n=int(.28*SR); x=rng.standard_normal(n); y=x-np.convolve(x,np.ones(8)/8,'same'); t=np.arange(n)/SR; return 0.12*y*np.sin(np.pi*t/0.28)**2
    if kind=='thud':
        n=int(.35*SR); t=np.arange(n)/SR; f=140*np.exp(-t*12)+50
        return 0.9*np.sin(2*np.pi*np.cumsum(f)/SR)*env(n,0.001,14)+0.25*rng.standard_normal(n)*env(n,0.001,60)
    if kind=='boom':
        n=int(.6*SR); t=np.arange(n)/SR; f=90*np.exp(-t*5)+40; return 0.7*np.sin(2*np.pi*np.cumsum(f)/SR)*env(n,0.004,6)
    if kind=='tick':
        n=int(.03*SR); return 0.18*rng.standard_normal(n)*env(n,0.0005,180)
    if kind=='tock':
        n=int(.08*SR); t=np.arange(n)/SR; return 0.4*np.sin(2*np.pi*1200*t)*env(n,0.001,60)
    if kind=='ding':
        n=int(.6*SR); t=np.arange(n)/SR; return 0.3*(np.sin(2*np.pi*1320*t)+0.5*np.sin(2*np.pi*1980*t))*env(n,0.002,7)
    if kind=='paper':
        n=int(.25*SR); x=rng.standard_normal(n); y=x-np.convolve(x,np.ones(4)/4,'same'); t=np.arange(n)/SR; return 0.2*y*np.sin(np.pi*t/0.25)
    if kind=='coins':
        out=np.zeros(int(1.0*SR))
        for k in range(10):
            s=int(k*0.08*SR); n=int(.15*SR); t=np.arange(n)/SR; fr=rng.uniform(2500,4200)
            out[s:s+n]+=0.15*np.sin(2*np.pi*fr*t)*env(n,0.001,30)
        return out
track=np.zeros(int((total+1)*SR))
seen=set()
for t,k in sorted(events):
    key=(round(t,2),k)
    if key in seen or t<0: continue
    seen.add(key); s=snd(k); i=int(t*SR); track[i:i+len(s)]+=s[:len(track)-i]
# soft room ambience
amb=np.convolve(rng.standard_normal(len(track)),np.ones(200)/200,'same')*0.02
track+=amb
track=np.clip(track,-1,1)
with wave.open('sfx.wav','w') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((track*32767*0.9).astype(np.int16).tobytes())
from collections import Counter; print(len(seen), Counter(k for _,k in seen), total)
