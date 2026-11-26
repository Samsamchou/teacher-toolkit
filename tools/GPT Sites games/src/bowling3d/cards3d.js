// Power-card presentation for 3D bowling: the card reveal, each card's own ball and its effect on the lane.
// Rules and scores stay in bowling-model.mjs; this file only shows what the rules already decided.
import * as THREE from 'three';
import {LANE,BALL_RADIUS} from './physics.mjs';
import {CARD_META,EXTRA_SHOTS} from '../bowling-model.mjs';
import {CardReveal,Coins,ScoreSwap,textPlate} from '../game3d/card-kit.js';

const L=LANE.length,C=hex=>new THREE.Color(hex);
const ease=v=>v*v*(3-2*v),clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v)),out=v=>1-Math.pow(1-clamp(v),3);
const back=v=>{const c=1.7,x=clamp(v)-1;return 1+(c+1)*x*x*x+c*x*x;};

/** Where each card's ball stops, how long its effect runs, and how the crowd takes it. */
export const CARD_SHOW={
  'hit-or-miss':{voice:'Hit or miss',trail:['#19ff6a','#ff3355','#ffffff']},
  'extra-shot':{voice:'Extra shot',stopZ:-L+1.7,length:3.5,mood:'good',trail:['#7fd4ff','#30a9e8','#ffffff']},
  'no-shot':{voice:'No shot',stopZ:-L+1.75,length:3.6,mood:'bad',trail:['#ff8aa3','#eb4e70','#ffffff']},
  'lose-points':{voice:'Lose points',stopZ:-L+1.9,length:3.6,mood:'bad',trail:['#d9f56b','#93c625','#ffffff']},
  'double-points':{voice:'Double points',stopZ:-L+1.6,length:3.7,mood:'good',trail:['#fff1a8','#f7b42e','#ffffff']},
  'swap-points':{voice:'Swap points',stopZ:-L+1.9,length:3.9,mood:'wow',trail:['#d7a8ff','#a865ea','#27e0ff']},
};
export const cardTrail=id=>(CARD_SHOW[id]?.trail||['#ffffff']).map(C);

export class CardShow{
  constructor(stage,audio){
    this.stage=stage;this.audio=audio;this.effect=null;
    const scene=stage.scene,basic=map=>new THREE.MeshBasicMaterial({map,transparent:true,toneMapped:false,side:THREE.FrontSide});
    this.kit=new CardReveal({scene,camera:stage.camera,sparks:stage.sparks,audio,meta:id=>CARD_META[id],trail:cardTrail,voice:id=>CARD_SHOW[id].voice});
    // Props, all hidden until a card needs them.
    const glowing=(color,intensity=1.4)=>new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:intensity,roughness:.3});
    this.minis=[0,1].map(()=>{const m=new THREE.Mesh(new THREE.SphereGeometry(.105,24,16),glowing('#2f9df0',1.1));m.visible=false;scene.add(m);return m;});
    this.sign=new THREE.Group();
    this.sign.add(new THREE.Mesh(new THREE.CircleGeometry(.4,40),new THREE.MeshBasicMaterial({color:'#fff',toneMapped:false,side:THREE.DoubleSide})));
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.4,.06,14,44),glowing('#e3122f',.7));
    const bar=new THREE.Mesh(new THREE.BoxGeometry(.78,.11,.06),glowing('#e3122f',.7));bar.rotation.z=-Math.PI/4;bar.position.z=.01;
    this.sign.add(ring,bar);this.sign.visible=false;scene.add(this.sign);
    this.hole=new THREE.Group();
    const pit=new THREE.CircleGeometry(.27,40);pit.rotateX(-Math.PI/2);
    const rim=new THREE.RingGeometry(.27,.33,40);rim.rotateX(-Math.PI/2);
    this.hole.add(new THREE.Mesh(pit,new THREE.MeshBasicMaterial({color:'#020005'})),
      new THREE.Mesh(rim,new THREE.MeshBasicMaterial({color:'#b7f03a',toneMapped:false,transparent:true,opacity:.9})));
    this.hole.position.y=.004;this.hole.visible=false;scene.add(this.hole);
    this.gate=new THREE.Group();
    const arch=new THREE.Mesh(new THREE.TorusGeometry(.5,.05,14,40,Math.PI),glowing('#ffd23f',1.2));arch.position.y=.02;
    const x2=new THREE.Mesh(new THREE.PlaneGeometry(.5,.3),basic(textPlate([['×2',170,118]],{fill:'#9b4d08',stroke:'#ffe98a',color:'#ffe21f'})));x2.position.y=.74;
    const x2Back=x2.clone();x2Back.rotation.y=Math.PI; // readable from the pin side too
    this.gate.add(arch,x2,x2Back);this.gate.visible=false;scene.add(this.gate);
    this.clone=new THREE.Mesh(stage.ball.geometry,stage.ball.material);this.clone.castShadow=true;this.clone.visible=false;scene.add(this.clone);
    this.coins=new Coins(scene);this.swap=new ScoreSwap(scene);
    this.tmpV=new THREE.Vector3();
  }
  /** The pending card reveal (null when no card is showing). */
  get reveal(){return this.kit.reveal;}
  /** Card flies out of the ball, flips and stops in front of the camera. Resolves when it has arrived. */
  show(id,options={}){this.hideProps();return this.kit.show(id,{...options,from:this.stage.ball.position});}
  /** Called while the ball winds up: the card shrinks into the ball and the ball takes the card's look. */
  absorb(u,skin){
    const stage=this.stage;
    this.kit.absorb(u,stage.ball.position,(id,reduced)=>{
      stage.setBall(skin,id);stage.setAura(CARD_META[id].color,.8);
      if(!reduced)stage.sparks.burst(stage.ball.position,70,{speed:2.6,up:1.2,colors:cardTrail(id),size:.1,life:.7,gravity:2});
      this.audio.fx('sparkle');
    });
  }
  hideProps(){
    for(const m of [...this.minis,this.sign,this.hole,this.gate,this.clone])m.visible=false;
    this.coins.clear();this.swap.hide();
    this.stage.ball.scale.setScalar(1);this.stage.ball.visible=true;this.effect=null;this.landed=this.opened=this.split=false;
  }
  reset(){this.hideProps();this.kit.hide();this.stage.setAura(null,0);}
  /** Always runs: animates the card reveal and any coins still in the air. */
  update(dt){this.coins.update(dt);this.kit.update(dt);}
  /** Props that must already be in place while the ball is still rolling toward its stop. */
  approach(id,remaining,reduced){
    const stage=this.stage,ball=stage.ball,stopZ=CARD_SHOW[id].stopZ,k=clamp(1-remaining/.7);
    if(id==='no-shot'){
      const land=clamp(1-(remaining-.12)/.5);
      this.sign.visible=remaining<.62;this.sign.position.set(0,.46+(1-land*land)*3,stopZ-BALL_RADIUS-.07);
      if(land>=1&&!this.landed){this.landed=true;this.audio.fx('thud');if(!reduced)stage.sparks.burst({x:0,y:.05,z:this.sign.position.z},30,{speed:1.6,up:.4,colors:[C('#ffffff'),C('#ffb3c1')],size:.06,life:.4,gravity:2});return .05;}
    }else if(id==='lose-points'){
      this.hole.visible=remaining<.7;this.hole.position.set(0,.004,stopZ-.33);this.hole.scale.setScalar(Math.max(.01,back(k)));
      if(k>0&&!this.opened){this.opened=true;this.audio.fx('hole');}
    }else if(id==='double-points'){
      const gateZ=stopZ+.95,appear=clamp(1-(remaining-.2)/.9);
      this.gate.visible=remaining<1.15;this.gate.position.set(0,0,gateZ);this.gate.scale.setScalar(Math.max(.01,back(appear)));
      if(ball.position.z<gateZ){ // through the gate: one ball becomes two
        if(!this.split){this.split=true;this.audio.fx('chime');stage.flashAt({x:0,z:gateZ},.6);
          if(!reduced)stage.sparks.burst({x:0,y:.3,z:gateZ},80,{speed:2.4,up:1,colors:cardTrail(id),size:.09,life:.6,gravity:1});}
        const spread=ease(clamp((gateZ-ball.position.z)/.5))*.26;
        this.clone.visible=true;this.clone.position.set(ball.position.x+spread,ball.position.y,ball.position.z);this.clone.quaternion.copy(ball.quaternion);
        ball.position.x-=spread;stage.syncBallExtras();
      }
    }
    return 0;
  }
  /** Starts the card's effect once its ball has stopped. options: {amount, swap:{a:{name,score},b:{name,score}}, cue, reduced}. */
  start(id,options){
    const stage=this.stage,ball=stage.ball;
    this.effect={id,t:0,options,fired:new Set(),length:CARD_SHOW[id].length*(options.reduced?.7:1),p:ball.position.clone(),q:ball.quaternion.clone()};
    if(id==='swap-points')this.swap.start(options.swap);
  }
  get running(){return !!this.effect;}
  /** Camera wish for the running effect. */
  camera(side){
    const e=this.effect,z=e.p.z,push=clamp(e.t/e.length);
    if(e.id==='swap-points')return {pos:[side*.25,.95,z+2.7-push*.3],look:[0,.62,z],fov:48};
    if(e.id==='extra-shot')return {pos:[side*.55,.7+push*.2,z+2.1],look:[0,.5+push*.25,z-.1],fov:48};
    // Double Points is seen from the pin side, so the ×2 gate frames the two balls.
    if(e.id==='double-points')return {pos:[side*(.38-push*.1),.42,z-1.3+push*.15],look:[0,.42,z+.35],fov:54};
    return {pos:[side*(.72-push*.12),.66,z+1.95-push*.25],look:[0,.3,z-.15],fov:46};
  }
  /** Advances the effect. Returns {done, slow} where slow<1 asks the director for slow motion. */
  step(dt){
    const e=this.effect;if(!e)return {done:true,slow:1};
    const {stage,audio}=this,ball=stage.ball,{options,p}=e,reduced=!!options.reduced,trail=cardTrail(e.id);
    const fire=(key,at,fn)=>{if(e.t>=at&&!e.fired.has(key)){e.fired.add(key);fn();}};
    const label=(text,kind='card')=>options.cue?.('label',{label:text,kind,cardId:e.id});
    const burst=(at,count,opts)=>{if(!reduced)stage.sparks.burst(at,count,opts);};
    let slow=1;e.t+=dt;const t=e.t;
    if(e.id==='extra-shot'){
      fire('pop',0,()=>{audio.fx('pop');ball.visible=false;stage.syncBallExtras();stage.flashAt(p,.5);burst(p,90,{speed:3,up:1.5,colors:trail,size:.1,life:.7,gravity:3});
        this.minis.forEach(m=>{m.visible=true;m.position.copy(p);});});
      fire('label',.35,()=>{label(`+${EXTRA_SHOTS} SHOTS`);audio.fx('chime');stage.cheer(.7);audio.cheer(.5);stage.lightShow(.4);});
      const camera=stage.camera;
      this.minis.forEach((mini,i)=>{
        const start=.05+i*.28,u=clamp((t-start)/1.75);if(!mini.visible)return;
        const side=i?1:-1,apex=this.tmpV.set(p.x+side*.42,1.25,p.z).clone();
        const [cx,cy]=options.counter||[.6,.36]; // camera-space spot of the game's shot counter
        const target=new THREE.Vector3(cx-Math.sign(cx)*i*.14,cy,-1).applyQuaternion(camera.quaternion).add(camera.position);
        if(u<.45)mini.position.lerpVectors(p,apex,out(u/.45));else mini.position.lerpVectors(apex,target,ease((u-.45)/.55));
        mini.scale.setScalar(1+Math.sin(t*14+i)*.12);
        if(!reduced)stage.sparks.emit(mini.position.x,mini.position.y,mini.position.z,(Math.random()-.5)*.3,(Math.random()-.5)*.3,(Math.random()-.5)*.3,trail[i%2],.16,.5,0,1);
        if(u>=1){mini.visible=false;audio.fx('ding');options.cue?.('cardScore',{cardId:e.id,shots:1});burst(mini.position,24,{speed:1.2,up:.2,colors:trail,size:.07,life:.4,gravity:0});}
      });
      if(t>.6&&t<.95)slow=.45;
    }else if(e.id==='no-shot'){
      fire('bonk',0,()=>{audio.fx('bonk');audio.fx('gasp');burst({x:p.x,y:.2,z:p.z-.1},40,{speed:2.2,up:1,colors:[C('#ffffff'),C('#ff8aa3')],size:.08,life:.45,gravity:3});options.shake?.(.07);});
      fire('label',.4,()=>{label('NO SHOT');audio.aww();stage.cheer(.25);});
      fire('deflate',.55,()=>audio.fx('deflate'));
      fire('laugh',1.1,()=>audio.fx('laugh'));
      const bounce=clamp(t/.5),flat=Math.sin(clamp(t/.18)*Math.PI);
      this.sign.rotation.z=Math.sin(t*22)*.12*Math.exp(-t*3.2);
      if(t<.55){ball.position.set(p.x,p.y,p.z+out(bounce)*.34);ball.scale.set(1+flat*.25,1+flat*.2,1-flat*.45);}
      else{ // air rushes out: the ball spirals up and shrinks away
        const u=clamp((t-.55)/1.5),a=u*15;
        ball.position.set(p.x+Math.sin(a)*.3*(1-u*.4),p.y+u*1.25+Math.sin(a*2)*.05,p.z+.34+Math.cos(a)*.18);
        ball.scale.setScalar(Math.max(.001,1-out(u)*.97));ball.rotation.z+=dt*18;
        if(!reduced&&u<1)stage.sparks.emit(ball.position.x,ball.position.y,ball.position.z,(Math.random()-.5)*.6,-.3,(Math.random()-.5)*.6,C('#ffffff'),.06,.4,0,2);
        if(u>=1)ball.visible=false;
      }
      stage.syncBallExtras();
      if(t>2.5){this.sign.position.y+=dt*4;if(this.sign.position.y>3.4)this.sign.visible=false;}
      if(t>.02&&t<.22)slow=.4;
    }else if(e.id==='lose-points'){
      fire('teeter',0,()=>{audio.fx('wobble');audio.fx('gasp');});
      fire('fall',.55,()=>audio.fx('whistle_down'));
      fire('score',1.25,()=>{label(`−${options.amount??3}`,'lose');audio.fx('shatter');options.cue?.('cardScore',{cardId:e.id,delta:-(options.amount??3)});
        burst({x:0,y:.1,z:this.hole.position.z},80,{speed:3,up:2.6,colors:trail,size:.1,life:.8,gravity:5});audio.aww();stage.cheer(.2);options.shake?.(.05);});
      const holeZ=this.hole.position.z;
      if(t<.55){const u=t/.55;ball.position.set(p.x+Math.sin(t*26)*.012,p.y,p.z+(holeZ-p.z)*ease(u)*.82);ball.rotation.x-=dt*3;slow=.6;}
      else{const u=clamp((t-.55)/.6);ball.position.set(p.x,p.y-u*u*1.1,p.z+(holeZ-p.z)*(.82+.18*out(u)));ball.rotation.x-=dt*9;ball.scale.setScalar(1-u*.25);if(u>=1)ball.visible=false;}
      stage.syncBallExtras();
      if(t>2.5)this.hole.scale.setScalar(Math.max(.01,1-ease(clamp((t-2.5)/.6))));
      if(t>3.1)this.hole.visible=false;
    }else if(e.id==='double-points'){
      const hop=Math.abs(Math.sin(clamp(t/2.6)*Math.PI*3))*(1-clamp(t/2.8))*.55,lx=p.x,rx=this.clone.position.x;
      ball.position.set(lx,p.y+hop,p.z);this.clone.position.set(rx,p.y+hop,p.z);ball.rotation.y+=dt*9;this.clone.rotation.y-=dt*9;stage.syncBallExtras();
      fire('coins',.12,()=>{audio.fx('coins');this.coins.spawn(ball.position,34);this.coins.spawn(this.clone.position,34);
        burst(new THREE.Vector3(0,.3,p.z),90,{speed:3,up:3,colors:trail,size:.1,life:.9,gravity:4});});
      fire('label',.4,()=>{label('×2','double');options.cue?.('cardScore',{cardId:e.id,double:true});stage.cheer(1);audio.cheer(.9);stage.lightShow(.8);});
      fire('coins2',1.1,()=>{this.coins.spawn(new THREE.Vector3(0,.3,p.z),20);audio.fx('ding');});
      if(t>.1&&t<.4)slow=.45;
      if(t>2.6)this.gate.scale.setScalar(Math.max(.01,1-ease(clamp((t-2.6)/.5))));
    }else if(e.id==='swap-points'){
      fire('spin',0,()=>audio.fx('vortex'));
      const rise=out(clamp(t/.6)),centre=this.tmpV.set(p.x,p.y+rise*.52,p.z).clone();
      ball.position.copy(centre);ball.rotation.y+=dt*(8+t*6);stage.syncBallExtras();
      this.swap.update(t,centre,stage.camera);
      if(!reduced)for(let i=0;i<3;i++){const a=t*9+i*2.1,r=.6-((t*1.3+i*.3)%1)*.5;
        stage.sparks.emit(centre.x+Math.cos(a)*r,centre.y+Math.sin(a*1.3)*.2,centre.z+Math.sin(a)*r,-Math.sin(a)*1.5,.2,Math.cos(a)*1.5,trail[i%3],.07,.5,0,1.5);}
      fire('gasp',.9,()=>{audio.fx('gasp');stage.cheer(.5);});
      fire('swap',2.2,()=>{label('SWAP!','swap');audio.fx('chime');options.cue?.('cardScore',{cardId:e.id,swap:true});stage.flashAt(centre,.6);stage.lightShow(.6);audio.cheer(.6);
        burst(centre,110,{speed:3.2,up:1,colors:trail,size:.1,life:.8,gravity:1});});
      if(t>1.45&&t<1.75)slow=.4;
      if(t>3.3){ball.scale.setScalar(Math.max(.01,1-clamp((t-3.3)/.4)));}
    }
    if(reduced)slow=1;
    if(e.t>=e.length){this.effect=null;return {done:true,slow:1};}
    return {done:false,slow};
  }
}
