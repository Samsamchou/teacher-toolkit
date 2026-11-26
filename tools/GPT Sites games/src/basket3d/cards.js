// Power cards for 3D basketball. The card reveal, coins and score swap are shared with bowling
// (game3d/card-kit.js); the effects here belong to the court. Rules stay in basketball-model.mjs.
import * as THREE from 'three';
import {CardReveal,Coins,ScoreSwap,textPlate} from '../game3d/card-kit.js';
import {HOOP} from './shots.mjs';
import {CARD_META,RULES} from '../basketball-model.mjs';

const C=hex=>new THREE.Color(hex);
const ease=v=>v*v*(3-2*v),clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v)),out=v=>1-Math.pow(1-clamp(v),3);
const back=v=>{const c=1.7,x=clamp(v)-1;return 1+(c+1)*x*x*x+c*x*x;};
export const EXTRA_SHOTS=RULES.extraShots,STEAL_POINTS=RULES.stealPoints;

// How each card is presented. Names, symbols and colours come from the rules (CARD_META);
// length is the effect time for cards that are not a shot.
const SHOW={
  'extra-shot':{voice:'Extra shot',length:4.1,trail:['#7fd4ff','#30a9e8','#ffffff']},
  'double-points':{voice:'Double points',length:4.2,trail:['#fff1a8','#f7b42e','#ffffff']},
  'swap-points':{voice:'Swap points',length:4.2,trail:['#d7a8ff','#a865ea','#27e0ff']},
  'slam-dunk':{voice:'Slam dunk',trail:['#ffe14a','#ff7a1a','#ff2a2a']},
  'steal':{voice:'Steal',length:4.1,trail:['#9ff5e9','#22b8a7','#ffffff']},
  'hit-or-miss':{voice:'Hit or miss',trail:['#19ff6a','#ff3355','#ffffff']},
};
export const BASKET_CARDS=Object.fromEntries(Object.entries(CARD_META).map(([id,meta])=>[id,{...meta,...SHOW[id]}]));
export const CARD_IDS=Object.keys(BASKET_CARDS);
export const cardTrail=id=>(BASKET_CARDS[id]?.trail||['#ffffff']).map(C);

export class BasketCards{
  constructor(stage,audio){
    this.stage=stage;this.audio=audio;this.effect=null;const scene=stage.scene;
    this.kit=new CardReveal({scene,camera:stage.camera,sparks:stage.sparks,audio,meta:id=>BASKET_CARDS[id],trail:cardTrail,voice:id=>BASKET_CARDS[id].voice});
    this.coins=new Coins(scene);this.swap=new ScoreSwap(scene);
    this.minis=[0,1].map(()=>{const m=new THREE.Mesh(stage.ball.geometry,new THREE.MeshStandardMaterial({map:stage.ballMaterial.map,emissive:'#4cc3ff',emissiveIntensity:.9,roughness:.6}));
      m.visible=false;scene.add(m);return m;});
    this.plates=[0,1].map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(1.9,.83),new THREE.MeshBasicMaterial({transparent:true,toneMapped:false,side:THREE.DoubleSide}));
      m.visible=false;m.renderOrder=7;scene.add(m);return m;});
    this.loot=new THREE.Mesh(new THREE.SphereGeometry(.16,20,14),new THREE.MeshStandardMaterial({color:'#ffe21f',emissive:'#ffb21f',emissiveIntensity:1.5,roughness:.3}));
    this.loot.visible=false;scene.add(this.loot);
  }
  get reveal(){return this.kit.reveal;}
  get running(){return !!this.effect;}
  /** Card flies out of the ball in the animal's hands, flips and stops in front of the camera. */
  show(id,options={}){this.hideProps();return this.kit.show(id,{...options,from:this.stage.ball.position});}
  /** The card shrinks back into the ball, which starts to glow in the card's colour. */
  absorb(u){
    const stage=this.stage;
    this.kit.absorb(u,stage.ball.position,(id,reduced)=>{
      stage.setAura(BASKET_CARDS[id].color,.8);this.audio.fx('sparkle');
      if(!reduced)stage.sparks.burst(stage.ball.position,70,{speed:2.6,up:1.2,colors:cardTrail(id),size:.1,life:.7,gravity:2});
    });
  }
  setPlate(index,team,fill){
    const plate=this.plates[index];plate.material.map?.dispose();
    plate.material.map=textPlate([[String(team.name).toUpperCase().slice(0,14),58,70],[String(team.score),104,152]],{fill,color:'#fff'});plate.material.needsUpdate=true;
  }
  hideProps(){
    for(const m of [...this.minis,...this.plates,this.loot])m.visible=false;
    this.coins.clear();this.swap.hide();this.stage.goldHoop(0);this.effect=null;
  }
  reset(){this.hideProps();this.kit.hide();this.stage.setAura(null,0);}
  update(dt){this.coins.update(dt);this.kit.update(dt);}
  /** Starts an effect card. options: {swap:{a,b}, steal:{mine,theirs,amount}, counter:[x,y], cue, reduced, shake}. */
  start(id,options){
    const stage=this.stage;
    this.effect={id,t:0,options,fired:new Set(),length:BASKET_CARDS[id].length*(options.reduced?.7:1),hands:stage.ball.position.clone(),px:stage.player.position.x};
    if(id==='swap-points')this.swap.start(options.swap);
    if(id==='steal'){const s=options.steal||{mine:{name:'Team 1',score:5},theirs:{name:'Team 2',score:9},amount:2};this.setPlate(0,s.mine,'#0b5f57');this.setPlate(1,s.theirs,'#8f1a55');}
  }
  /** Camera wish for the running effect. */
  camera(){
    const e=this.effect,px=e.px,push=clamp(e.t/e.length);
    if(e.id==='double-points')return {pos:[2.5-push*.3,2.75,3.9-push*.4],look:[0,3.2,0],fov:44};
    if(e.id==='swap-points')return {pos:[3.2,2.7,8.4-push*.5],look:[3.2,2.5,0],fov:46};
    if(e.id==='steal')return {pos:[px/2+.9,2.9,8.2-push*.4],look:[px/2+.9,2.7,0],fov:46};
    return {pos:[px-.2,2+push*.3,5.6],look:[px-.5,1.9+push*.4,0],fov:46};
  }
  /** Advances the effect. Returns {done, slow}. */
  step(dt){
    const e=this.effect;if(!e)return {done:true,slow:1};
    const {stage,audio}=this,{options}=e,reduced=!!options.reduced,trail=cardTrail(e.id),camera=stage.camera;
    const fire=(key,at,fn)=>{if(e.t>=at&&!e.fired.has(key)){e.fired.add(key);fn();}};
    const label=(text,kind='card')=>options.cue?.('label',{label:text,kind,cardId:e.id});
    const burst=(at,count,opts)=>{if(!reduced)stage.sparks.burst(at,count,opts);};
    let slow=1;e.t+=dt;const t=e.t;
    if(e.id==='extra-shot'){
      // Two glowing balls drop from above, bounce up to the animal's hands, then fly to the shot counter.
      const [cx,cy]=options.counter||[.6,.36];
      this.minis.forEach((mini,i)=>{
        const s=t-.1-i*.3,side=i?1:-1,land=new THREE.Vector3(e.px-.9-i*.35,HOOP.ballR,side*.45),hand=new THREE.Vector3(e.hands.x-.1,1.75+i*.3,side*.28);
        if(s<0){mini.visible=false;return;}
        mini.visible=s<3.2;mini.rotation.z+=dt*8;
        if(s<.5){mini.position.set(land.x,7-(7-land.y)*(s/.5)**2,land.z);}
        else if(s<1.05){const u=(s-.5)/.55;mini.position.lerpVectors(land,hand,out(u));mini.position.y+=Math.sin(u*Math.PI)*.5;if(!e.fired.has('bounce'+i)){e.fired.add('bounce'+i);audio.bounce(1,land.x*.1);burst(land,18,{speed:1.4,up:.4,colors:trail,size:.06,life:.35,gravity:2});}}
        else if(s<2.1){mini.position.copy(hand);mini.position.y+=Math.sin(s*7)*.05;}
        else{const u=clamp((s-2.1)/.9),target=new THREE.Vector3(cx-Math.sign(cx)*i*.14,cy,-1).applyQuaternion(camera.quaternion).add(camera.position);
          mini.position.lerpVectors(hand,target,ease(u));
          if(u>=1&&!e.fired.has('got'+i)){e.fired.add('got'+i);mini.visible=false;audio.fx('ding');options.cue?.('cardScore',{cardId:e.id,shots:1});}}
        if(!reduced&&mini.visible)stage.sparks.emit(mini.position.x,mini.position.y,mini.position.z,(Math.random()-.5)*.3,(Math.random()-.5)*.3,(Math.random()-.5)*.3,trail[i%2],.12,.4,0,1);
      });
      fire('label',1.15,()=>{label(`+${EXTRA_SHOTS} SHOTS`);audio.fx('chime');stage.cheer(.7);audio.cheer(.5);stage.lightShow(.4);stage.setPose(2);});
    }else if(e.id==='double-points'){
      stage.goldHoop(t>3.5?1-clamp((t-3.5)/.5):back(clamp(t/.5)));
      const rim=new THREE.Vector3(0,HOOP.rimY+.15,0);
      fire('gold',0,()=>{audio.fx('chime');stage.flashAt({x:0,y:3.2,z:0},.6);burst(rim,80,{speed:2.4,up:1,colors:trail,size:.1,life:.6,gravity:1});});
      fire('coins',.5,()=>{audio.fx('coins');this.coins.spawn(rim,46,1.05);burst(rim,90,{speed:3,up:3,colors:trail,size:.1,life:.9,gravity:4});});
      fire('label',.75,()=>{label('×2','double');options.cue?.('cardScore',{cardId:e.id,double:true});stage.cheer(1);audio.cheer(.9);stage.lightShow(.8);stage.setPose(2);});
      fire('coins2',1.5,()=>{this.coins.spawn(rim,26);audio.fx('ding');});
      if(t>.45&&t<.75)slow=.45;
    }else if(e.id==='swap-points'){
      fire('spin',0,()=>audio.fx('vortex'));
      const centre=new THREE.Vector3(3.2,2.5,0);this.swap.update(t,centre,camera,2.4);
      if(!reduced)for(let i=0;i<3;i++){const a=t*9+i*2.1,r=(.6-((t*1.3+i*.3)%1)*.5)*2.4;
        stage.sparks.emit(centre.x+Math.cos(a)*r,centre.y+Math.sin(a*1.3)*.4,centre.z+Math.sin(a)*r*.5,-Math.sin(a)*2.5,.2,Math.cos(a)*1.5,trail[i%3],.14,.5,0,1.5);}
      fire('gasp',.9,()=>{audio.fx('gasp');stage.cheer(.5);});
      fire('swap',2.2,()=>{label('SWAP!','swap');audio.fx('chime');options.cue?.('cardScore',{cardId:e.id,swap:true});stage.flashAt({x:3.2,y:2.5,z:0},.6);stage.lightShow(.6);audio.cheer(.6);
        burst(centre,110,{speed:4,up:1,colors:trail,size:.14,life:.8,gravity:1});stage.setPose(2);});
      if(t>1.45&&t<1.75)slow=.4;
    }else if(e.id==='steal'){
      const s=options.steal||{mine:{name:'Team 1',score:5},theirs:{name:'Team 2',score:9},amount:2};
      const mine=new THREE.Vector3(e.px-.2,3.55,0),theirs=new THREE.Vector3(Math.min(1.4,e.px-3.4),3.75,0),leave=t>3.5?1-clamp((t-3.5)/.5):1;
      this.plates.forEach((plate,i)=>{
        const pop=back(clamp((t-.1-i*.15)/.4))*leave,at=i?theirs:mine;
        plate.visible=t>.1+i*.15&&pop>.01;plate.position.copy(at);plate.quaternion.copy(camera.quaternion);plate.scale.setScalar(Math.max(.01,pop));
        if(i===1&&t>1.75&&t<2.3)plate.position.x+=Math.sin(t*60)*.06*(1-(t-1.75)/.55); // the robbed plate shakes
      });
      if(s.amount>0){
        fire('sneak',.7,()=>{audio.fx('pop');this.loot.visible=true;});
        if(t>.7&&t<1.75){const u=(t-.7)/1.05;this.loot.position.lerpVectors(theirs,mine,ease(u));this.loot.position.y+=Math.sin(u*Math.PI)*.9+Math.sin(u*26)*.05;this.loot.scale.setScalar(1+Math.sin(t*20)*.12);
          if(!reduced)stage.sparks.emit(this.loot.position.x,this.loot.position.y,this.loot.position.z,0,.2,0,trail[0],.14,.45,0,1);slow=u>.35&&u<.6?.45:1;}
        fire('got',1.75,()=>{this.loot.visible=false;this.setPlate(0,{...s.mine,score:s.mine.score+s.amount},'#0b5f57');this.setPlate(1,{...s.theirs,score:s.theirs.score-s.amount},'#8f1a55');
          label(`+${s.amount}`,'card');audio.fx('ding');audio.fx('laugh');options.cue?.('cardScore',{cardId:e.id,steal:s.amount});stage.cheer(.8);audio.cheer(.6);stage.lightShow(.5);stage.setPose(2);
          burst(mine,90,{speed:3,up:1,colors:trail,size:.12,life:.7,gravity:2});options.shake?.(.05);});
      }else fire('none',.9,()=>{label('NOTHING TO STEAL','miss');audio.aww();stage.setPose(3);options.cue?.('cardScore',{cardId:e.id,steal:0});});
    }
    if(reduced)slow=1;
    if(e.t>=e.length){this.effect=null;this.hideProps();return {done:true,slow:1};}
    return {done:false,slow};
  }
}
