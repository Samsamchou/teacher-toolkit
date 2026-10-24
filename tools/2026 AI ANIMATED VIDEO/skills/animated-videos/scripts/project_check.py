"""Validate animation planning data; never implies visual or teacher acceptance."""
import argparse, hashlib, json, math
from pathlib import Path

def validate(data, root, stage='plan', plan_only=False):
    errors=[]
    def require(ok,msg):
        if not ok: errors.append(msg)
    for key in ['title','target_students','purpose','visual_style']:
        require(bool(data.get(key)), 'Missing '+key)
    require(data.get('image_tool')=='builtin_image_gen','Image tool must be builtin_image_gen')
    duration=data.get('duration_sec'); fps=data.get('fps')
    numeric=lambda v:isinstance(v,(int,float)) and not isinstance(v,bool) and math.isfinite(v)
    require(numeric(duration) and duration>0,'Invalid measured duration')
    require(numeric(fps) and fps>0,'Invalid fps')
    if not plan_only:
        for name in ['audio','lyrics']:
            source=data.get('sources',{}).get(name,{})
            p=(root/source.get('path','')).resolve()
            require(p.is_relative_to(root.resolve()),name+' source outside project')
            if not p.is_relative_to(root.resolve()) or not p.is_file():
                errors.append(name+' source missing'); continue
            require(hashlib.sha256(p.read_bytes()).hexdigest()==source.get('sha256'),name+' hash mismatch')
    if numeric(duration) and duration>0 and numeric(fps) and fps>0:
        eps=1/fps+1e-6
        for kind in ['cues','events']:
            items=data.get(kind,[]); require(bool(items),'Missing '+kind)
            ids=set(); previous=0.0
            for item in items:
                ident=item.get('id'); a=item.get('start'); b=item.get('end')
                require(bool(ident) and ident not in ids,kind+' duplicate/missing id');ids.add(ident)
                if not (numeric(a) and numeric(b) and 0<=a<b<=duration+eps):
                    errors.append(kind+' invalid interval '+str(ident));continue
                require(a>=previous-eps,kind+' overlap or unsorted '+str(ident))
                if kind=='events':
                    require(a<=previous+eps,'Uncovered visual interval before '+str(ident))
                    require(bool(item.get('visual')),'Missing visual '+str(ident))
                else: require(bool(item.get('text')),'Missing lyric '+str(ident))
                previous=b
            if kind=='events':require(abs(previous-duration)<=eps,'Visual timeline does not reach audio end')
        catalog={k:{x.get('id') for x in data.get(k,[])} for k in ['characters','objects','scenes']}
        for e in data.get('events',[]):
            for k in catalog:
                for ident in e.get(k,[]):require(ident in catalog[k],'Unknown '+k+' id '+str(ident))
        for cue in data.get('cues',[]):
            if not numeric(cue.get('start')) or not numeric(cue.get('end')):continue
            require(any(e.get('cue_id')==cue.get('id') and numeric(e.get('start')) and numeric(e.get('end')) and e['start']<cue['end'] and e['end']>cue['start'] for e in data.get('events',[])),'No corresponding visual for '+str(cue.get('id')))
    if stage=='full':
        a=data.get('approvals',{}); spec=a.get('spec',{}); sample=a.get('sample',{})
        require(spec.get('accepted') is True and bool(spec.get('evidence')),'Spec approval missing')
        require((sample.get('accepted') is True or sample.get('waived') is True) and bool(sample.get('evidence')),'Sample approval or explicit waiver missing')
        if data.get('schema_version',1)>=2:
            qa=data.get('internal_sample_qa',{})
            require(qa.get('passed') is True and bool(qa.get('report')),'Internal sample QA missing; teacher waiver does not waive QA')
    if data.get('schema_version',1)>=2:
        for e in data.get('events',[]):
            for field in ['action','start_state','end_state','camera','verification']:
                require(bool(e.get(field)),'Missing '+field+' for '+str(e.get('id')))
    return {'passed':not errors,'stage':stage,'plan_only':plan_only,'errors':errors,'teacher_acceptance_verified':False,'visual_quality_verified':False}

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('project');p.add_argument('--stage',choices=['plan','full'],default='plan');p.add_argument('--plan-only',action='store_true');a=p.parse_args()
    path=Path(a.project);report=validate(json.loads(path.read_text(encoding='utf-8-sig')),path.parent,a.stage,a.plan_only)
    print(json.dumps(report,ensure_ascii=True,indent=2));raise SystemExit(0 if report['passed'] else 1)
