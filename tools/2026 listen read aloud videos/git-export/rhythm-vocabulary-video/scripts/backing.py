"""跟讀版本機伴奏（2026-11-14，RDQ-spec-follow-along-rhythm-20261114）。全部用 numpy 合成，不用任何外部音源。
style 1＝輕鼓＋拍手；2＝鼓＋拍手＋貝斯；3＝鼓＋貝斯＋跟讀拍三角鐵提示；4＝樣本 2＋跟讀第 1 拍三角鐵（老師 2026-11-14 選定）。"""
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
def backing(n_beats,t0,style,student_beats=(),seed=7,beat=None,ding_gain=1.0,drum_gain=1.0):
    """t0＝第 0 拍的時間；student_beats＝學生跟讀的拍號（style 3 在每段跟讀第 1 拍加三角鐵）"""
    B=beat or BEAT;rng=np.random.default_rng(seed);buf=np.zeros(int((t0+n_beats*B+1.5)*SR))
    K,H=kick()*drum_gain,hat(rng)*drum_gain
    for b in range(n_beats):
        t=t0+b*B
        if b%2==0:add(buf,K,t)
        if b%2==1 and style in(1,2,4):add(buf,clap(rng)*drum_gain,t)
        if b%2==1 and style==3:add(buf,clap(rng)*.5*drum_gain,t)
        add(buf,H,t);add(buf,H*.6,t+B/2)
        if style in(2,3,4):add(buf,bass(NOTES[(b//4)%4],B*.9),t)
        if style in(3,4) and b in student_beats and (b-1) not in student_beats:add(buf,ding()*ding_gain,t)
    return buf
