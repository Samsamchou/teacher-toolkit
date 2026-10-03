const {chromium}=require('C:/Users/User/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs/promises'),assert=require('node:assert/strict');
const base=process.env.MASTERY_QA_BASE||'http://127.0.0.1:5191';
const out=process.env.MASTERY_QA_OUT||'G:/我的雲端硬碟/teacher-toolkit/tools/English Lesson Hub HWG/qa/mastery-retry-20261001';
(async()=>{
  await fs.mkdir(out,{recursive:true});
  const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const tc=await browser.newContext({viewport:{width:1180,height:820}}),sc=await browser.newContext({viewport:{width:1180,height:820}});
  await sc.addInitScript(()=>{
    window.__voices=[];
    const Original=window.AudioContext;
    window.AudioContext=class extends Original {createBufferSource(){const source=super.createBufferSource(),start=source.start.bind(source);source.start=(...args)=>{window.__voices.push({duration:source.buffer?.duration,state:this.state,startedAt:performance.now()});return start(...args);};return source;}};
  });
  const teacher=await tc.newPage(),student=await sc.newPage(),errors=[],report={types:{}};
  for(const page of [teacher,student])page.on('pageerror',e=>errors.push(e.message));
  async function teacherControl(action,extra={}){
    return teacher.evaluate(async({action,extra})=>{const {api}=await import('/src/live/transport.mjs');const code=sessionStorage.getItem('hub-lab-active-room'),r=await api('snapshot',code);return api('control',code,{action,revision:r.revision,...extra});},{action,extra});
  }
  const submit=()=>student.getByRole('button',{name:'提交答案',exact:true}).click();
  const reward=()=>student.getByRole('button',{name:'拉霸 SPIN',exact:true});
  try{
    await teacher.goto(base+'/lab');
    const code=await teacher.evaluate(async()=>{
      const {api}=await import('/src/live/transport.mjs'),{newBlock}=await import('/src/live/domain.mjs'),{parityBlock}=await import('/src/live/parity.mjs'),{saveAsset}=await import('/src/live/media.mjs');
      const blob=await (await fetch('/live-feedback/try-again.webp')).blob();const image=await saveAsset(new File([blob],'mastery-fixture.webp',{type:'image/webp'}));
      const vowelImages=[];for(const [i,word] of ['bike','bus','car'].entries()){const canvas=document.createElement('canvas');canvas.width=240;canvas.height=160;const ctx=canvas.getContext('2d');ctx.fillStyle=['#e3f7ff','#fff1bd','#ffd8ef'][i];ctx.fillRect(0,0,240,160);ctx.fillStyle='#234';ctx.font='bold 42px sans-serif';ctx.fillText(word,45,95);const data=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));vowelImages.push(await saveAsset(new File([data],`mastery-vowel-${i}.png`,{type:'image/png'})));}
      const types=['choice','multiselect','blank','drag','label','hotspot','order','category','dropdown','vowel'];
      const blocks=types.map(type=>{
        const b=type==='vowel'?newBlock(type,'qa-'+type):parityBlock(newBlock(type,'qa-'+type));b.title='Mastery '+type;b.seconds=1;
        if(type==='choice') {b.options=['bike','car','bus','plane'];b.answer=[0];}
        if(['blank','drag','dropdown'].includes(type)){b.sentence='{{b1}} and {{b2}}';b.blanks.push({id:'b2',answers:['train'],distractors:['car']});}
        if(['label','hotspot'].includes(type)){b.media=[image];b.background={assetId:image.id,alt:'Test picture'};}
        if(type==='label'){b.labels.push({id:'l2',text:'bus'});b.anchors.push({id:'a2',x:.8,y:.8,labelId:'l2',direction:'down'});}
        if(type==='hotspot')b.regions.push({id:'r2',shape:'point',x:.8,y:.8,r:.05,correct:false});
        if(type==='order')b.items=['I','can','go'];
        if(type==='vowel'){b.media=vowelImages;b.vowelWords=['bike','bus','car'].map((word,i)=>({word,targets:[1],imageId:b.media[i].id}));}
        return b;
      });
      const r=await api('create',null,{deck:{id:'qa-mastery-'+Date.now(),title:'全對後才能進遊戲 · 本機 QA',rewardGame:'slot',blocks}});
      sessionStorage.setItem('hub-lab-active-room',r.code);return r.code;
    });
    await teacher.reload();await teacher.getByRole('button',{name:'開始上課',exact:true}).waitFor();await teacher.getByRole('button',{name:'開始上課',exact:true}).click();
    await teacherControl('open');
    await student.goto(base+'/lab?join='+code);await student.getByLabel('五位數學號').fill('50101');await student.getByRole('button',{name:'加入課堂',exact:true}).click();
    const choose=async(type,right)=>{
      if(type==='choice')return student.locator('.lh-options button').nth(right?0:1).click();
      if(type==='multiselect'){
        const options=student.locator('.lh-options button');for(let i=0;i<4;i++){const wanted=(right?[1,2,3]:[0,1,2]).includes(i);if((await options.nth(i).getAttribute('aria-pressed')==='true')!==wanted)await options.nth(i).click();}return;
      }
      if(type==='blank'){await student.getByLabel('空格 1',{exact:true}).fill('bike');await student.getByLabel('空格 2',{exact:true}).fill(right?'train':'car');return;}
      if(type==='dropdown'){await student.getByLabel('空格 1',{exact:true}).selectOption('bike');await student.getByLabel('空格 2',{exact:true}).selectOption(right?'train':'car');return;}
      if(type==='drag'){for(const [i,value] of ['bike',right?'train':'car'].entries()){await student.locator('.lh-token-pool').getByRole('button',{name:value,exact:true}).click();await student.locator('.lh-blank-target').nth(i).click();}return;}
      if(type==='label'){const selects=student.locator('.lh-parity-question label select');await selects.nth(0).selectOption(right?'l1':'l2');await selects.nth(1).selectOption(right?'l2':'l1');return;}
      if(type==='hotspot'){const buttons=student.locator('.lh-token-pool button');for(let i=0;i<2;i++){const wanted=i===(right?0:1);if((await buttons.nth(i).getAttribute('aria-pressed')==='true')!==wanted)await buttons.nth(i).click();}return;}
      if(type==='category'){for(const [word,value] of [['bike',0],['car',right?0:1],['plane',1]])await student.getByLabel(word+' 的目標',{exact:true}).selectOption(String(value));return;}
      if(type==='order'){
        const desired=right?['I','can','go']:['go','can','I'];
        for(let index=0;index<desired.length;index++){let position=(await student.locator('.lh-order-handle').allTextContents()).indexOf(desired[index]);while(position>index){await student.getByRole('button',{name:desired[index]+' 向左',exact:true}).click();position--;}}return;
      }
    };
    for(const [index,type] of ['choice','multiselect','blank','drag','label','hotspot','order','category','dropdown'].entries()){
      if(index) {await teacherControl('move',{index});await teacherControl('open');}
      await student.locator(`[data-question-type="${type}"]`).waitFor();await student.waitForTimeout(1200);
      await choose(type,false);await submit();await student.locator('.lh-mastery-feedback.is-encourage').waitFor();assert.equal(await reward().count(),0);assert.equal(await student.getByRole('button',{name:'提交答案',exact:true}).isEnabled(),true);
      const feedbackBox=await student.locator('.lh-mastery-feedback').boundingBox(),answerBox=await student.locator(`[data-question-type="${type}"]`).boundingBox();assert.ok(feedbackBox.y+feedbackBox.height<=answerBox.y,'Feedback must stay above the answer area');
      if(type==='choice'){
        await student.screenshot({path:out+'/try-again.png'});
        await student.setViewportSize({width:390,height:844});assert.equal(await student.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await student.screenshot({path:out+'/phone-try-again.png'});await student.setViewportSize({width:1180,height:820});
        await choose(type,true);await student.waitForTimeout(1900);assert.equal(await student.locator('.lh-options button').nth(0).getAttribute('aria-pressed'),'true');
        await student.reload();await student.locator('[data-question-type="choice"]').waitFor();assert.equal(await student.locator('.lh-options button').nth(1).getAttribute('aria-pressed'),'true');assert.equal(await student.locator('.lh-mastery-feedback').count(),0);
        await student.getByRole('button',{name:'減少回饋動畫：關',exact:true}).click();await submit();await student.locator('.lh-mastery-feedback').waitFor();assert.equal(await student.locator('.lh-mastery-feedback img').evaluate(el=>getComputedStyle(el).animationName),'none');await student.getByRole('button',{name:'減少回饋動畫：開',exact:true}).click();
        await student.getByRole('button',{name:'結果音效：開',exact:true}).click();const before=await student.evaluate(()=>window.__voices.length);await submit();await student.waitForTimeout(350);assert.equal(await student.evaluate(()=>window.__voices.length),before);await student.getByRole('button',{name:'結果音效：關',exact:true}).click();
        report.refreshAndPolling=true;report.muteAndReducedMotion=true;
      }
      await choose(type,true);await submit();await student.locator('.lh-mastery-feedback.is-great').waitFor();assert.equal(await reward().count(),0);
      if(type==='choice')await student.screenshot({path:out+'/great.png'});
      await reward().waitFor();assert.equal(await student.locator(`[data-question-type="${type}"]`).count(),0);
      report.types[type]={wrongBlockedGame:true,editableAfterWrong:true,passedAfterCountdown:true,greatBeforeGame:true};
    }
    await teacherControl('move',{index:9});await teacherControl('open');await student.locator('.lh-vowel-question').waitFor();await student.waitForTimeout(1200);
    await student.getByRole('button',{name:'bike 第 1 個字母 b',exact:true}).click();await student.locator('.lh-mastery-feedback.is-encourage').waitFor();assert.equal(await reward().count(),0);
    for(const [word,letter] of [['bike','i'],['bus','u'],['car','a']])await student.getByRole('button',{name:word+' 第 2 個字母 '+letter,exact:true}).click();
    await student.locator('.lh-mastery-feedback.is-great').waitFor();await reward().waitFor();report.types.vowel={wrongBlockedGame:true,completedThreeWords:true};
    report.voices=await student.evaluate(()=>window.__voices);assert.ok(report.voices.some(v=>v.duration>.3&&v.state==='running'));
    await student.setViewportSize({width:390,height:844});await student.screenshot({path:out+'/phone.png'});assert.equal(await student.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    for(const name of ['try-again','great']){const img=await student.evaluate(async name=>{const i=new Image();i.src='/live-feedback/'+name+'.webp';await i.decode();return {width:i.naturalWidth,height:i.naturalHeight};},name);assert.deepEqual(img,{width:256,height:256});}
    assert.deepEqual(errors,[]);report.feedbackOutsideAnswers=true;report.phoneNoHorizontalOverflow=true;report.status='PASS';report.errors=errors;await fs.writeFile(out+'/browser-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
  }catch(error){await teacher.screenshot({path:out+'/failure-teacher.png'}).catch(()=>{});await student.screenshot({path:out+'/failure-student.png'}).catch(()=>{});console.error(error);process.exitCode=1;}finally{await browser.close();}
})();
