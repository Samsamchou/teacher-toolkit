// Plays a planned basketball shot or power card: camera work, the animal's moves, hit-stop, slow-motion replay,
// effects and sound cues. Timing targets: normal shot 3–4 s, special (three-pointer made, power card) 6–8 s.
import * as THREE from 'three';
import {CameraRig} from '../game3d/camera-rig.js';
import {HOOP,SPOTS,STEP} from './shots.mjs';
import {BasketCards,BASKET_CARDS,cardTrail} from './cards.js';

const C=hex=>new THREE.Color(hex);
const FIRE=[C('#fff1a8'),C('#ffb02e'),C('#ff5a1f'),C('#ff2a2a')],SPARKLE=[C('#ffffff'),C('#ffe98a'),C('#8fe9ff')];
const PARTY=[C('#ff3fd0'),C('#27e0ff'),C('#ffe21f'),C('#7dff6b'),C('#ffffff')];
const ease=v=>v*v*(3-2*v),clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const RIM=new THREE.Vector3(0,HOOP.rimY,0);

export class BasketDirector extends CameraRig{
  constructor(stage,audio){
    super(stage);this.audio=audio;this.cards=new BasketCards(stage,audio);
    this.idle(2);
  }
  /** Resting view between shots: the whole half court from the side, shooter on the right, hoop on the left. */
  idle(points=2){
    // Pulls back far enough for the hoop and the shooter to fit, whatever the shape of the screen.
    const d=SPOTS[points]||SPOTS[2],span=d+3.4,camera=this.stage.camera;
    const distance=Math.max(7,span/(2*Math.tan(46*Math.PI/360)*camera.aspect));
    this.camPos.set(d/2-.5,2.2+distance*.03,distance);this.camLook.set(d/2-.5,2,0);this.fov=46;this.applyCamera();
  }
  /**
   * recording: from planShot()/planDunk(), or null for a card that is not a shot.
   * options: {points, tier:'normal'|'special', label, reduced, onFire, celebration, announce, onCue(name,data),
   *   card:{id, hit, swap, steal, counter}} — reveal a card first with revealCard().
   */
  play(recording,options={}){
    this.cancel();
    const card=options.card||null,special=options.tier==='special'&&!options.reduced,result=recording?.resultAt??null;
    return new Promise(resolve=>{
      this.active={recording,options,card,special,result,resolve,phase:'windup',wall:0,rt:0,clock:0,hitstop:0,eventIndex:0,fired:new Set(),cardSlow:1,
        windup:options.reduced?.25:card?(recording?.7:1.6):.5,dunk:recording?.style==='dunk',
        // Shots that take longer to resolve (bank, rim roll) hold the result a little less, so a normal shot stays near 3.5–4 s.
        endLive:recording?Math.min(recording.duration,result+(options.reduced?.8:recording.style==='dunk'?.85:special?1.2:clamp(2.65-result,.8,1.2))):0,
        replay:special&&!!recording?.hit,trail:card?cardTrail(card.id):null,hands:this.stage.ball.position.clone(),handScale:this.stage.ball.scale.x,
        decideAt:card?.id==='hit-or-miss'&&recording?result-.36:null};
      if(card&&!this.cards.reveal)this.stage.setAura(BASKET_CARDS[card.id].color,.8);
      this.stage.charge=0;this.cue('windup');
      if(!options.reduced){this.audio.charge(this.active.windup);this.audio.squeak();}
    });
  }
  cancel(){
    if(!this.active)return;
    const {resolve}=this.active;this.active=null;this.audio.drumStop();this.audio.duck(false);this.stage.charge=0;this.cards.reset();resolve({cancelled:true});
  }
  revealCard(id,options){this.cancel();return this.cards.show(id,options);}
  /** Clears card props and the ball's glow, and stands the shooter back on the spot. */
  reset(points=2){this.cards.reset();this.stage.setPose(0);this.stage.placePlayer(points);this.idle(points);}
  sample(rt){
    const frames=this.active.recording.frames,position=clamp(rt/STEP,0,frames.length-1),i=Math.min(frames.length-2,Math.floor(position));
    this.stage.applyBall(frames[Math.max(0,i)],frames[Math.min(frames.length-1,i+1)],position-i);
  }
  /** The animal's body for the recorded time rt: jump shot, or the run-up, leap and rim hang of a dunk. */
  movePlayer(a,rt){
    const stage=this.stage,player=stage.player,rec=a.recording,ball=stage.ball.position;
    if(a.dunk){
      const fly=rt>=rec.run,hang=rt-rec.resultAt;
      if(!fly){player.position.set(ball.x+.32,Math.abs(Math.sin(rt/rec.run*Math.PI*5))*.12,0);stage.setPose(0);player.rotation.z=-.08;}
      else if(hang<.34){player.position.set(ball.x+.28,Math.max(0,(hang<0?ball.y:HOOP.rimY)-2.05+stage.lift),0);stage.setPose(1);player.rotation.z=-.12;}
      else{const u=clamp((hang-.34)/.42);player.position.set(.5+u*.4,(HOOP.rimY-2.05+stage.lift)*(1-u*u),0);player.rotation.z=0;stage.setPose(2);
        if(u>=1)this.once('land',()=>{this.audio.bounce(.7);this.shake=Math.max(this.shake,.03);});}
    }else{
      const jump=clamp(rt/.6);player.position.y=Math.sin(jump*Math.PI)*.42;
      if(rt<a.result+.3)stage.setPose(1);
    }
    stage.syncExtras();
  }
  update(dt){
    const a=this.active,stage=this.stage;
    this.shake*=Math.exp(-8*dt);this.cards.update(dt);
    if(!a){this.applyCamera();return;}
    const {options,recording}=a,reduced=!!options.reduced,ball=stage.ball.position,player=stage.player,px=player.position.x;
    a.wall+=dt;a.clock+=dt;
    if(a.phase==='windup'){
      const u=clamp(a.wall/a.windup),raise=ease(clamp((u-.25)/.75));
      stage.charge=ease(u)*(a.special||options.onFire||a.card?1:.6);
      player.scale.y=1-Math.sin(u*Math.PI)*.09; // crouch before the jump
      if(a.card)this.cards.absorb(clamp(a.wall/Math.min(a.windup,1.1)));
      if(recording&&!a.dunk&&raise>0){
        // The ball leaves the paws: from the painted ball's place and size up to the release point.
        if(stage.releaseBall()){a.hands.copy(ball);a.handScale=stage.ball.scale.x;}
        const f=recording.frames[0];ball.set(a.hands.x+(f[0]-a.hands.x)*raise,a.hands.y+(f[1]-a.hands.y)*raise,a.hands.z+(f[2]-a.hands.z)*raise);
        stage.ball.scale.setScalar(a.handScale+(1-a.handScale)*raise);stage.syncExtras();
      }
      if(reduced){this.idle(options.points);}
      else{this.wantPos.set(px+.9-u*.5,1.75-u*.2,5.2-u*1.3);this.wantLook.set(px-1.1,1.9,0);this.fov=46+u*3;this.follow(dt,7);
        for(let i=0;i<3;i++){const ang=Math.random()*6.3,r=.6;
          stage.sparks.emit(ball.x+Math.cos(ang)*r,ball.y+Math.sin(ang)*r,ball.z+.1,-Math.cos(ang)*r*2.2,-Math.sin(ang)*r*2.2,0,(a.trail||(options.onFire?FIRE:SPARKLE))[i%3],.07,.26,0,0);}}
      if(u>=1){
        player.scale.y=1;a.wall=0;
        if(recording){stage.releaseBall();stage.ball.scale.setScalar(1);a.phase='live';if(a.dunk)this.audio.squeak();else this.audio.release();this.cue('release');}
        else{a.phase='cardEffect';this.cards.start(a.card.id,{...a.card,reduced,cue:(name,data)=>this.cue(name,data),shake:amount=>{this.shake=Math.max(this.shake,amount);}});}
      }
    }else if(a.phase==='live'){
      let scale=1;
      if(a.hitstop>0){a.hitstop-=dt;scale=0;}
      else if(recording.hit&&!reduced){const since=a.rt-a.result;if(since>=0&&since<(a.special?.2:.08))scale=a.special?.3:.6;else if(since>=0&&since<(a.special?.45:.2))scale=a.special?.65:.85;}
      a.rt=Math.min(a.endLive,a.rt+dt*scale);this.sample(a.rt);this.movePlayer(a,a.rt);
      if(a.decideAt!=null)this.suspense(a);
      this.liveEvents(a,scale,1);
      const cutAt=a.result-(a.dunk?.5:.3);
      if(reduced)this.idle(options.points);
      else if(a.dunk&&a.rt<cutAt){this.wantPos.set(ball.x+2.4,1.5,5.4);this.wantLook.set(ball.x-.9,1.9,0);this.fov=50;this.follow(dt,8);}
      else if(a.rt<cutAt){
        const along=clamp(a.rt/Math.max(.2,cutAt));
        this.wantPos.set(ball.x+1.9-along*.4,1.6+ball.y*.34,5.6-along*.6);this.wantLook.set(ball.x-1.2,Math.max(1.9,ball.y*.92),0);this.fov=49+along*5;this.follow(dt,9);
      }else{
        const first=!a.fired.has('cut');this.once('cut',()=>{});const push=clamp((a.rt-cutAt)/1.6);
        if(a.dunk){this.wantPos.set(2.5-push*.3,1.05,3.1-push*.3);this.wantLook.set(.15,2.75,0);this.fov=50;}
        else{this.wantPos.set(2.1-push*.25,2.55-push*.1,3.3-push*.35);this.wantLook.set(-.05,2.95,0);this.fov=42-push*2;}
        this.follow(dt,4,first);
      }
      if(a.rt>=a.endLive&&a.hitstop<=0){
        if(a.replay){a.phase='replayIntro';a.wall=0;this.audio.swoosh();this.audio.duck(true);this.cue('replayStart');}
        else{a.phase='outro';a.wall=0;}
      }
    }else if(a.phase==='replayIntro'){
      if(a.wall>=.28){
        a.phase='replay';a.wall=0;a.rt=Math.max(0,a.result-(a.dunk?.34:.3));a.eventIndex=recording.events.findIndex(event=>event.t>=a.rt);
        if(a.eventIndex<0)a.eventIndex=recording.events.length;
        a.replaying=true;stage.sparks.clear();
        if(a.dunk){this.wantPos.set(1.9,1.3,2.3);this.wantLook.set(.1,2.8,0);this.fov=56;}
        else{this.wantPos.set(.62,1.12,1.45);this.wantLook.set(0,3.02,0);this.fov=56;} // under the basket, looking up through the net
        this.follow(dt,0,true);
      }
    }else if(a.phase==='replay'){
      const since=a.rt-a.result,scale=since<.14?.22:.5;
      a.rt+=dt*scale;this.sample(a.rt);this.movePlayer(a,a.rt);this.liveEvents(a,scale,scale<.3?.45:.7);
      this.wantPos.x+=dt*.1;this.wantPos.z+=dt*.05;this.fov=56-clamp(since+.3)*6;this.follow(dt,5);
      if(since>=.42){a.phase='outro';a.wall=0;this.audio.duck(false);stage.setPose(2);this.cue('replayEnd');}
    }else if(a.phase==='cardEffect'){
      if(!reduced&&this.cards.running){const view=this.cards.camera();this.wantPos.set(...view.pos);this.wantLook.set(...view.look);this.fov=view.fov;this.follow(dt,3.2,a.wall<=dt*1.5);}
      const step=this.cards.step(dt*a.cardSlow);a.cardSlow=step.slow;
      if(step.done){a.phase='outro';a.wall=0;}
    }else if(a.phase==='outro'){
      const missedCard=a.card&&recording&&!recording.hit;
      if(a.wall>=(reduced?.2:!recording?.45:missedCard?2.3:.4)){
        const {resolve}=a,elapsed=a.clock;this.active=null;stage.charge=0;this.audio.drumStop();
        this.cue('done');resolve({cancelled:false,seconds:elapsed,hit:!!recording?.hit});
        return;
      }
    }
    this.applyCamera();
  }
  /** Hit or Miss: the ball flashes green and red in the air to a drum roll and only settles just before the rim. */
  suspense(a){
    const {stage,audio}=this,hit=a.recording.hit;
    if(a.rt<a.decideAt){this.once('drum',()=>audio.drumStart());stage.setAura(Math.floor(a.clock*9)%2?'#19ff6a':'#ff3355',1);}
    else this.once('decide',()=>{audio.drumStop();audio.fx('rimshot');audio.fx(hit?'ding':'buzzer');stage.setAura(hit?'#19ff6a':'#ff3355',1);this.cue('decide',{hit});});
  }
  /** Things that happen at a recorded moment: trail, rim and board hits, the swish, floor bounces, the label. */
  liveEvents(a,scale,pitch){
    const {stage,audio}=this,{options,recording}=a,ball=stage.ball.position,reduced=!!options.reduced,replaying=!!a.replaying,hot=a.special||options.onFire;
    if(!reduced&&scale>0&&a.rt<a.result&&!replaying&&!a.dunk){
      const count=hot||a.trail?5:2;
      for(let i=0;i<count;i++)stage.sparks.emit(ball.x+(Math.random()-.5)*.1,ball.y+(Math.random()-.5)*.1,ball.z+(Math.random()-.5)*.1,.8+Math.random(),(Math.random()-.5)*.5,(Math.random()-.5)*.4,
        (a.trail||(hot?FIRE:SPARKLE))[Math.floor(Math.random()*3)],hot?.16:.07,hot?.5:.32,hot?-1.2:0,1.4,hot?-.14:0);
    }
    while(a.eventIndex<recording.events.length&&recording.events[a.eventIndex].t<=a.rt){
      const event=recording.events[a.eventIndex++],pan=clamp(event.x/6,-1,1),at={x:event.x,y:event.y,z:event.z};
      if(event.type==='rim'){stage.hitRim(event.strength);if(a.dunk&&!replaying)audio.slam();else audio.rim(event.strength*(replaying?.6:1));
        if(!reduced)stage.sparks.burst(at,replaying?10:22,{speed:1.8,up:.6,colors:SPARKLE,size:.06,life:.35,gravity:3});if(!replaying)this.shake=Math.max(this.shake,reduced?0:a.dunk?.16:.025);}
      else if(event.type==='board'){stage.hitBoard(event.strength);audio.board(event.strength*(replaying?.6:1));if(!replaying&&!reduced)this.shake=Math.max(this.shake,.03);}
      else if(event.type==='floor'){audio.bounce(event.strength*(replaying?.5:1),pan);}
      else if(event.type==='jump'&&!replaying)audio.jump();
      else if(event.type==='net'){
        stage.swishNet(a.dunk?1.6:1);
        if(replaying)audio.slowBoom();
        else{a.hitstop=reduced?0:a.special?.14:.06;audio.swish(a.special);this.cue('impact',{points:recording.points});}
        if(!reduced){
          stage.flashAt(RIM,a.special?1:.5);
          stage.sparks.burst({x:0,y:HOOP.rimY-.2,z:0},a.special?140:60,{speed:a.special?4.5:2.8,up:.5,colors:a.trail||(hot?FIRE:SPARKLE),size:a.special?.13:.08,life:a.special?.9:.55,gravity:4});
          if(a.dunk||a.special)stage.shockwaves.fire({x:0,z:0},'#fff6b0',a.dunk?3.2:2.2,.7);
        }
      }
    }
    if(replaying)return;
    if(a.rt>=Math.min(a.result+.32,a.endLive))this.once('label',()=>this.celebrate(a));
  }
  celebrate(a){
    const {stage,audio}=this,{options,recording}=a,points=recording.points;
    const kind=options.celebration||(!recording.hit?'miss':points>=3?'big':'good');
    this.cue('label',{label:options.label,kind:kind==='big'?'strike':kind,points});
    const say=text=>{if(options.announce!==false)audio.announce(typeof options.announce==='string'?options.announce:text);};
    if(kind==='miss'){stage.setPose(3);audio.aww();audio.fanfare('miss');if(recording.style==='rim-out'||recording.style==='in-out')say('So close');return;}
    stage.setPose(2);
    if(kind==='big'){
      audio.fanfare('strike');audio.cheer(1);stage.cheer(1);stage.lightShow(1);say(a.dunk?'Three points':points>=4?'Four points':'Three points');
      if(!options.reduced){
        for(const side of [-1,1])stage.confetti.shoot(new THREE.Vector3(.4,.2,side*2.2),new THREE.Vector3(.1,1,-side*.3),140,6.5);
        for(let i=0;i<5;i++)setTimeout(()=>{
          const at={x:-1+Math.random()*4,y:4+Math.random()*1.6,z:-2+Math.random()*2.5};
          stage.sparks.burst(at,90,{speed:3.6,up:.4,colors:PARTY,size:.16,life:1.2,gravity:1.6,drag:1.8});stage.flashAt(at,.2);audio.firework();
        },180+i*260);
      }
    }else{
      audio.fanfare('good');audio.cheer(points===2?.7:.5);stage.cheer(points===2?.75:.55);stage.lightShow(.35);say(points===2?'Two points':'One point');
      if(!options.reduced)stage.sparks.burst({x:0,y:2.4,z:0},50,{speed:2.8,up:2.2,colors:PARTY,size:.1,life:.9,gravity:3});
    }
  }
}
