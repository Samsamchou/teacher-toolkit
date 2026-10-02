"""Config-driven vocabulary film. No API calls; all input voices must be reviewed."""
from __future__ import annotations
import argparse, html, json, math, subprocess
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
from media_core import *
VISUAL_POLICY_VERSION=2

def load_job(project,config):
    root=Path(project).resolve(); cfg=read_json(resolve(root,config))
    if cfg.get('schema_version')!=1: raise ValueError('Unsupported job schema.')
    if cfg.get('mapping_approved') is not True: raise ValueError('Review image/word/round mapping before planning.')
    items=cfg['items']; ids=[i['id'] for i in items]
    if len(set(ids))!=len(ids): raise ValueError('Duplicate card IDs.')
    if any(not i.get('word','').strip() or not i.get('spoken_text','').strip() for i in items): raise ValueError('Empty word or spoken_text.')
    for item in items:
        expected=display_word(item['word'],cfg.get('display_case_exceptions'))
        if item['word']!=expected:raise ValueError(f'Display case for {item["id"]}: use {expected!r}, not {item["word"]!r}.')
    groups=routes(items,cfg.get('mode','auto'))
    for rounds in groups:
        if cfg.get('round_word_policy','same-order')=='same-order' and [i['spoken_text'] for i in rounds[0]]!=[i['spoken_text'] for i in rounds[1]]:
            raise ValueError('Rounds differ. Review mapping and explicitly select round_word_policy=explicit before continuing.')
    speed=float(cfg.get('speech_speed',.85));bpm=float(cfg.get('bpm',93.6734693877551))
    if not .5<=speed<=1.5 or not 40<=bpm<=180: raise ValueError('Speed/BPM outside supported range.')
    for program in ['ffmpeg','ffprobe']:
        if not shutil.which(program): raise ValueError('Missing '+program)
    font=font_path(cfg)
    board=verified_asset(root,cfg['board']);drum=verified_asset(root,cfg['drum_bar'])
    if abs(float(cfg['drum_bar']['bpm'])-bpm)>.001: raise ValueError('Drum bar must already match requested BPM; do not double-stretch.')
    for item in items:
        p=verified_asset(root,item['image'])
        with Image.open(p) as im: im.verify()
    bank=read_json(verified_asset(root,cfg['voice_bank']))['records'];voices={}
    for r in bank:
        key=r['spoken_text'],r['role']
        if key in voices: raise ValueError('Ambiguous speech bank entry.')
        voices[key]=r
    required={(i['spoken_text'],role) for i in items for role in ['teacher','child']}
    missing=sorted(required-set(voices))
    if missing: raise ValueError('Missing speech: '+json.dumps(missing,ensure_ascii=False))
    samples={}
    for key in required:
        r=voices[key];p=verified_asset(root,r)
        if abs(float(r['speed'])-speed)>.0001: raise ValueError('Voice speed mismatch; process from the normal-speed source once.')
        expected_voice=cfg.get('voices',{'teacher':'marin','child':'coral'})[key[1]]
        if r['voice']!=expected_voice: raise ValueError('Voice selection mismatch.')
        if r.get('anchor_reviewed') is not True: raise ValueError('Unreviewed acoustic anchor: '+str(key))
        x=audio(p);samples[key]=x
        if not 0<=r['anchor_sample']<len(x) or not r['anchor_sample']/SR<=r['audible_last_sec']<=len(x)/SR:
            raise ValueError('Invalid anchor or speech-end timestamp: '+str(key))
    bar=audio(drum);beat=60/bpm
    if abs(len(bar)/SR-4*beat)>.003: raise ValueError('Drum asset must be one four-beat bar at requested BPM.')
    return root,cfg,groups,voices,samples,bar,font

def layout(rounds,voices,samples,bar,cfg):
    beat=60/cfg.get('bpm',93.6734693877551);hits=drum_hits(bar,beat)
    hit=lambda k:(k//4)*len(bar)/SR+hits[k%4]
    entries={i['id']:i for group in rounds for i in group}
    sizes={k:int(i.get('min_beats',voices[(i['spoken_text'],'teacher')].get('min_beats',4))) for k,i in entries.items()}
    if any(n<4 or n%4 for n in sizes.values()):raise ValueError('min_beats must be a positive multiple of four, at least four.')
    lead={k:max(.75*beat,voices[(i['spoken_text'],'teacher')]['anchor_sample']/SR+.05) for k,i in entries.items()}
    for attempt in range(24):
        blocks=[];cursor=4
        for r,items in enumerate(rounds,1):
            for item in items:
                blocks.append({'item':item,'round':r,'beat_index':cursor,'beats':sizes[item['id']]});cursor+=sizes[item['id']]
            if r<len(rounds):cursor+=4
        cues=[]
        for b in blocks:
            i=b['item']
            for role,offset in [('teacher',0),('child',b['beats']//2)]:
                key=i['spoken_text'],role;rec=voices[key];x=samples[key];target=hit(b['beat_index']+offset)
                start=round(target*SR)-rec['anchor_sample']
                cues.append({'item_id':i['id'],'word':i['word'],'spoken_text':i['spoken_text'],'role':role,'round':b['round'],
                             'start_sample':start,'start':start/SR,'end':(start+len(x))/SR,
                             'audible_end':start/SR+rec['audible_last_sec'],'anchor_sample':rec['anchor_sample'],
                             'target_drum_sec':target,'target_beat_index':b['beat_index']+offset,'voice_sha256':rec['sha256']})
        needs=set()
        for n,b in enumerate(blocks):
            a,c=cues[n*2:n*2+2];following=blocks[n+1] if n+1<len(blocks) and blocks[n+1]['round']==b['round'] else None
            end=hit(following['beat_index'])-lead[following['item']['id']] if following else hit(b['beat_index']+b['beats'])
            if c['start']-a['end']<.10 or end-c['end']<.04 or end-c['audible_end']<.20:needs.add(b['item']['id'])
        if not needs:break
        for k in needs:sizes[k]+=4
    else:raise ValueError('Unable to fit speech without overlap; inspect recordings/anchors.')
    scenes=[{'kind':'overview','round':1,'start':0.,'end':hit(4)-lead[rounds[0][0]['id']],'items':rounds[0]}]
    for n,b in enumerate(blocks):
        following=blocks[n+1] if n+1<len(blocks) and blocks[n+1]['round']==b['round'] else None
        end=hit(following['beat_index'])-lead[following['item']['id']] if following else hit(b['beat_index']+b['beats'])
        scenes.append({'kind':'word','round':b['round'],'item':b['item'],'start':hit(b['beat_index'])-lead[b['item']['id']],
                       'end':end,'exit_duration':min(.4,end-cues[n*2+1]['audible_end']-.04),'beats':b['beats']})
        if not following and n+1<len(blocks):
            nxt=blocks[n+1]
            scenes.append({'kind':'overview','round':nxt['round'],'start':end,'end':hit(nxt['beat_index'])-lead[nxt['item']['id']],
                           'items':rounds[nxt['round']-1]})
    end=hit(cursor);frames=math.ceil((end+3)*FPS)
    scenes.append({'kind':'overview','round':len(rounds),'start':end,'end':frames/FPS,'items':rounds[-1]})
    if any(c['start_sample']<0 for c in cues):raise ValueError('Speech begins before timeline.')
    return {'schema_version':1,'fps':FPS,'width':W,'height':H,'frames':frames,'duration_sec':frames/FPS,
            'speech_speed':cfg.get('speech_speed',.85),'bpm':60/beat,'beat_sec':beat,'drum_hits':hits,
            'rounds':len(rounds),'utterances':len(cues),'scenes':scenes,'cues':cues,'teacher_acceptance':'pending'}

def plan(project,config,pilot=False):
    root,cfg,groups,voices,samples,bar,font=load_job(project,config)
    out=output_path(root,cfg['output_dir']);fp=fingerprint(cfg)
    if out.exists():
        record=out/'job.json'
        if record.is_file() and read_json(record)['config_fingerprint']==fp and not pilot:
            old=read_json(record)
            if old.get('visual_policy_version')!=VISUAL_POLICY_VERSION:raise ValueError('Visual rules changed; preserve the previous film and plan a new output directory.')
            for f in old['plan_files']:verified_asset(root,f)
            print(json.dumps({'status':'reused_verified_plan','output':str(out)}));return out
        raise ValueError('Output exists or incomplete. Preserve it and choose a new output_dir.')
    if pilot:
        chosen=cfg.get('pilot_indices',[0,len(groups[0][0])//2,len(groups[0][0])-1])
        if len(set(chosen))!=len(chosen) or not 1<=len(chosen)<=4:raise ValueError('Pilot requires 1–4 distinct indices.')
        groups=[[[groups[0][0][i] for i in chosen]]]
    timelines=[layout(group,voices,samples,bar,cfg) for group in groups]
    out.mkdir(parents=True)
    plan_files=[]
    for number,t in enumerate(timelines,1):
        part=out/f'segment-{number:02d}';part.mkdir()
        t.update({'segment':number,'kind':'pilot' if pilot else 'full','config_fingerprint':fp,'font':font,'visual_policy_version':VISUAL_POLICY_VERSION})
        n=round(t['duration_sec']*SR);voice=np.zeros(n,np.float32);duck=np.ones(n,np.float32)
        for cue in t['cues']:
            x=samples[(cue['spoken_text'],cue['role'])];start=cue['start_sample'];voice[start:start+len(x)]+=x
            a,b=max(0,start-round(.08*SR)),min(n,start+len(x)+round(.08*SR));r=min(round(.06*SR),(b-a)//2)
            duck[a:a+r]=np.minimum(duck[a:a+r],np.linspace(1,.5,r));duck[a+r:b-r]=.5
            duck[b-r:b]=np.minimum(duck[b-r:b],np.linspace(.5,1,r))
        scaled=bar*(10**(-26/20)/float(np.sqrt(np.mean(bar**2))))
        background=np.tile(scaled,math.ceil(n/len(bar)))[:n]*duck;background[-round(.3*SR):]*=np.linspace(1,0,round(.3*SR))
        click=np.zeros(n,np.float32)
        for k in range(math.ceil(t['duration_sec']/t['beat_sec'])):
            start=round((t['drum_hits'][0]+k*t['beat_sec'])*SR);length=min(round(.035*SR),n-start)
            if length<=0:continue
            tt=np.arange(length)/SR;accent=k%4==0
            click[start:start+length]+=(.23 if accent else .14)*np.sin(2*np.pi*(1500 if accent else 1000)*tt)*np.exp(-tt/.006)
        mix=voice+background;listening=voice+click;gain=min(1.,10**(-1/20)/max(abs(mix).max(),abs(listening).max()))
        for name,data in [('speech',voice),('background',background),('click',click),('mix',mix*gain),('click-listening',listening*gain)]:
            wav(part/(name+'.wav'),data)
        audio_identity={'speed':t['speech_speed'],'bpm':t['bpm'],'duration':t['duration_sec'],
                        'cues':[{k:c[k] for k in ['spoken_text','role','start_sample','voice_sha256']} for c in t['cues']],
                        'mix_sha256':sha(part/'mix.wav')}
        t['audio_fingerprint']=fingerprint(audio_identity);t['mix_sha256']=audio_identity['mix_sha256']
        save_json(part/'timeline.json',t)
        for p in part.iterdir():plan_files.append({'path':str(p.relative_to(root)),'sha256':sha(p)})
    save_json(out/'job.json',{'config':cfg,'config_fingerprint':fp,'segments':len(timelines),'pilot':pilot,'plan_files':plan_files,'visual_policy_version':VISUAL_POLICY_VERSION})
    print(json.dumps({'status':'planned','segments':len(timelines),'durations':[t['duration_sec'] for t in timelines],'output':str(out)}))
    return out

def renderer(root,cfg,t):
    bg=Image.open(verified_asset(root,cfg['board'])).convert('RGBA').resize((W,H),Image.Resampling.LANCZOS)
    all_items={i['id']:i for s in t['scenes'] for i in ([s['item']] if s['kind']=='word' else s['items'])}
    large={k:card(verified_asset(root,i['image']),596) for k,i in all_items.items()}
    sizes={overview_layout(len(s['items']))['side'] for s in t['scenes'] if s['kind']=='overview'}
    small={(side,k):card(verified_asset(root,i['image']),side) for side in sizes for k,i in all_items.items()};font=font_path(cfg)
    def frame(n):
        time=n/FPS;canvas=bg.copy();s=next((s for s in t['scenes'] if s['start']<=time<s['end']),t['scenes'][-1])
        if s['kind']=='overview':
            grid=overview_layout(len(s['items']))
            for j,i in enumerate(s['items']):
                cx,cy=grid['centers'][j]
                place(canvas,small[(grid['side'],i['id'])],(cx,cy),2*math.sin(2.1*time*t['speech_speed']+j*.5))
                label(ImageDraw.Draw(canvas),(cx,cy+grid['label_offset']),i['word'],grid['font_size'],font,shadow=True)
        else:
            local=time-s['start'];remain=s['end']-time;speed=t['speech_speed']
            enter=min(1,max(0,local/(.32/speed)));eased=1-(1-enter)**3;cy=-520+976*eased
            if remain<s['exit_duration']:cy-=(1-remain/s['exit_duration'])**2*1060
            place(canvas,large[s['item']['id']],(960,cy),14*math.exp(-1.8*local*speed)*math.sin(8*local*speed+.6),.91+.09*eased)
            alpha=min(1,max(0,(local-.1)/.15),max(0,remain/.25));layer=Image.new('RGBA',(W,H),(0,0,0,0))
            word=s['item']['word'];label(ImageDraw.Draw(layer),(960,865+40*(1-alpha)),word,90 if len(word)>12 else 103,font,(255,255,251,round(alpha*255)))
            canvas.alpha_composite(layer)
        return canvas.convert('RGB')
    return frame

def render(project,config,segment=1,reuse_audio=None):
    root,cfg,*_=load_job(project,config);out=output_path(root,cfg['output_dir']);job=read_json(out/'job.json')
    if job.get('visual_policy_version')!=VISUAL_POLICY_VERSION:raise ValueError('Visual rules changed; plan a new output directory.')
    if job['config_fingerprint']!=fingerprint(cfg):raise ValueError('Job config changed; plan a new output directory.')
    part=out/f'segment-{segment:02d}';t=read_json(part/'timeline.json');video=part/'video.mp4'
    if video.exists():
        r=read_json(part/'render.json')
        if sha(video)==r['sha256']:print(json.dumps({'status':'reused_verified_video','file':str(video)}));return
        raise ValueError('Rendered file hash changed.')
    if sha(part/'mix.wav')!=t['mix_sha256']:raise ValueError('Mix changed.')
    source=part/'mix.wav';codec=['-c:a','aac','-b:a','192k','-ar',str(SR)]
    if reuse_audio:
        old=resolve(root,reuse_audio);old_t=read_json(old.parent/'timeline.json');old_render=read_json(old.parent/'render.json')
        if old_t['audio_fingerprint']!=t['audio_fingerprint'] or sha(old)!=old_render['sha256']:raise ValueError('Audio reuse rejected: content, timing or source hash changed.')
        source=old;codec=['-c:a','copy']
    frame=renderer(root,cfg,t);attempt=1
    while (part/f'video-attempt-{attempt}.mp4').exists():attempt+=1
    if attempt>3:raise ValueError('Three render attempts exist; inspect errors before choosing a new job version.')
    temp=part/f'video-attempt-{attempt}.mp4'
    cmd=['ffmpeg','-v','error','-n','-f','rawvideo','-pix_fmt','rgb24','-s','1920x1080','-r',FPS,'-i','pipe:0',
         '-i',source,'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p',
         *codec,'-movflags','+faststart','-t',t['duration_sec'],temp]
    with (part/f'render-attempt-{attempt}.log').open('xb') as log:
        p=subprocess.Popen([str(x) for x in cmd],stdin=subprocess.PIPE,stderr=log)
        try:
            for n in range(t['frames']):
                p.stdin.write(frame(n).tobytes())
                if n%300==0:print(json.dumps({'segment':segment,'frame':n,'total':t['frames']}),flush=True)
        finally:p.stdin.close()
        if p.wait()!=0:raise ValueError('FFmpeg render failed; partial evidence retained.')
    temp.rename(video)
    save_json(part/'render.json',{'sha256':sha(video),'bytes':video.stat().st_size,'audio_reused_from':str(source) if reuse_audio else None,
                               'audio_fingerprint':t['audio_fingerprint'],'config_fingerprint':fingerprint(cfg)})
    buttons=''.join(f'<button data-t="{s["start"]}">{html.escape(s["item"]["word"])}</button>' for s in t['scenes'] if s['kind']=='word')
    (part/'preview.html').write_text('<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        '<title>節奏單字朗讀</title><style>body{background:#142d30;color:white;font-family:system-ui;margin:24px}main{max-width:1080px;margin:auto}video{width:100%}button{margin:6px;padding:10px}a{color:#b9ead8}</style>'
        '<main><video controls playsinline preload="metadata" src="video.mp4"></video><p>語音已為0.85倍，播放器使用1×。<a download href="video.mp4">下載 MP4</a></p>'+buttons+
        '</main><script>const v=document.querySelector("video");for(const b of document.querySelectorAll("button"))b.onclick=()=>{v.currentTime=+b.dataset.t;v.play()}</script></html>',encoding='utf-8')
    print(json.dumps({'file':str(video),'sha256':sha(video)},ensure_ascii=False),flush=True)

def locate_clip(reference,track,expected_sample,radius=720):
    stride=4;lo=max(0,expected_sample-radius);hi=min(len(track),expected_sample+len(reference)+radius)
    x=reference[::stride].astype(float);y=track[lo:hi:stride].astype(float);x-=x.mean();n=len(x)
    dot=np.correlate(y,x,'valid');s=np.r_[0.,np.cumsum(y)];ss=np.r_[0.,np.cumsum(y*y)]
    norm=np.sqrt(np.maximum(1e-20,(ss[n:]-ss[:-n])-(s[n:]-s[:-n])**2/n))*np.sqrt(np.sum(x*x))
    correlations=dot/norm;j=int(np.argmax(correlations))
    return lo+j*stride,float(correlations[j])

def local_drum_attack(track,expected):
    begin=max(0,round((expected-.10)*SR));x=track[begin:begin+round(.25*SR)]
    t,e=rms_curve(x);rise=np.maximum(0,e-np.r_[np.zeros(4),e[:-4]]);center=expected-begin/SR
    ix=np.flatnonzero((t>=max(.002,center-.03))&(t<=center+.06));peak=int(ix[np.argmax(rise[ix])]);edge=peak
    while edge>ix[0] and t[peak]-t[edge]<.025 and rise[edge-1]>=.2*rise[peak]:edge-=1
    return begin/SR+float(t[edge]-.002)

def verify(project,config,segment=1):
    root,cfg,groups,voices,samples,bar,font=load_job(project,config);part=output_path(root,cfg['output_dir'])/f'segment-{segment:02d}'
    t=read_json(part/'timeline.json');video=part/'video.mp4';metadata=probe(video)
    if t.get('visual_policy_version')!=VISUAL_POLICY_VERSION:raise ValueError('Use the recorded renderer for historical QA; new visual rules require a new job.')
    stream=next(s for s in metadata['streams'] if s['codec_type']=='video');cues=t['cues']
    decode=subprocess.run(['ffmpeg','-v','error','-i',str(video),'-f','null','NUL'],capture_output=True)
    encoded=audio(video);mix=audio(part/'mix.wav');corr=float(np.corrcoef(encoded[:len(mix)],mix)[0,1]) if len(encoded)>=len(mix) else 0.
    speech=audio(part/'speech.wav');background=audio(part/'background.wav');audio_rows=[]
    for cue in cues:
        reference=samples[(cue['spoken_text'],cue['role'])]
        recovered,voice_corr=locate_clip(reference,speech,cue['start_sample'])
        actual=(recovered+cue['anchor_sample'])/SR;drum=local_drum_attack(background,cue['target_drum_sec'])
        a=max(0,round((actual-.10)*SR));found,aac_corr=locate_clip(mix[a:a+round(.3*SR)],encoded,a)
        audio_rows.append({'word':cue['word'],'round':cue['round'],'role':cue['role'],'voice_correlation':voice_corr,
                           'voice_offset_ms':1000*(recovered-cue['start_sample'])/SR,'anchor_minus_drum_ms':1000*(actual-drum),
                           'aac_offset_ms':1000*(found-a)/SR,'aac_correlation':aac_corr})
    attempt=1
    while (part/f'qa-frames-{attempt}').exists():attempt+=1
    visuals=[];frame=renderer(root,cfg,t);qa=part/f'qa-frames-{attempt}';qa.mkdir(exist_ok=False)
    for j,c in enumerate(cues):
        n=round(c['target_drum_sec']*FPS);name=f'{j+1:02d}.png'
        raw=run(['ffmpeg','-v','error','-ss',str(n/FPS),'-i',video,'-frames:v','1','-pix_fmt','rgb24','-f','rawvideo','pipe:1']).stdout
        im=Image.frombytes('RGB',(W,H),raw);expected=np.array(frame(n)).astype(float)
        mae=float(np.mean(abs(np.array(im).astype(float)-expected)))
        im.resize((960,540),Image.Resampling.LANCZOS).save(qa/name)
        visuals.append({'file':name,'word':c['word'],'round':c['round'],'role':c['role'],'frame':n,'expected_frame_mae':mae})
    contact=Image.new('RGB',(1440,302*math.ceil(len(cues)/3)),'white')
    for j,row in enumerate(visuals):
        im=Image.open(qa/row['file']).resize((480,270),Image.Resampling.LANCZOS);x,y=(j%3)*480,(j//3)*302
        contact.paste(im,(x,y));label(ImageDraw.Draw(contact),(x+240,y+286),f'R{row["round"]} {row["word"]}',18,font_path(cfg),(20,30,30))
    contact.save(part/'contact-sheet.jpg',quality=94)
    overviews=[]
    for j,s in enumerate(s for s in t['scenes'] if s['kind']=='overview'):
        n=round((s['start']+s['end'])/2*FPS);name=f'overview-{j+1:02d}.png'
        raw=run(['ffmpeg','-v','error','-ss',str(n/FPS),'-i',video,'-frames:v','1','-pix_fmt','rgb24','-f','rawvideo','pipe:1']).stdout
        im=Image.frombytes('RGB',(W,H),raw);mae=float(np.mean(abs(np.array(im).astype(float)-np.array(frame(n)).astype(float))))
        im.save(qa/name);grid=overview_layout(len(s['items']))
        overviews.append({'file':name,'frame':n,'round':s['round'],'count':len(s['items']),'columns':grid['columns'],'rows':grid['rows'],
                          'item_ids':[i['id'] for i in s['items']],'words':[i['word'] for i in s['items']],'expected_frame_mae':mae})
    words=[s for s in t['scenes'] if s['kind']=='word']
    checks={'1080p30_h264':stream['width']==W and stream['height']==H and stream['codec_name']=='h264' and stream['avg_frame_rate']=='30/1',
        'duration_matches':abs(float(stream['duration'])-t['duration_sec'])<.002,'frame_count_matches':int(stream['nb_frames'])==t['frames'],
        'complete_av_decode':decode.returncode==0 and not decode.stderr.strip(),'encoded_audio_matches_mix':corr>.98,
        'voice_waveform_readbacks':all(r['voice_correlation']>.999 and abs(r['voice_offset_ms'])<=1 for r in audio_rows),
        'anchors_within_20ms_of_readback_drums':all(abs(r['anchor_minus_drum_ms'])<=20 for r in audio_rows),
        'aac_alignment_readbacks':all(abs(r['aac_offset_ms'])<=5 and r['aac_correlation']>.98 for r in audio_rows),
        'no_mix_or_encoded_clipping':bool(abs(mix).max()<1 and abs(encoded).max()<1),
        'no_overlap':all(b['start']-a['end']>=.099 for a,b in zip(cues,cues[1:])),
        'teacher_child_each_word':len(cues)==2*len(words) and all(c['role']==('teacher' if j%2==0 else 'child') for j,c in enumerate(cues)),
        'anchor_sample_alignment':all(abs((c['start_sample']+c['anchor_sample'])/SR-c['target_drum_sec'])<=1/SR for c in cues),
        'cards_out_after_tail':all(s['end']-s['exit_duration']>=c['audible_end'] for s,c in zip(words,cues[1::2])),
        'all_encoded_word_frames':all(v['expected_frame_mae']<3 for v in visuals),'source_and_voice_hashes_verified':True,
        'all_encoded_overview_frames':bool(overviews) and all(v['expected_frame_mae']<3 for v in overviews),
        'eight_card_overview_four_columns_two_rows':all(v['columns']==4 and v['rows']==2 for v in overviews if v['count']==8),
        'display_case_checked':all(i['word']==display_word(i['word'],cfg.get('display_case_exceptions')) for i in cfg['items'])}
    report={'checks':checks,'passed':all(checks.values()),'audio_correlation':corr,'sha256':sha(video),'bytes':video.stat().st_size,
            'audio_rows':audio_rows,'visual_samples_directory':qa.name,'visual_samples':visuals,'teacher_acceptance':'pending',
            'overview_samples':overviews,'verifier_version':3,'limitations':'Alignment uses reviewed acoustic anchors; neither ASR nor sample checks certify perceived naturalness.'}
    if (part/'QA.json').exists():
        history=1
        while (part/f'QA-history-{history}.json').exists():history+=1
        (part/'QA.json').rename(part/f'QA-history-{history}.json')
    save_json(part/'QA.json',report);print(json.dumps({'passed':report['passed'],'checks':checks,'file':str(video)},ensure_ascii=False),flush=True)
    if not report['passed']:raise ValueError('QA failed; evidence retained.')

def concat_media(parts,target):
    """Technical concatenation primitive; callers own the human acceptance gate."""
    durations=[]
    for p in parts:
        streams=probe(p)['streams'];v=next(s for s in streams if s['codec_type']=='video')
        if (v['width'],v['height'],v['avg_frame_rate'])!=(W,H,'30/1'):raise ValueError('Segment format mismatch.')
        durations.append(int(v['nb_frames'])/FPS)
    filters=';'.join(f'[{n}:v]setpts=PTS-STARTPTS[v{n}];[{n}:a]atrim=end_sample={round(d*SR)},asetpts=PTS-STARTPTS[a{n}]' for n,d in enumerate(durations))
    filters+=';' + ''.join(f'[v{n}][a{n}]' for n in range(len(parts))) + f'concat=n={len(parts)}:v=1:a=1[v][a]'
    inputs=[]
    for p in parts:inputs+=['-i',p]
    run(['ffmpeg','-v','error','-n',*inputs,'-filter_complex',filters,'-map','[v]','-map','[a]',
         '-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-ar',SR,'-movflags','+faststart',target])
    expected=sum(durations);meta=probe(target);v=next(s for s in meta['streams'] if s['codec_type']=='video')
    duration_ok=abs(float(v['duration'])-expected)<1/FPS
    run(['ffmpeg','-v','error','-i',target,'-f','null','NUL'])
    joined=audio(target);offset=0;comparisons=[]
    for part,duration in zip(parts,durations):
        original=audio(part);count=round(duration*SR);a=round(offset*SR)
        # Ignore a small codec window right on the join, compare the rest.
        pad=min(round(.05*SR),count//10);length=min(len(original),count)
        x=original[pad:length-pad];y=joined[a+pad:a+length-pad]
        correlation=float(np.corrcoef(x,y)[0,1]) if len(x)==len(y) and np.std(x)>1e-8 else 0.
        comparisons.append({'offset_sec':offset,'duration_sec':duration,'audio_correlation':correlation});offset+=duration
    result={'duration_check':duration_ok,'parts':comparisons,'audio_join_check':all(r['audio_correlation']>.98 for r in comparisons),
            'frames':int(v['nb_frames']),'duration_sec':float(v['duration']),'sha256':sha(target)}
    if not (result['duration_check'] and result['audio_join_check']):raise ValueError('Concatenation QA failed.')
    return result

def merge(project,config,acceptance):
    root,cfg,*_=load_job(project,config);out=output_path(root,cfg['output_dir']);job=read_json(out/'job.json')
    if job['segments']!=2:raise ValueError('Merge requires a two-segment job.')
    approvals=read_json(resolve(root,acceptance));parts=[out/f'segment-{n:02d}'/'video.mp4' for n in [1,2]]
    for n,p in enumerate(parts):
        a=approvals['segments'][n]
        if a.get('status')!='teacher_accepted' or a.get('sha256')!=sha(p) or not a.get('user_quote'):raise ValueError('Both exact segments need explicit teacher acceptance before merge.')
        if not read_json(p.parent/'QA.json')['passed']:raise ValueError('Segment QA failed.')
    target=out/'combined.mp4'
    result=concat_media(parts,target)
    save_json(out/'merge.json',{'source_sha256':[sha(p) for p in parts],**result,
                              'acceptance_record_sha256':sha(resolve(root,acceptance)),'teacher_acceptance':'pending'})
    print(json.dumps({'file':str(target),'sha256':sha(target)},ensure_ascii=False))

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('stage',choices=['inventory','preflight','plan','render','verify','merge']);p.add_argument('--project',type=Path,default=Path.cwd())
    p.add_argument('--config');p.add_argument('--folder');p.add_argument('--segment',type=int,default=1);p.add_argument('--pilot',action='store_true');p.add_argument('--reuse-audio');p.add_argument('--acceptance');a=p.parse_args()
    try:
        if a.stage=='inventory':print(json.dumps(inventory(a.folder),ensure_ascii=False,indent=2))
        elif not a.config:p.error('--config is required')
        elif a.stage=='preflight':
            _,cfg,groups,*_=load_job(a.project,a.config);print(json.dumps({'ok':True,'images':len(cfg['items']),'segments':len(groups),'api_calls':0}))
        elif a.stage=='plan':plan(a.project,a.config,a.pilot)
        elif a.stage=='render':render(a.project,a.config,a.segment,a.reuse_audio)
        elif a.stage=='verify':verify(a.project,a.config,a.segment)
        else:merge(a.project,a.config,a.acceptance)
    except (ValueError,OSError,KeyError,subprocess.CalledProcessError) as e:
        raise SystemExit('Media task stopped: '+str(e))
