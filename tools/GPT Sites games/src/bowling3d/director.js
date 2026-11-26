// Plays a recorded shot: camera work, hit-stop, slow-motion replay, effects and sound cues.
// Timing targets: normal shot 3–4 s, special shot (strike, spare, power card) 6–8 s.
import * as THREE from 'three';
import {LANE,STEP} from './physics.mjs';
import {RACK_CENTER} from './stage.js';
import {CameraRig} from '../game3d/camera-rig.js';
import {CardShow,cardTrail} from './cards3d.js';
import {CARD_META} from '../bowling-model.mjs';

const C=hex=>new THREE.Color(hex);
const FIRE=[C('#fff1a8'),C('#ffb02e'),C('#ff5a1f'),C('#ff2a2a')],SPARKLE=[C('#ffffff'),C('#ffe98a'),C('#8fe9ff')];
const PARTY=[C('#ff3fd0'),C('#27e0ff'),C('#ffe21f'),C('#7dff6b'),C('#ffffff')];
const ease=v=>v*v*(3-2*v),clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const L=LANE.length;

export class ShotDirector extends CameraRig{
  constructor(stage,audio){
    super(stage);this.audio=audio;this.cards=new CardShow(stage,audio);
    this.idle(0);
  }
  /** Resting camera between shots: behind the ball, looking down the lane. */
  idle(startX=0){
    this.camPos.set(startX*.5,1.15,2.75);this.camLook.set(startX*.3,.25,-5);this.fov=48;this.applyCamera();
  }
  /**
   * options: {tier:'normal'|'special', label, reduced, onFire, startX, skin, onCue(name,data),
   *   card:{id, hit, amount, swap}} — `card` plays a power card; reveal it first with revealCard().
   * Resolves when the whole presentation (including any replay) has finished.
   */
  play(recording,options={}){
    this.cancel();
    const special=options.tier==='special'&&!options.reduced,card=options.card||null;
    const impact=recording.impactAt,gutter=recording.kind==='gutter',cardRoll=recording.kind==='card';
    const endLive=impact!=null?Math.min(recording.duration,impact+(options.reduced?.9:1.5)):recording.duration;
    if(card&&!this.cards.reveal){this.stage.setBall(options.skin??0,card.id);this.stage.setAura(CARD_META[card.id].color,.8);}
    return new Promise(resolve=>{
      this.active={recording,options,special,impact,gutter,endLive,resolve,phase:'windup',wall:0,rt:0,
        windup:card?(options.reduced?.3:.7):options.reduced?.15:.5,card,cardRoll,trail:card?cardTrail(card.id):null,cardSlow:1,
        decideAt:card?.id==='hit-or-miss'?(impact!=null?impact-.32:(recording.gutterAt??1)-.22):null,hitstop:0,contactIndex:0,fired:new Set(),replay:special&&impact!=null,
        side:(recording.shot?.entryX??recording.side??0)>=0?-1:1,
        contacts:[...recording.contacts].sort((a,b)=>a.t-b.t),clock:0};
      this.stage.charge=0;this.cue('windup');
      if(!options.reduced)this.audio.charge(this.active.windup);
    });
  }
  cancel(){
    if(!this.active)return;
    const {resolve}=this.active;this.active=null;this.audio.rollStop();this.audio.drumStop();this.audio.duck(false);this.stage.charge=0;this.cards.reset();resolve({cancelled:true});
  }
  /** Shows a power card flying out and flipping over. Resolves once it is readable; then call play() with options.card. */
  revealCard(id,options){this.cancel();return this.cards.show(id,options);}
  /** Clears card props, the card ball's glow and any squashed ball left by an effect. */
  resetCards(){this.cards.reset();}
  sample(rt){
    const {recording}=this.active,frames=recording.frames,position=clamp(rt/STEP,0,frames.length-1);
    const i=Math.min(frames.length-2,Math.floor(position));
    this.stage.applyFrame(frames[Math.max(0,i)],frames[Math.min(frames.length-1,i+1)],position-i,recording.order);
  }
  update(dt){
    const a=this.active,stage=this.stage;
    this.shake*=Math.exp(-8*dt);this.cards.update(dt);
    if(!a){this.applyCamera();return;}
    const {options,recording}=a,reduced=!!options.reduced,ball=stage.ball.position;
    a.wall+=dt;a.clock+=dt;
    if(a.phase==='windup'){
      const u=clamp(a.wall/a.windup,0,1);this.sample(0);stage.charge=ease(u)*(a.special||options.onFire?1:.6);
      if(a.card)this.cards.absorb(u,options.skin??0);
      if(reduced){this.wantPos.set(0,2,2.4);this.wantLook.set(0,0,-L*.72);this.fov=40;this.follow(dt,0,true);}
      else{
        this.wantPos.set(ball.x*.8,1.15-u*.72,2.75-u*1.75);this.wantLook.set(ball.x*.7,.2,-4.5);this.fov=48+u*4;this.follow(dt,9);
        for(let i=0;i<3;i++){const ang=Math.random()*6.3,r=.55; // energy gathers into the ball
          stage.sparks.emit(ball.x+Math.cos(ang)*r,ball.y+Math.sin(ang)*r*.8,ball.z+(Math.random()-.5)*.3,-Math.cos(ang)*r*2.2,-Math.sin(ang)*r*1.8,0,
            (a.trail||(options.onFire?FIRE:SPARKLE))[i%3],.06,.26,0,0);}
      }
      if(u>=1){a.phase='live';a.wall=0;this.audio.release();this.audio.rollStart();this.cue('release');}
    }else if(a.phase==='live'){
      let scale=1;
      if(a.hitstop>0){a.hitstop-=dt;scale=0;}
      else if(a.impact!=null&&!reduced){
        const since=a.rt-a.impact;
        if(since>=0&&since<(a.special?.2:.08))scale=a.special?.3:.6;
        else if(since>=0&&since<(a.special?.45:.2))scale=a.special?.65:.85;
      }
      a.rt=Math.min(a.endLive,a.rt+dt*scale);this.sample(a.rt);
      if(a.cardRoll)this.shake=Math.max(this.shake,this.cards.approach(a.card.id,recording.effectAt-a.rt,reduced));
      if(a.decideAt!=null)this.suspense(a);
      this.liveEvents(a,dt,scale,1);
      const cutAt=a.impact!=null?a.impact-.2:null;
      if(reduced){this.follow(dt,0,true);}
      else if(cutAt===null||a.rt<cutAt){
        const chaseZ=Math.max(ball.z,-L+.9);
        this.wantPos.set(ball.x*.78,.5,chaseZ+1.45);this.wantLook.set(ball.x*.55,.12,chaseZ-3.2);
        this.fov=52+clamp(a.rt*14,0,12);
        if(a.gutter&&ball.z<-L+2.6){this.wantPos.set(-a.side*.35,.8,-L+3.1);this.wantLook.copy(RACK_CENTER);this.fov=46;this.follow(dt,3.5);}
        else this.follow(dt,10);
      }else{
        const first=!a.fired.has('cut');this.once('cut',()=>{});
        const push=clamp((a.rt-cutAt)/1.6,0,1);
        this.wantPos.set(a.side*(.66-push*.14),.6-push*.1,-L+2.05-push*.4);this.wantLook.copy(RACK_CENTER);this.fov=46-push*3;
        this.follow(dt,4,first);
      }
      if(a.rt>=a.endLive&&a.hitstop<=0){
        this.audio.rollStop();
        if(a.cardRoll){a.phase='cardEffect';a.wall=0;
          this.cards.start(a.card.id,{...a.card,reduced,cue:(name,data)=>this.cue(name,data),shake:amount=>{this.shake=Math.max(this.shake,amount);}});}
        else if(a.replay){a.phase='replayIntro';a.wall=0;this.audio.swoosh();this.audio.duck(true);this.cue('replayStart');}
        else{a.phase='outro';a.wall=0;}
      }
    }else if(a.phase==='replayIntro'){
      if(a.wall>=.28){
        a.phase='replay';a.wall=0;a.rt=Math.max(0,a.impact-.14);a.contactIndex=a.contacts.findIndex(c=>c.t>=a.rt);
        if(a.contactIndex<0)a.contactIndex=a.contacts.length;
        a.fired.delete('impact');a.replaying=true;stage.sparks.clear();
        this.wantPos.set(-a.side*.5,.3,-L-1.5);this.wantLook.set(a.side*.08,.2,-L+.4);this.fov=58;this.follow(dt,0,true);
      }
    }else if(a.phase==='replay'){
      const since=a.rt-a.impact,scale=since<.32?.2:.55;
      a.rt+=dt*scale;this.sample(a.rt);this.liveEvents(a,dt,scale,scale<.3?.45:.7);
      this.wantPos.x+=dt*a.side*.16;this.wantPos.y+=dt*.035;this.fov=58-clamp(since+.14,0,1)*8;this.follow(dt,5);
      if(since>=.74){a.phase='outro';a.wall=0;this.audio.duck(false);this.cue('replayEnd');}
    }else if(a.phase==='cardEffect'){
      if(!reduced&&this.cards.running){
        const view=this.cards.camera(a.side);this.wantPos.set(...view.pos);this.wantLook.set(...view.look);this.fov=view.fov;this.follow(dt,3.2,a.wall<=dt*1.5);
      }
      const step=this.cards.step(dt*a.cardSlow);a.cardSlow=step.slow;
      if(step.done){a.phase='outro';a.wall=0;}
    }else if(a.phase==='outro'){
      if(a.wall>=(reduced?.2:a.cardRoll?.45:a.card&&a.impact==null?3.6:a.impact==null?.85:.4)){
        const {resolve}=a,elapsed=a.clock;this.active=null;stage.charge=0;this.audio.drumStop();
        this.cue('done');resolve({cancelled:false,seconds:elapsed,fallen:recording.fallen});
        return;
      }
    }
    this.applyCamera();
  }
  /** Hit or Miss: the ball flashes green and red to a drum roll, and only settles just before the result. */
  suspense(a){
    const {stage,audio}=this,hit=a.impact!=null;
    if(a.rt<a.decideAt){this.once('drum',()=>audio.drumStart());stage.setAura(Math.floor(a.clock*9)%2?'#19ff6a':'#ff3355',1);}
    else this.once('decide',()=>{audio.drumStop();audio.fx('rimshot');audio.fx(hit?'ding':'buzzer');stage.setAura(hit?'#19ff6a':'#ff3355',1);this.cue('decide',{hit});
      if(!a.options.reduced)stage.sparks.burst(stage.ball.position,50,{speed:2,up:1,colors:[C(hit?'#19ff6a':'#ff3355'),C('#ffffff')],size:.09,life:.5,gravity:1});});
  }
  /** Things that happen at a recorded moment: trail, impact, pin contacts, labels. Runs for live play and replay. */
  liveEvents(a,dt,scale,pitch){
    const {stage,audio}=this,{options,recording}=a,ball=stage.ball.position,reduced=!!options.reduced,replaying=!!a.replaying;
    const hot=a.special||options.onFire,beforeImpact=a.impact==null||a.rt<a.impact;
    audio.rollUpdate(ball.x*1.6,scale===0?.3:pitch);
    if(!reduced&&scale>0&&beforeImpact&&ball.y>.05&&!replaying){
      const count=hot||a.trail?5:2;
      for(let i=0;i<count;i++)stage.sparks.emit(ball.x+(Math.random()-.5)*.12,ball.y*(.3+Math.random()*1.1),ball.z+.05+Math.random()*.2,
        (Math.random()-.5)*.6,hot?.4+Math.random()*.9:.2+Math.random()*.4,1.2+Math.random(),
        (a.trail||(hot?FIRE:SPARKLE))[Math.floor(Math.random()*3)],hot?.13:.05,hot?.5:.32,hot?-1.2:0,1.4,hot?-.12:0);
    }
    if(a.impact!=null&&a.rt>=a.impact)this.once('impact',()=>{
      const count=recording.fallen.length,at={x:ball.x,y:.15,z:ball.z-.1};
      if(!replaying){a.hitstop=reduced?0:a.special?.16:.07;audio.impact(count,options.tier);this.cue('impact',{count});}
      else audio.slowBoom();
      if(!reduced){
        this.shake=replaying?.02:a.special?.13:.06;stage.flashAt(at,a.special?1:.55);
        stage.shockwaves.fire(at,a.special?'#fff6b0':'#ffffff',a.special?2.4:1.4,a.special?.7:.45);
        stage.sparks.burst(at,a.special?150:60,{speed:a.special?5.5:3.2,up:2,colors:hot?FIRE:SPARKLE,size:a.special?.13:.08,life:a.special?.9:.55});
      }
    });
    while(a.contactIndex<a.contacts.length&&a.contacts[a.contactIndex].t<=a.rt){
      const contact=a.contacts[a.contactIndex++],lane=contact.a==='lane'||contact.b==='lane';
      const id=typeof contact.a==='number'?contact.a:typeof contact.b==='number'?contact.b:null;
      const where=id!=null?stage.pins[id].position:ball;
      audio.contact(contact.force,lane?'lane':'pin',pitch,where.x*1.4);
      if(!reduced&&!lane&&contact.force>260&&Math.random()<.5)stage.sparks.burst({x:where.x,y:where.y+.18,z:where.z},6,{speed:1.8,up:.6,colors:SPARKLE,size:.05,life:.3,gravity:3});
    }
    if(replaying||a.cardRoll)return;
    if(recording.ballGoneAt!=null&&a.rt>=recording.ballGoneAt)this.once('pit',()=>{audio.rollStop();audio.pit();});
    if(a.gutter&&recording.gutterAt!=null&&a.rt>=recording.gutterAt)this.once('gutter',()=>{audio.gutter();this.cue('gutter');});
    const labelAt=a.impact!=null?a.impact+.34:(recording.ballGoneAt??recording.duration)+.1;
    if(a.rt>=Math.min(labelAt,a.endLive))this.once('label',()=>this.celebrate(a));
  }
  celebrate(a){
    const {stage,audio}=this,{options,recording}=a,count=recording.fallen.length,kind=options.celebration||(count===0?'miss':count>=7?'good':'ok');
    this.cue('label',{label:options.label,kind,count});
    const say=text=>{if(options.announce!==false)audio.announce(typeof options.announce==='string'?options.announce:text);};
    if(kind==='miss'){audio.aww();audio.fanfare('miss');if(a.gutter)say('Gutter ball');return;}
    const deck=new THREE.Vector3(0,.3,-L-.3);
    if(kind==='strike'||kind==='spare'){
      const big=kind==='strike';
      audio.fanfare(kind);audio.cheer(big?1:.8);stage.cheer(1);stage.lightShow(1);
      say(big?'Strike':'Spare');
      if(!options.reduced){
        for(const side of [-1,1])stage.confetti.shoot(new THREE.Vector3(side*.75,.1,-L+.6),new THREE.Vector3(-side*.35,1,-.25),big?150:70,big?5.6:4.6);
        const bursts=big?5:2;
        for(let i=0;i<bursts;i++)setTimeout(()=>{
          if(!stage.sparks)return;
          const at={x:(Math.random()-.5)*2.4,y:1.5+Math.random()*1.1,z:-L-.2+(Math.random()-.5)*1.6};
          stage.sparks.burst(at,90,{speed:3.2,up:.4,colors:PARTY,size:.12,life:1.2,gravity:1.6,drag:1.8});stage.flashAt(at,.2);audio.firework();
        },180+i*260);
      }
    }else if(kind==='good'){audio.fanfare('good');audio.cheer(.55);stage.cheer(.6);stage.lightShow(.35);say('Nice shot');
      if(!options.reduced)stage.sparks.burst(deck,50,{speed:2.6,up:2.4,colors:PARTY,size:.09,life:.9,gravity:3});
    }else{audio.cheer(.25);stage.cheer(.3);}
  }
}
