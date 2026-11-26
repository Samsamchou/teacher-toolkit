// Power-card pieces shared by the 3D games: the card that flies out and flips, coin showers and the score swap.
// Each game supplies its own card list ({name, symbol, color, dark}) and its own effects.
import * as THREE from 'three';

const FONT='"Comic Relief","Comic Sans MS",system-ui';
const ease=v=>v*v*(3-2*v),clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v)),out=v=>1-Math.pow(1-clamp(v),3);
const back=v=>{const c=1.7,x=clamp(v)-1;return 1+(c+1)*x*x*x+c*x*x;};
function canvas(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return [c,c.getContext('2d')];}
function texture(c){const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;}
function rounded(g,x,y,w,h,r){g.beginPath();g.roundRect(x,y,w,h,r);}
function glow(){
  const [c,g]=canvas(64,64),grad=g.createRadialGradient(32,32,0,32,32,32);
  grad.addColorStop(0,'rgba(255,255,255,1)');grad.addColorStop(.35,'rgba(255,255,255,.55)');grad.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=grad;g.fillRect(0,0,64,64);return texture(c);
}

export function cardFaceTexture(meta){
  const [c,g]=canvas(512,720);
  rounded(g,8,8,496,704,54);g.fillStyle='#fff';g.fill();
  rounded(g,26,26,460,668,40);g.fillStyle=meta.dark;g.fill();
  const grad=g.createLinearGradient(0,50,0,660);grad.addColorStop(0,meta.color);grad.addColorStop(1,meta.dark);
  rounded(g,44,44,424,632,30);g.fillStyle=grad;g.fill();
  g.fillStyle='rgba(255,255,255,.22)';g.beginPath();g.ellipse(256,70,300,120,0,0,7);g.fill();
  g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';
  g.font=`900 44px ${FONT}`;g.fillStyle='#fff';g.fillText('POWER UP',256,98);
  g.font=`900 ${meta.symbol.length>2?190:230}px ${FONT}`;g.lineWidth=34;g.strokeStyle=meta.dark;g.strokeText(meta.symbol,256,330,400);
  g.lineWidth=12;g.strokeStyle='#fff';g.strokeText(meta.symbol,256,330,400);g.fillStyle='#ffe21f';g.fillText(meta.symbol,256,330,400);
  rounded(g,64,520,384,112,26);g.fillStyle='#190a3a';g.fill();g.lineWidth=6;g.strokeStyle='#fff';g.stroke();
  g.font=`900 ${meta.name.length>11?46:54}px ${FONT}`;g.fillStyle='#fff';g.fillText(meta.name.toUpperCase(),256,578,360);
  return texture(c);
}
function cardBackTexture(){
  const [c,g]=canvas(512,720);
  rounded(g,8,8,496,704,54);g.fillStyle='#fff';g.fill();
  const grad=g.createLinearGradient(0,0,512,720);grad.addColorStop(0,'#ff3fd0');grad.addColorStop(1,'#5a1fb0');
  rounded(g,26,26,460,668,40);g.fillStyle=grad;g.fill();
  g.textAlign='center';g.textBaseline='middle';g.font=`900 330px ${FONT}`;g.lineJoin='round';
  g.lineWidth=30;g.strokeStyle='#2a0850';g.strokeText('?',256,370);g.fillStyle='#ffe21f';g.fillText('?',256,370);
  return texture(c);
}
/** A rounded sign with lines of text: lines=[[text,fontSize,y],...]. */
export function textPlate(lines,{w=512,h=224,fill='#190a3a',stroke='#fff',color='#fff'}={}){
  const [c,g]=canvas(w,h);rounded(g,6,6,w-12,h-12,36);g.fillStyle=fill;g.fill();g.lineWidth=10;g.strokeStyle=stroke;g.stroke();
  g.textAlign='center';g.textBaseline='middle';g.fillStyle=color;
  lines.forEach(([text,size,y])=>{g.font=`900 ${size}px ${FONT}`;g.fillText(text,w/2,y,w-40);});
  return texture(c);
}

export class CardReveal{
  /** options: {scene, camera, sparks, audio, meta(id), trail(id)→Color[], voice(id)→announcer text} */
  constructor(options){
    Object.assign(this,options);this.reveal=null;this.faces=new Map();
    const basic=map=>new THREE.MeshBasicMaterial({map,transparent:true,toneMapped:false,side:THREE.FrontSide});
    this.card=new THREE.Group(); // two faces back to back
    this.front=new THREE.Mesh(new THREE.PlaneGeometry(.46,.65),basic(null));
    this.back=new THREE.Mesh(new THREE.PlaneGeometry(.46,.65),basic(cardBackTexture()));this.back.rotation.y=Math.PI;
    this.halo=new THREE.Sprite(new THREE.SpriteMaterial({map:glow(),transparent:true,opacity:.55,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
    this.halo.scale.setScalar(1.5);this.halo.position.z=-.05;
    this.card.add(this.halo,this.front,this.back);this.card.visible=false;this.card.renderOrder=8;this.scene.add(this.card);
    this.tmpQ=new THREE.Quaternion();this.tmpV=new THREE.Vector3();
  }
  holdPoint(){ // a spot in front of the camera where the card is shown
    return this.tmpV.set(0,.04,-1.25).applyQuaternion(this.camera.quaternion).add(this.camera.position).clone();
  }
  /** The card flies out of `from`, flips and stops in front of the camera. Resolves when it has arrived. */
  show(id,{reduced=false,from}={}){
    const meta=this.meta(id);
    if(!this.faces.has(id))this.faces.set(id,cardFaceTexture(meta));
    this.front.material.map=this.faces.get(id);this.front.material.needsUpdate=true;this.halo.material.color.set(meta.color);
    this.card.visible=true;this.audio.fx('card_in');
    return new Promise(resolve=>{this.reveal={id,t:0,phase:'in',reduced,resolve,from:(from||this.holdPoint()).clone(),length:reduced?.3:1.15};});
  }
  /** Shrinks the card into `target` as u goes 0→1; calls done(id, reduced) once it has been absorbed. */
  absorb(u,target,done){
    const r=this.reveal;if(!r)return;
    if(r.phase!=='absorb'){r.phase='absorb';r.at=this.card.position.clone();}
    const k=ease(clamp(u/.7));
    this.card.position.lerpVectors(r.at,target,k);this.card.scale.setScalar(Math.max(.02,1-k*.95));this.card.rotateY(.5);
    if(u>=.7){this.card.visible=false;this.reveal=null;done?.(r.id,r.reduced);}
  }
  hide(){this.card.visible=false;this.reveal?.resolve?.();this.reveal=null;}
  update(dt){
    const r=this.reveal;if(!r||r.phase==='absorb')return;
    r.t+=dt;const camera=this.camera,hold=this.holdPoint(),trail=this.trail(r.id);
    if(r.phase==='in'){
      const u=clamp(r.t/r.length);
      if(r.reduced){this.card.position.copy(hold);this.card.quaternion.copy(camera.quaternion);this.card.scale.setScalar(.6+.4*u);}
      else{
        this.card.position.lerpVectors(r.from,hold,out(u));this.card.position.y+=Math.sin(u*Math.PI)*.35;
        this.card.scale.setScalar(.12+.88*back(u));
        this.card.quaternion.copy(camera.quaternion).multiply(this.tmpQ.setFromEuler(new THREE.Euler(0,(1-out(u))*Math.PI*5,(1-u)*.5)));
        const p=this.card.position;
        for(let i=0;i<4;i++)this.sparks.emit(p.x+(Math.random()-.5)*.3,p.y+(Math.random()-.5)*.4,p.z,(Math.random()-.5)*.8,Math.random()*.8,(Math.random()-.5)*.8,trail[i%trail.length],.07,.5,-.4,1);
      }
      if(u>=1){
        r.phase='hold';r.t=0;this.audio.fx('card_flip');this.audio.announce(this.voice(r.id),.15);
        if(!r.reduced)this.sparks.burst(hold,60,{speed:1.8,up:.3,colors:trail,size:.08,life:.6,gravity:0,drag:2});
        r.resolve();
      }
    }else{ // hold: gentle float while the teacher reads the card
      this.card.position.copy(hold);this.card.position.y+=r.reduced?0:Math.sin(r.t*2.4)*.018;
      this.card.quaternion.copy(camera.quaternion).multiply(this.tmpQ.setFromEuler(new THREE.Euler(0,r.reduced?0:Math.sin(r.t*1.7)*.16,0)));
      this.card.scale.setScalar(1);this.halo.material.opacity=.45+Math.sin(r.t*5)*.12;
    }
  }
}

/** Gold coins that fountain up and bounce on the floor. */
export class Coins{
  constructor(scene,count=90,floor=.02){
    this.floor=floor;
    this.mesh=new THREE.InstancedMesh(new THREE.CylinderGeometry(.035,.035,.008,14),new THREE.MeshStandardMaterial({color:'#ffcf2e',emissive:'#c98a00',emissiveIntensity:.6,metalness:.8,roughness:.25}),count);
    this.mesh.frustumCulled=false;this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(this.mesh);
    this.items=Array.from({length:count},()=>({life:0,p:new THREE.Vector3(),v:new THREE.Vector3(),r:new THREE.Euler(),w:new THREE.Vector3()}));
    this.zero=new THREE.Matrix4().makeScale(0,0,0);this.matrix=new THREE.Matrix4();this.quat=new THREE.Quaternion();this.one=new THREE.Vector3(1,1,1);
    this.items.forEach((_,i)=>this.mesh.setMatrixAt(i,this.zero));
  }
  spawn(origin,amount,power=1){
    let made=0;
    for(const item of this.items){
      if(item.life>0)continue;
      item.life=1.6+Math.random()*.9;item.p.copy(origin);const a=Math.random()*6.283,s=(.6+Math.random()*1.5)*power;
      item.v.set(Math.cos(a)*s,(3.2+Math.random()*2.6)*power,Math.sin(a)*s);item.r.set(Math.random()*6,Math.random()*6,0);item.w.set(Math.random()*16-8,Math.random()*16-8,0);
      if(++made>=amount)break;
    }
  }
  update(dt){
    let dirty=false;
    this.items.forEach((item,i)=>{
      if(item.life<=0)return;
      item.life-=dt;dirty=true;
      if(item.life<=0){this.mesh.setMatrixAt(i,this.zero);return;}
      item.v.y-=9.8*dt;item.p.addScaledVector(item.v,dt);
      if(item.p.y<this.floor){item.p.y=this.floor;item.v.y*=-.42;item.v.x*=.7;item.v.z*=.7;item.w.multiplyScalar(.6);}
      item.r.x+=item.w.x*dt;item.r.y+=item.w.y*dt;
      this.mesh.setMatrixAt(i,this.matrix.compose(item.p,this.quat.setFromEuler(item.r),this.one));
    });
    if(dirty)this.mesh.instanceMatrix.needsUpdate=true;
  }
  clear(){this.items.forEach((item,i)=>{item.life=0;this.mesh.setMatrixAt(i,this.zero);});this.mesh.instanceMatrix.needsUpdate=true;}
}

/** Swap Points: a spinning vortex with two team score plates that swing round it and trade sides. */
export class ScoreSwap{
  constructor(scene){
    const glowing=color=>new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:1.6,roughness:.3});
    this.rings=[['#a865ea',.5],['#27e0ff',.34],['#ff3fd0',.2]].map(([color,r])=>{
      const m=new THREE.Mesh(new THREE.TorusGeometry(r,.022,10,48),glowing(color));m.visible=false;scene.add(m);return m;});
    this.plates=[0,1].map(()=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(.8,.35),new THREE.MeshBasicMaterial({transparent:true,toneMapped:false,side:THREE.DoubleSide}));
      m.visible=false;m.renderOrder=7;scene.add(m);return m;});
  }
  /** teams: {a:{name,score}, b:{name,score}} — a starts on the left. */
  start(teams){
    const {a,b}=teams||{a:{name:'TEAM 1',score:10},b:{name:'TEAM 2',score:0}};
    [a,b].forEach((team,i)=>{this.plates[i].material.map?.dispose();
      this.plates[i].material.map=textPlate([[String(team.name).toUpperCase().slice(0,14),58,70],[String(team.score),104,152]],{fill:i?'#0d5f8f':'#8f1a55',color:'#fff'});
      this.plates[i].material.needsUpdate=true;});
    this.rings.forEach(ring=>{ring.visible=true;});
  }
  /** t: seconds since start(). The plates cross between 0.95 s and 2.2 s; everything fades out after 3 s. */
  update(t,centre,camera,size=1){
    const fade=t>3?1-clamp((t-3)/.5):back(clamp(t/.5));
    this.rings.forEach((ring,i)=>{ring.position.copy(centre);ring.rotation.set(Math.PI/2+Math.sin(t*2+i)*.5,t*(3+i*1.4),t*(2-i));ring.scale.setScalar(Math.max(.01,fade*size));});
    const angle=ease(clamp((t-.95)/1.25))*Math.PI;
    this.plates.forEach((plate,i)=>{
      const side=i?1:-1,pop=back(clamp((t-.25-i*.12)/.4)),leave=t>3.2?1-clamp((t-3.2)/.4):1;
      plate.visible=t>.25+i*.12&&leave>0;
      plate.position.set(centre.x+Math.cos(angle)*side*.95*size,centre.y+(.25+Math.sin(angle)*side*.28)*size,centre.z+Math.sin(angle)*side*.5*size);
      plate.quaternion.copy(camera.quaternion);plate.scale.setScalar(Math.max(.01,pop*leave*size));
    });
  }
  hide(){for(const m of [...this.rings,...this.plates])m.visible=false;}
}
