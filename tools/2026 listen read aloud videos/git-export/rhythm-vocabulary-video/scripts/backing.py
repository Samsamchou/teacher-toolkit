"""跟讀版本機伴奏（2026-11-14，RDQ-spec-follow-along-rhythm-20261114）。全部用 numpy 合成，不用任何外部音源。
style 1＝輕鼓＋拍手；2＝鼓＋拍手＋貝斯；3＝鼓＋貝斯＋跟讀拍三角鐵提示；4＝樣本 2＋跟讀第 1 拍三角鐵（老師 2026-11-14 選定）；5＝Super Fun 風格輕快流行（2026-11-28）；6＝5 的加強版：鐘琴主旋律（卡片段只在第 3–4 拍回應，不蓋人聲）、木琴點綴、每 8 小節鼓花、片尾加熱鬧（2026-11-28）：大鼓 1、3 拍＋3 拍後半拍、拍手 2、4 拍、8 分 hi-hat、跟和弦走的 8 分貝斯、C–G–Am–F 明亮和弦。"""
import math
import numpy as np
SR=48000
BPM=93.6734693877551;BEAT=60/BPM
def env(n,decay):return np.exp(-np.arange(n)/SR/decay)
def kick():
    n=int(.22*SR);t=np.arange(n)/SR;f=50+70*np.exp(-t/.035)
    return np.sin(2*np.pi*np.cumsum(f)/SR)*env(n,.09)*.9
def clap(rng):
    n=int(.16*SR);x=rng.standard_normal(n);X=np.fft.rfft(x);hz=np.fft.rfftfreq(n,1/SR);X[(hz<900)|(hz>5000)]=0
    y=np.fft.irfft(X,n);y/=abs(y).max();e=env(n,.045)
    for d in (0,.011,.022):e[:int(d*SR)+40]*=1  # 拍手的小連擊感
    return y*e*.45
def hat(rng):
    n=int(.05*SR);x=rng.standard_normal(n);X=np.fft.rfft(x);hz=np.fft.rfftfreq(n,1/SR);X[hz<7000]=0
    y=np.fft.irfft(X,n);y/=abs(y).max();return y*env(n,.012)*.18
def bass(freq,dur):
    n=int(dur*SR);t=np.arange(n)/SR
    y=np.sin(2*np.pi*freq*t)+.3*np.sin(4*np.pi*freq*t);a=np.minimum(1,np.arange(n)/(.008*SR))
    return y*a*env(n,.35)*.38
def ding():
    n=int(.9*SR);t=np.arange(n)/SR
    y=np.sin(2*np.pi*2637*t)+.5*np.sin(2*np.pi*3951*t)+.25*np.sin(2*np.pi*5274*t)
    return y*env(n,.28)*.16
def add(buf,x,at):
    i=int(round(at*SR));j=min(len(buf),i+len(x))
    if i<len(buf) and j>i:buf[i:j]+=x[:j-i]
NOTES=[130.81,110.0,87.31,98.0]   # C3 A2 F2 G2：每小節換一個根音
CHORDS=[(261.63,329.63,392.0),(246.94,293.66,392.0),(220.0,261.63,329.63),(220.0,261.63,349.23)]   # C G/B Am F
ROOTS=[130.81,98.0,110.0,87.31]
def pluck(freqs,dur):
    n=int(dur*SR);t=np.arange(n)/SR;y=np.zeros(n)
    for f in freqs:
        for h,a in((1,1),(2,.35),(3,.18),(4,.08)):y+=a*np.sin(2*np.pi*f*h*t)
    att=np.minimum(1,np.arange(n)/(.004*SR));return y*att*env(n,.22)*.10
def pop_bar(buf,t,bar_i,B,K,H,rng,drum_gain):
    ch=CHORDS[bar_i%4];root=ROOTS[bar_i%4]
    for b in range(4):
        tb=t+b*B
        if b in(0,2):add(buf,K,tb)
        if b==2:add(buf,K*.7,tb+B/2)
        if b in(1,3):add(buf,clap(rng)*drum_gain,tb)
        add(buf,H,tb);add(buf,H*.7,tb+B/2)
        for k in(0,1):add(buf,bass(root*(1 if k==0 else 2),B*.45)*.9,tb+k*B/2)
    for off in(0,1.5,2,3.5):add(buf,pluck(ch,B*.9),t+off*B)

def glock(f,dur=.5):
    n=int(dur*SR);t=np.arange(n)/SR
    y=np.sin(2*np.pi*f*t)+.4*np.sin(2*np.pi*f*2.76*t)*np.exp(-t/.05)+.15*np.sin(2*np.pi*f*5.4*t)*np.exp(-t/.02)
    return y*np.minimum(1,np.arange(n)/(.002*SR))*env(n,.28)*.16
def xylo(f,dur=.25):
    n=int(dur*SR);t=np.arange(n)/SR
    y=np.sin(2*np.pi*f*t)+.5*np.sin(2*np.pi*f*3.93*t)*np.exp(-t/.03)
    return y*np.minimum(1,np.arange(n)/(.001*SR))*env(n,.07)*.13
def tamb(rng):
    n=int(.09*SR);x=rng.standard_normal(n);X=np.fft.rfft(x);hz=np.fft.rfftfreq(n,1/SR);X[hz<5000]=0
    y=np.fft.irfft(X,n);y/=abs(y).max();return y*env(n,.03)*.16
def whoosh(seed=3,dur=.32):
    """換卡音效：往上掃的濾波噪音＋一聲叮（程式合成）"""
    rng=np.random.default_rng(seed);n=int(dur*SR);x=rng.standard_normal(n);out=np.zeros(n);step=int(.01*SR)
    for i in range(0,n,step):
        seg=x[i:i+step];f=600+5400*(i/n)**1.4;X=np.fft.rfft(seg);hz=np.fft.rfftfreq(len(seg),1/SR);X[(hz<f*.5)|(hz>f*1.6)]=0;out[i:i+step]=np.fft.irfft(X,len(seg))
    out/=abs(out).max()+1e-9;e=np.sin(np.pi*np.arange(n)/n)**1.5;y=out*e*.22
    d=glock(1568.0,.5)*1.4;y=np.pad(y,(0,max(0,len(d)-len(y))));y[int(.18*SR):int(.18*SR)+len(d)]+=d[:len(y)-int(.18*SR)]
    return y
MELODY=[[659.25,0,783.99,0,880.0,783.99,659.25,0],[587.33,0,783.99,0,987.77,0,783.99,0],
        [523.25,0,659.25,0,880.0,783.99,659.25,0],[698.46,0,880.0,0,1046.5,0,880.0,783.99]]
def pop6(buf,t0,n_bars,B,K,H,rng,drum_gain,intro_bars=4,outro_bar=None):
    for bar in range(n_bars):
        t=t0+bar*4*B;sec='intro' if bar<intro_bars else ('outro' if outro_bar is not None and bar>=outro_bar else 'cards')
        ch=CHORDS[bar%4];root=ROOTS[bar%4];mel=MELODY[bar%4]
        for b in range(4):
            tb=t+b*B
            if sec!='intro' or bar>=intro_bars-2:
                if b in(0,2):add(buf,K,tb)
                if b==2:add(buf,K*.7,tb+B/2)
            if b in(1,3):add(buf,clap(rng)*drum_gain*(1.25 if sec=='outro' else 1),tb)
            add(buf,H,tb);add(buf,H*.7,tb+B/2)
            if sec=='outro':add(buf,tamb(rng)*drum_gain,tb+B/2)
            for k in(0,1):add(buf,bass(root*(1 if k==0 else 2),B*.45)*.9,tb+k*B/2)
        for off in(0,1.5,2,3.5):add(buf,pluck(ch,B*.9)*(1.3 if sec=='outro' else 1),t+off*B)
        for i,f in enumerate(mel):   # 鐘琴：前奏、片尾整句；卡片段只在後半小節（人聲在前半）
            if f and (sec!='cards' or i>=4):add(buf,glock(f)*(1.15 if sec=='outro' else 1),t+i*B/2)
        if sec=='cards' and bar%2==1:
            for i,f in enumerate((1046.5,1318.5,1568.0)):add(buf,xylo(f),t+3*B+i*B/3)
        if bar%8==7 and sec!='outro':   # 鼓花：每 8 小節最後一拍 16 分音符
            for i in range(4):add(buf,clap(rng)*drum_gain*(.5+.15*i),t+3*B+i*B/4)

def backing(n_beats,t0,style,student_beats=(),seed=7,beat=None,ding_gain=1.0,drum_gain=1.0,intro_bars=4,outro_bar=None):
    """t0＝第 0 拍的時間；student_beats＝學生跟讀的拍號（style 3 在每段跟讀第 1 拍加三角鐵）"""
    B=beat or BEAT;rng=np.random.default_rng(seed);buf=np.zeros(int((t0+n_beats*B+1.5)*SR))
    K,H=kick()*drum_gain,hat(rng)*drum_gain
    if style==6:
        pop6(buf,t0,math.ceil(n_beats/4),B,K,H,rng,drum_gain,intro_bars,outro_bar);return buf
    if style==5:
        for bar in range(math.ceil(n_beats/4)):pop_bar(buf,t0+bar*4*B,bar,B,K,H,rng,drum_gain)
        return buf
    for b in range(n_beats):
        t=t0+b*B
        if b%2==0:add(buf,K,t)
        if b%2==1 and style in(1,2,4):add(buf,clap(rng)*drum_gain,t)
        if b%2==1 and style==3:add(buf,clap(rng)*.5*drum_gain,t)
        add(buf,H,t);add(buf,H*.6,t+B/2)
        if style in(2,3,4):add(buf,bass(NOTES[(b//4)%4],B*.9),t)
        if style in(3,4) and b in student_beats and (b-1) not in student_beats:add(buf,ding()*ding_gain,t)
    return buf
