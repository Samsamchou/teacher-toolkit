import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { newBlock, validateDeck, publicBlock, embedUrl, TYPES } from '../src/live/domain.mjs';
import { parityBlock, publicParity } from '../src/live/parity.mjs';
import { applyTheme, canvasFor, compactRuns, FONT_PRESETS, formatRuns, plainText, restoreOriginal, SLIDE_THEMES, slideToQuestion, studentSize, textElement, validateCanvas } from '../src/live/slide-canvas.mjs';
import { encodeMonoWav } from '../src/live/audio-recording.mjs';
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const deck = blocks => ({ id:'canvas-course', title:'畫布 QA', blocks });
function legacy() {
  const block = newBlock('slide', 'old-slide'); delete block.slideCanvas;
  return { ...block, title:'Monday 星期一', text:'I go to school.\n二水國小', color:'#ab3377', bold:true, notes:'教師私有備註', embed:'https://www.canva.com/design/abc123/view', media:[{id:'picture',kind:'image',name:'Original picture',sha256:'original-sha'},{id:'voice',kind:'audio',name:'Original voice'}], objects:[{id:'old-object',kind:'text',text:'Selected word',x:10,y:10,w:30,h:20,color:'#223344',size:32,bold:false}] };
}
test('new slides have an empty canvas and no placeholder text object', () => { assert.equal(newBlock().slideCanvas.elements.length,0); validateDeck(deck([newBlock()])); });
test('selected-word formatting preserves every other character and style', () => {
  const runs=[{text:'I like '},{text:'Monday',color:'#112233'},{text:' and Tuesday.'}];
  const formatted=formatRuns(runs,7,13,{color:'#ff0000',bold:true,size:64});
  assert.deepEqual(formatted,[{text:'I like '},{text:'Monday',color:'#ff0000',bold:true,size:64},{text:' and Tuesday.'}]);
  assert.equal(formatted.map(r=>r.text).join(''),runs.map(r=>r.text).join(''));
  assert.equal(runs[1].color,'#112233');
});
test('selection spanning existing runs changes only the covered characters', () => {
  const runs=[{text:'Monday',bold:true},{text:' Tuesday',color:'#123456'}];
  const result=formatRuns(runs,3,9,{color:'#bb3300'});
  assert.deepEqual(result,[{text:'Mon',bold:true},{text:'day',bold:true,color:'#bb3300'},{text:' Tu',color:'#bb3300'},{text:'esday',color:'#123456'}]);
});
test('Chinese, punctuation, newlines and emoji are preserved in rich text', () => { const text='星期一 Monday!\n🚲 go'; const result=formatRuns([{text}],4,10,{bold:true}); assert.equal(result.map(r=>r.text).join(''),text); });
test('a collapsed or out-of-range selection does not delete content', () => { const runs=[{text:'abc'}]; assert.deepEqual(formatRuns(runs,1,1,{bold:true}),runs); assert.equal(formatRuns(runs,999,1000,{bold:true}).map(r=>r.text).join(''),'abc'); });
test('adjacent equal formatting is compacted without stripping manual styles', () => { assert.deepEqual(compactRuns([{text:'a',bold:true},{text:'b',bold:true},{text:'c',bold:false}]),[{text:'ab',bold:true},{text:'c',bold:false}]); });
test('four projection presets map to independent student reading sizes', () => { assert.deepEqual(FONT_PRESETS.map(p=>studentSize(p.teacher)),[22,24,28,32]); assert.equal(studentSize(36),22); });
test('legacy read adapts title, body, objects, all media and embed without rewriting source', () => {
  const source=legacy(),before=digest(source),canvas=canvasFor(source);
  assert.equal(digest(source),before); assert.equal(canvas.elements.filter(e=>e.kind==='text').map(plainText).join('\n'),'Monday 星期一\nI go to school.\n二水國小\nSelected word');
  assert.deepEqual(canvas.elements.filter(e=>e.assetId).map(e=>e.assetId),['picture','voice']); assert.equal(canvas.elements.find(e=>e.kind==='embed').url,source.embed);
  assert.equal(canvas.original.notes,undefined); validateCanvas(canvas,source.media,embedUrl);
  assert.ok(canvas.elements.filter(e=>e.kind==='text').every(e=>FONT_PRESETS.some(p=>p.teacher===e.size)));
});
test('serialized rich canvas survives save/readback exactly', () => {
  const source=legacy(); source.slideCanvas=canvasFor(source); source.slideCanvas.elements[0].runs=formatRuns(source.slideCanvas.elements[0].runs,0,6,{bold:true,color:'#ff0000'});
  const reloaded=JSON.parse(JSON.stringify(source)); assert.deepEqual(canvasFor(reloaded),source.slideCanvas); validateDeck(deck([reloaded]),{draft:true});
});

test('legacy shared decks occupy a separate column from pictures and free objects', () => {
  const canvas=canvasFor(legacy()),embed=canvas.elements.find(e=>e.kind==='embed');
  for(const e of canvas.elements.filter(e=>!['legacy-title','legacy-body','legacy-embed'].includes(e.id))) assert.ok(e.x+e.w<embed.x);
});
test('all five themes preserve the original text, manual styles and asset references', () => {
  const source=legacy(),elements=canvasFor(source).elements,hash=digest(source);
  for(const theme of SLIDE_THEMES) { const result=applyTheme(source,theme.id); assert.deepEqual(result.slideCanvas.elements,elements); assert.deepEqual(result.media,source.media); assert.equal(result.text,source.text); validateDeck(deck([result]),{draft:true}); }
  assert.equal(digest(source),hash);
});
test('whole-course theme application leaves question content and styling unchanged', () => { const question=parityBlock(newBlock('choice','question')); assert.deepEqual(applyTheme(question,'night'),question); });
test('restoring an edited canvas recovers legacy content and media', () => { const original=legacy(),edited=applyTheme(original,'night'); edited.slideCanvas.elements[0].runs=[{text:'Changed'}]; edited.media=[]; assert.deepEqual(restoreOriginal(edited),original); });
test('question conversion creates a hidden copy, preserves teaching content and never guesses answers', () => {
  const source=legacy(),hash=digest(source),question=slideToQuestion(source,parityBlock(newBlock('choice','question-copy')));
  assert.equal(digest(source),hash); assert.equal(question.id,'question-copy'); assert.equal(question.hidden,true); assert.equal(question.conversionPending,true); assert.deepEqual(question.answer,[]); assert.deepEqual(question.media,source.media);
  assert.deepEqual(question.questionCanvas.elements,canvasFor(source).elements); assert.equal(question.questionCanvas.original,undefined); assert.equal(question.notes,''); validateDeck(deck([question]),{draft:true}); validateDeck(deck([source,question]));
});
test('conversion must be reviewed and have valid answers before showing a formal question', () => {
  const question=slideToQuestion(legacy(),parityBlock(newBlock('choice','review-copy'))); question.hidden=false;
  assert.throws(()=>validateDeck(deck([question])),/先確認/); question.conversionPending=false; assert.throws(()=>validateDeck(deck([question])));
  question.options=['Monday','Tuesday','Friday']; question.answer=[0]; validateDeck(deck([question]));
});

test('every supported conversion saves a hidden draft with its teaching content intact', () => {
  const source=legacy(),content=digest(canvasFor(source).elements);
  for(const type of Object.keys(TYPES).filter(t=>t!=='slide')) {
    const target=['audio','vowel'].includes(type)?newBlock(type,`converted-${type}`):parityBlock(newBlock(type,`converted-${type}`));
    const converted=slideToQuestion(source,target);
    assert.equal(digest(converted.questionCanvas.elements),content,type);
    validateDeck(deck([source,converted]),{draft:true});
    validateDeck(deck([source,converted]));
  }
});
test('canvas originals and teacher notes never enter either student contract', () => {
  for(const source of [applyTheme(legacy(),'forest'),parityBlock(applyTheme(legacy(),'forest'))]) { const publicData=publicBlock(source); assert.equal(publicData.notes,undefined); assert.equal(publicData.slideCanvas.original,undefined); assert.equal(source.slideCanvas.original.text,legacy().text); }
  assert.equal(publicParity(parityBlock(applyTheme(legacy(),'ocean'))).slideCanvas.original,undefined);
});
test('invalid coordinates, missing assets and unsupported embeds cannot be saved', () => {
  const source=legacy(),canvas=canvasFor(source); canvas.elements[0].x=99; assert.throws(()=>validateCanvas(canvas,source.media,embedUrl),/位置/);
  const missing=canvasFor(source); missing.elements.find(e=>e.assetId).assetId='missing'; assert.throws(()=>validateCanvas(missing,source.media,embedUrl),/素材/);
  const external=canvasFor(source); external.elements.find(e=>e.kind==='embed').url='javascript:alert(1)'; assert.throws(()=>validateCanvas(external,source.media,embedUrl));
});
test('rich text is plain data and rejects injectable style values', () => { const canvas={version:1,theme:'lavender',elements:[textElement('safe','<img onerror=alert(1)>')]}; validateCanvas(canvas,[],embedUrl); assert.equal(plainText(canvas.elements[0]),'<img onerror=alert(1)>'); canvas.elements[0].runs[0].color='url(javascript:bad)'; assert.throws(()=>validateCanvas(canvas,[],embedUrl),/樣式/); });
test('WAV recording uses mono PCM within existing media limits', () => { const bytes=encodeMonoWav(new Float32Array([-1,0,1])); const view=new DataView(bytes); assert.equal(Buffer.from(bytes).subarray(0,4).toString(),'RIFF'); assert.equal(view.getUint16(22,true),1); assert.equal(view.getUint32(24,true),16000); assert.equal(view.getInt16(44,true),-32768); assert.equal(view.getInt16(48,true),32767); assert.equal(encodeMonoWav(new Float32Array(16000*600)).byteLength,19200044); assert.throws(()=>encodeMonoWav(new Float32Array(16000*600+1)),/10 分鐘/); });
