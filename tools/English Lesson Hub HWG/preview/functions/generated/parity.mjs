// Versioned, observable question contract. No claim about Wayground internals.
export const PARITY_VERSION = 3;
export const OPEN_LIMIT = 200;
export const textLength = value => Array.from(String(value)).length;
export const inlineTypes = ['blank', 'drag', 'dropdown'];
const clone = value => JSON.parse(JSON.stringify(value));
const norm = value => String(value).normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
const bad = message => { throw new Error(message); };
const idOK = v => typeof v === 'string' && /^[\w-]{1,100}$/.test(v);
const unit = n => Number.isFinite(n) && n >= 0 && n <= 1;
const list = (v, max) => Array.isArray(v) && v.length > 0 && v.length <= max;
export function sentenceParts(text) {
  return String(text).split(/(\{\{[\w-]+\}\})/g).filter(Boolean).map(t =>
    /^\{\{/.test(t) ? { blank: t.slice(2, -2) } : { text: t });
}
export function parityBlock(base) {
  const type = base.type;
  return { ...base, modelVersion: 3, scoringVersion: 'parity-1',
    seconds: ({slide:0, choice:30, blank:60, drag:90, label:90, hotspot:90, order:90, dropdown:90})[type] ?? 180,
    points: ['cloud','slide'].includes(type) ? 0 : 1,
    ungraded: type === 'cloud', partial: ['drag','label','hotspot','category','dropdown'].includes(type),
    ...(inlineTypes.includes(type) ? { sentence:'I go to school by {{b1}}.', blanks:[{id:'b1', answers:['bike'], distractors:['bus','car']}] } : {}),
    ...(['label','hotspot','draw'].includes(type) ? { background:{assetId:'',alt:''} } : {}),
    ...(type === 'label' ? { labels:[{id:'l1',text:'bike'}], anchors:[{id:'a1',x:0.5,y:0.5,labelId:'l1',direction:'down'}] } : {}),
    ...(type === 'hotspot' ? { regions:[{id:'r1',shape:'point',x:0.5,y:0.5,r:0.05,correct:true}] } : {}),
    ...(type === 'draw' ? { canvasMode:'blank' } : {}),
    ...(type === 'open' ? { maxLength:OPEN_LIMIT, aiRubric:{enabled:false,text:''} } : {}),
    ...(type === 'category' ? { groups:['Land','Air'],items:['bike','car','plane'],mapping:[0,0,1] } : {}),
    ...(type === 'multiselect' ? {options:['train','car','bus','bike'],answer:[1,2,3],multiple:true,partial:true,ungraded:false,scoringVersion:'multiselect-1'} : {}) };
}
export function convertBlock(source, id) {
  const b = parityBlock({...clone(source),id});
  const warnings = [];
  b.title = source.title; b.seconds = source.seconds; b.points = source.type === 'cloud' ? 0 : source.points;
  b.partial = source.partial; b.ungraded = source.type === 'cloud' || source.ungraded;
  if (source.modelVersion === 3) return {...clone(source), id};
  if (inlineTypes.includes(source.type)) {
    b.sentence = `${source.title} {{b1}}`;
    if (source.type === 'blank') b.blanks=[{id:'b1',answers:clone(source.alternatives),distractors:[]}];
    if (source.type === 'dropdown') {
      b.blanks=[{id:'b1',answers:source.answer.map(i=>source.options[i]),distractors:source.options.filter((_,i)=>!source.answer.includes(i))}];
      warnings.push('原獨立下拉選單已加到句尾；請確認空格位置。');
    }
    if (source.type === 'drag') {
      b.sentence = ''; b.blanks=[];
      warnings.push('原圖片拖放無法無損轉為句內空格；請重新設定句子與答案。');
    }
  }
  if (b.background) b.background={assetId:source.media.find(m=>m.kind==='image')?.id || '',alt:''};
  if (source.type === 'label') {
    b.labels=source.zones.map((_,i)=>({id:`l${i}`,text:source.items[source.mapping.indexOf(i)] || ''}));
    b.anchors=source.zones.map((z,i)=>({id:`a${i}`,x:z.x+z.w/2,y:z.y+z.h/2,labelId:`l${i}`,direction:'down'}));
    warnings.push('已由舊框中心建立錨點；請核對一對一標籤、位置與替代文字。');
  }
  if (source.type === 'hotspot') {
    b.regions=source.zones.map((z,i)=>({id:`r${i}`,shape:'rect',...z,correct:true}));
    warnings.push('保留舊矩形範圍；請核對正解、干擾與替代文字。');
  }
  b.migration={sourceId:source.id,sourceTitle:source.title,fromVersion:source.modelVersion || 2,warnings,reviewed:warnings.length===0};
  return b;
}
export function validateParity(b,{draft=false}={}) {
  if (b.modelVersion !== 3) return;
  if(b.type==='multiselect') {
    if(!list(b.options,6)||b.options.length<2||b.options.some(v=>typeof v!=='string'||textLength(v)>200)||!Array.isArray(b.answer)||new Set(b.answer).size!==b.answer.length||b.answer.some(i=>!Number.isInteger(i)||i<0||i>=b.options.length)||b.answer.length>4||b.partial!==true||b.multiple!==true||b.ungraded!==false)bad('多項選擇題設定無效。');
    if(!draft&&(b.answer.length<2||b.options.some(v=>!v.trim())||new Set(b.options.map(norm)).size!==b.options.length))bad('多項選擇題需 2–4 個正解，選項不可空白或重複。');
  }
  if (b.migration && !draft && !b.migration.reviewed) bad('請先確認轉換報告。');
  if (b.type==='open' && (b.maxLength!==200 || b.aiRubric?.enabled!==false)) bad('開放題限 200 字元；AI rubric 尚未啟用。');
  if (b.type==='cloud' && (b.points!==0 || !b.ungraded)) bad('文字雲必須零分且不計分。');
  if (inlineTypes.includes(b.type)) {
    if(typeof b.sentence!=='string'||b.sentence.length>4000||!Array.isArray(b.blanks)||b.blanks.length>12) bad('句內空格格式無效。');
    const refs=sentenceParts(b.sentence).filter(p=>p.blank).map(p=>p.blank);
    if(!draft && (!refs.length||refs.length!==b.blanks.length||new Set(refs).size!==refs.length||refs.some(id=>!b.blanks.some(x=>x.id===id)))) bad('句子必須包含每個空格，且各出現一次。');
    if(new Set(b.blanks.map(x=>x.id)).size!==b.blanks.length) bad('空格識別碼重複。');
    for(const x of b.blanks) {
      if(!idOK(x.id)||!Array.isArray(x.answers)||!Array.isArray(x.distractors)||x.answers.length>20||x.distractors.length>20||[...x.answers,...x.distractors].some(t=>typeof t!=='string'||textLength(t)>200)) bad('空格答案格式無效。');
      if(!draft && (!x.answers.length||[...x.answers,...x.distractors].some(t=>!t.trim())||x.distractors.some(t=>x.answers.some(a=>norm(a)===norm(t))))) bad('空格需有正解，干擾不能等於正解。');
    }
  }
  if(['label','hotspot','draw'].includes(b.type)) {
    if(!b.background||typeof b.background.alt!=='string'||b.background.alt.length>500) bad('請設定底圖替代文字。');
    if(!draft && (b.type!=='draw'||b.canvasMode==='image') && (!b.background.alt.trim()||!b.media.some(m=>m.id===b.background.assetId&&m.kind==='image'))) bad('請選擇有效底圖並填寫替代文字。');
    if(b.type==='draw'&&!['blank','image'].includes(b.canvasMode)) bad('請選擇空白或圖片畫布。');
  }
  if(b.type==='label') {
    if(!list(b.labels,20)||!list(b.anchors,20)||new Set(b.labels.map(l=>l.id)).size!==b.labels.length||new Set(b.anchors.map(a=>a.id)).size!==b.anchors.length) bad('標籤／錨點數量或識別碼無效。');
    if(b.labels.some(l=>!idOK(l.id)||typeof l.text!=='string'||l.text.length>200)||b.anchors.some(a=>!idOK(a.id)||!unit(a.x)||!unit(a.y)||!['up','down','left','right'].includes(a.direction))) bad('標籤／錨點設定無效。');
    if(!draft && (b.labels.some(l=>!l.text.trim())||b.anchors.some(a=>!b.labels.some(l=>l.id===a.labelId))||new Set(b.anchors.map(a=>a.labelId)).size!==b.anchors.length)) bad('每個錨點需要一個不同的正確標籤。');
  }
  if(b.type==='hotspot') {
    if(!list(b.regions,10)||new Set(b.regions.map(r=>r.id)).size!==b.regions.length) bad('熱點需 1–10 個不重複區域。');
    for(const r of b.regions) {
      if(!idOK(r.id)||typeof r.correct!=='boolean'||!['point','rect','polygon'].includes(r.shape)) bad('熱點格式無效。');
      if(r.shape==='polygon' ? (!list(r.vertices,20)||r.vertices.length<3||r.vertices.some(p=>!unit(p.x)||!unit(p.y))) : (!unit(r.x)||!unit(r.y))) bad('熱點座標無效。');
      if(r.shape==='point' && (!unit(r.r)||r.r<=0)) bad('熱點半徑無效。');
      if(r.shape==='rect' && (!unit(r.w)||!unit(r.h)||r.w<=0||r.h<=0||r.x+r.w>1||r.y+r.h>1)) bad('熱點矩形超出圖片。');
    }
    if(!draft && (!b.regions.some(r=>r.correct)||new Set(b.regions.map(r=>r.shape)).size!==1)) bad('熱點需要正解且區域種類必須一致。');
  }
  if(b.type==='category' && (!list(b.groups,4)||b.groups.length<2||!list(b.items,20)||(!draft&&(b.groups.some(g=>!g.trim())||b.items.some(i=>!i.trim())||b.groups.some((_,i)=>!b.mapping.includes(i)))))) bad('分類需 2–4 組、最多 20 項，且每组至少一項。');
  if(b.type==='order' && (!list(b.items,20)||b.items.length<2||(!draft&&b.items.some(i=>typeof i!=='string'||!i.trim())))) bad('排序需 2–20 個有效項目。');
}
function mixed(values, salt, unique=true) {
  const hash=t=>{let h=2166136261;for(const c of salt+t)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;};
  return (unique?[...new Set(values)]:[...values]).sort((a,b)=>hash(a)-hash(b)||a.localeCompare(b));
}
export function publicParity(b,reveal=false) {
  const s=clone(b);
  if(s.slideCanvas)delete s.slideCanvas.original;
  if(s.questionCanvas)delete s.questionCanvas.original;
  if(b.type==='multiselect')s.requiredSelections=b.answer?.length??b.requiredSelections;
  if(b.type!=='slide')delete s.embed;
  for(const k of ['notes','focusRule','migration','answer','alternatives','mapping','displayItems','correctOrder']) delete s[k];
  if(s.blanks) s.blanks=s.blanks.map(x=>({id:x.id,...(b.type==='blank'?{}:{choices:mixed(x.choices||[...(x.answers||[]),...(x.distractors||[])],b.id+x.id)}),...(reveal?{answers:x.answers}:{})}));
  if(s.labels) s.labels=mixed(s.labels.map(l=>l.id),b.id).map(id=>s.labels.find(l=>l.id===id));
  if(s.aiRubric) s.aiRubric={enabled:false};
  if(s.anchors) s.anchors=s.anchors.map(({labelId,...a})=>reveal?{...a,labelId}:a);
  if(s.regions) s.regions=s.regions.map(({correct,...r})=>reveal?{...r,correct}:r);
  if(b.type==='order') { s.items=clone(b.displayItems||mixed(b.items,b.id,false));if(reveal)s.correctOrder=clone(b.items); }
  if(reveal) for(const k of ['answer','alternatives','mapping']) if(b[k]!==undefined)s[k]=clone(b[k]);
  // Generic legacy fields are not sent on new inline/image contracts.
  if(inlineTypes.includes(b.type)||['label','hotspot'].includes(b.type)) for(const k of ['items','options','zones'])delete s[k];
  return s;
}
export function solutionText(b) {
  if(inlineTypes.includes(b.type))return b.blanks.map((x,i)=>`${i+1}: ${(x.answers||[]).join(' / ')}`).join('；');
  if(b.type==='label')return b.anchors.map((a,i)=>`${i+1}: ${b.labels.find(l=>l.id===a.labelId)?.text||''}`).join('；');
  if(b.type==='hotspot')return b.regions.map((r,i)=>r.correct?`區域 ${i+1}`:'').filter(Boolean).join('、');
  if(b.type==='order')return (b.correctOrder||b.items).join(' → ');
  if(b.type==='category')return b.items.map((item,i)=>`${item}: ${b.groups[b.mapping?.[i]]||''}`).join('；');
  if(['choice','multiselect'].includes(b.type))return b.answer?.map(i=>b.options[i]).join(' / ')||'';
  return b.type==='cloud'?'不計分': '由教師評分';
}
export function gradeParity(b,a) {
  const version='parity-1';
  if(b.type==='multiselect') {
    validateParity(b);
    if(!Array.isArray(a)||!a.length||a.length>b.answer.length||new Set(a).size!==a.length||a.some(i=>!Number.isInteger(i)||i<0||i>=b.options.length))bad('請選擇 1 至指定數量的不重複選項。');
    const unit=b.points/b.answer.length;
    const details=b.options.map((text,i)=>({id:String(i),text,selected:a.includes(i),target:b.answer.includes(i),contribution:a.includes(i)?(b.answer.includes(i)?unit:-unit):0}));
    return {status:'graded',score:Math.round(Math.max(0,details.reduce((sum,d)=>sum+d.contribution,0))*100)/100,max:b.points,scoringVersion:'multiselect-1',details};
  }
  if(b.type==='cloud'||b.ungraded)return {status:'ungraded',score:null,max:0,scoringVersion:version,details:[]};
  if(['open','draw'].includes(b.type))return {status:'pending',score:null,max:b.points,scoringVersion:version,details:[]};
  let details;
  if(inlineTypes.includes(b.type)||b.type==='label') {
    const units=b.type==='label'?b.anchors:b.blanks;
    if(!a||typeof a!=='object'||Array.isArray(a)||Object.keys(a).length!==units.length||Object.keys(a).some(k=>!units.some(u=>u.id===k)))bad('請完成每個空格或標籤。');
    details=units.map(u=>{
      const v=a[u.id];
      if(typeof v!=='string'||!v.trim()||textLength(v)>200)bad('請完成每個空格或標籤。');
      if(b.type==='label'&&!b.labels.some(l=>l.id===v))bad('標籤無效。');
      if(b.type==='dropdown'&&![...u.answers,...u.distractors].includes(v))bad('選項無效。');
      if(b.type==='drag'&&!b.blanks.flatMap(x=>[...x.answers,...x.distractors]).includes(v))bad('選項無效。');
      return {id:u.id,correct:b.type==='label'?v===u.labelId:u.answers.some(x=>norm(x)===norm(v))};
    });
    if(b.type==='label'&&new Set(Object.values(a)).size!==units.length)bad('同一標籤不能重複使用。');
  } else if(b.type==='hotspot') {
    if(!list(a,10)||new Set(a).size!==a.length||a.some(id=>!b.regions.some(r=>r.id===id)))bad('請選取有效且不重複的熱點。');
    const right=b.regions.filter(r=>r.correct),wrong=a.filter(id=>!right.some(r=>r.id===id)).length;
    details=b.regions.map(r=>({id:r.id,correct:r.correct&&a.includes(r.id),selected:a.includes(r.id),target:r.correct,max:r.correct?b.points/right.length:0,earned:a.includes(r.id)?(r.correct?1:-1)*b.points/right.length:0}));
    let ratio=Math.max(0,(right.filter(r=>a.includes(r.id)).length-wrong)/right.length);
    if(!b.partial)ratio=ratio===1?1:0;
    return {status:'graded',score:Math.round(b.points*ratio*100)/100,max:b.points,scoringVersion:version,details};
  } else return null;
  let ratio=details.filter(d=>d.correct).length/details.length;
  if(!b.partial)ratio=ratio===1?1:0;
  return {status:'graded',score:Math.round(b.points*ratio*100)/100,max:b.points,scoringVersion:version,details:details.map(d=>({...d,max:b.points/details.length,earned:d.correct&&(b.partial||ratio===1)?b.points/details.length:0}))};
}
