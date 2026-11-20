import re,subprocess,json,sys
import sys
# usage: python3 align.py script.txt part1.mp3 [part2.mp3 ...]   (one script paragraph per audio file)
txt=open(sys.argv[1]).read().split('\n')
paras=[p for p in txt if p.strip()]
files=sys.argv[2:]
out=[]
for para,f in zip(paras,files):
    dur=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',f]))
    log=subprocess.run(['ffmpeg','-i',f,'-af','silencedetect=n=-35dB:d=0.25','-f','null','-'],capture_output=True,text=True).stderr
    st=[float(x) for x in re.findall(r'silence_start: ([\d.]+)',log)]; en=[float(x) for x in re.findall(r'silence_end: ([\d.]+)',log)]
    gaps=[(a+b)/2 for a,b in zip(st,en)]
    sents=[s.strip() for s in re.split(r'(?<=[.?!”])\s+(?=[A-Z“"])',para) if s.strip()]
    w=[len(s.split()) for s in sents]; tot=sum(w)
    speech_start=en[0] if st and st[0]<0.05 else 0.0
    speech_end=st[-1] if st and st[-1]>dur-3 else dur
    span=speech_end-speech_start
    cum=0;bounds=[speech_start]
    for x in w[:-1]:
        cum+=x; est=speech_start+span*cum/tot
        near=min(gaps,key=lambda g:abs(g-est)) if gaps else est
        bounds.append(near if abs(near-est)<2.0 and near>bounds[-1]+0.5 else est)
    bounds.append(dur)
    out.append([{'t0':round(bounds[i],2),'t1':round(bounds[i+1],2),'text':sents[i]} for i in range(len(sents))])
    print(f,dur,len(sents),len(gaps))
json.dump(out,open('timing.json','w'),indent=1)
