// Three.js scene for the 3D bowling lane: geometry, lights, crowd and effects. Playback is driven by director.js.
import * as THREE from 'three';
import {Stage3D} from '../game3d/stage3d.js';
import {LANE,BALL_RADIUS,PIN_HEIGHT,PIN_PROFILE,pinWorldPosition} from './physics.mjs';
import {BALL_SKINS,CARD_META} from '../bowling-model.mjs';
import {zoneCenter} from '../bowling-motion.mjs';
import {laneX} from './physics.mjs';
import {laneTexture,pinTexture,ballTexture,signTexture,backdropTexture,stripTexture,glowTexture,LANE_NEAR,LANE_FAR,LANE_SPAN} from './textures.js';
import {Sparks,Confetti,Shockwaves} from './fx.js';
import {Crowd} from '../game3d/crowd.js';

export const STAGE_THEMES={
  Classic:{skyTop:'#2a0a5c',skyBottom:'#7a14c9',floor:'#2b0b52',neonA:'#ff3fd0',neonB:'#27e0ff',signTop:'#ff4fd8',signBottom:'#7d1fe0',signText:'#ffe21f',fog:'#3a0d70'},
  Spring:{skyTop:'#0f6b4a',skyBottom:'#7fd66a',floor:'#12402f',neonA:'#ff8ad1',neonB:'#fff36b',signTop:'#ff8ad1',signBottom:'#2fae6b',signText:'#fffbe0',fog:'#1c6b46'},
  Summer:{skyTop:'#0b4fb0',skyBottom:'#34c6f4',floor:'#0b2f66',neonA:'#ffd23f',neonB:'#ff6b3d',signTop:'#ffb52e',signBottom:'#0d7fd6',signText:'#fff',fog:'#0f5fb8'},
  Fall:{skyTop:'#5a1c08',skyBottom:'#e2761b',floor:'#3a1508',neonA:'#ffcf3f',neonB:'#ff5a2a',signTop:'#f29a1f',signBottom:'#8c2a0c',signText:'#fff3c4',fog:'#7a2a0c'},
  Winter:{skyTop:'#0c2a5e',skyBottom:'#7fc4f2',floor:'#0e2347',neonA:'#bff3ff',neonB:'#8f8cff',signTop:'#8fd8ff',signBottom:'#274fb5',signText:'#fff',fog:'#1b3f86'},
};
const HALF=LANE.width/2,OUTER=HALF+LANE.gutter;
const RACK_CENTER=new THREE.Vector3(0,.2,-LANE.length-.4);

function pinGeometry(){
  const curve=new THREE.SplineCurve([new THREE.Vector2(.001,0),...PIN_PROFILE.map(([h,r])=>new THREE.Vector2(r,h))]);
  const geometry=new THREE.LatheGeometry(curve.getPoints(40),28);
  const position=geometry.attributes.position,uv=geometry.attributes.uv;
  for(let i=0;i<uv.count;i++)uv.setY(i,position.getY(i)/PIN_HEIGHT);
  geometry.computeVertexNormals();return geometry;
}

export class BowlingStage extends Stage3D{
  constructor(canvas,{theme='Classic',quality='high'}={}){
    const colors=STAGE_THEMES[theme]||STAGE_THEMES.Classic;
    super(canvas,{quality,fog:colors.fog});
    this.theme=colors;this.excitement=0;this.show=0;this.flash=0;this.charge=0;this.ballTextures=new Map();
    this.buildLane();this.buildRoom();this.buildCrowd();this.buildLights();this.buildActors();
    this.sparks=new Sparks(this.scene);this.confetti=new Confetti(this.scene,quality==='high'?420:160);this.shockwaves=new Shockwaves(this.scene);
    this.addGlow();
  }
  buildLane(){
    const laneMap=laneTexture(),midZ=(LANE_NEAR+LANE_FAR)/2;
    const lane=new THREE.PlaneGeometry(LANE.width,LANE_SPAN);lane.rotateX(-Math.PI/2);
    this.mesh(lane,new THREE.MeshPhysicalMaterial({map:laneMap,roughness:.28,clearcoat:1,clearcoatRoughness:.06,envMapIntensity:1.3}),0,0,midZ,true);
    const dark=new THREE.MeshStandardMaterial({color:'#1b1030',roughness:.35,metalness:.5});
    const rail=new THREE.MeshStandardMaterial({color:'#2a1450',roughness:.4,metalness:.3});
    this.strip=stripTexture(this.theme);this.strip.repeat.set(14,1);
    const neon=new THREE.MeshBasicMaterial({map:this.strip,toneMapped:false});
    for(const side of [-1,1]){
      this.mesh(new THREE.BoxGeometry(LANE.gutter,.04,LANE_SPAN),dark,side*(HALF+LANE.gutter/2),-LANE.gutterDepth-.02,midZ,true);
      this.mesh(new THREE.BoxGeometry(.012,LANE.gutterDepth+.02,LANE_SPAN),dark,side*(HALF+.006),-LANE.gutterDepth/2-.01,midZ);
      this.mesh(new THREE.BoxGeometry(.1,.2,LANE_SPAN),rail,side*(OUTER+.05),.02,midZ,true);
      const stripMesh=this.mesh(new THREE.BoxGeometry(.05,.03,LANE_SPAN),neon,side*(OUTER+.05),.135,midZ);
      // UVs run along the long axis so the dashes chase toward the pins.
      const uv=stripMesh.geometry.attributes.uv,pos=stripMesh.geometry.attributes.position;
      for(let i=0;i<uv.count;i++)uv.setXY(i,(pos.getZ(i)/LANE_SPAN+.5),.5);
      const kickStart=-LANE.length+.3,kickZ=(kickStart+LANE_FAR-LANE.pitLength)/2,kickLen=kickStart-(LANE_FAR-LANE.pitLength);
      this.mesh(new THREE.BoxGeometry(.1,.6,kickLen),rail,side*(OUTER+.05),.2,kickZ,true);
    }
    const pitMaterial=new THREE.MeshStandardMaterial({color:'#07030f',roughness:1});
    this.mesh(new THREE.BoxGeometry(OUTER*2,.04,LANE.pitLength),pitMaterial,0,-LANE.pitDepth-.02,LANE_FAR-LANE.pitLength/2);
    this.mesh(new THREE.BoxGeometry(OUTER*2+.2,1.4,.06),pitMaterial,0,.3,LANE_FAR-LANE.pitLength-.03);
    this.mesh(new THREE.BoxGeometry(OUTER*2,LANE.pitDepth,.04),dark,0,-LANE.pitDepth/2-.001,LANE_FAR-.02);
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(OUTER*2+.2,.92),new THREE.MeshBasicMaterial({map:signTexture(this.theme),toneMapped:false}));
    sign.position.set(0,.62+.46,LANE_FAR-.12);this.scene.add(sign);this.sign=sign;
  }
  buildRoom(){
    const floor=new THREE.PlaneGeometry(40,40);floor.rotateX(-Math.PI/2);
    this.mesh(floor,new THREE.MeshStandardMaterial({color:this.theme.floor,roughness:.3,metalness:.25}),0,-.1,-6,true);
    const backdrop=backdropTexture(this.theme);backdrop.repeat.set(3,1.2);
    const wall=new THREE.MeshBasicMaterial({map:backdrop,toneMapped:false,color:'#b9a6d9',fog:true});
    this.mesh(new THREE.PlaneGeometry(40,12),wall,0,5.4,-15.5);
    for(const side of [-1,1]){const plane=this.mesh(new THREE.PlaneGeometry(26,12),wall,side*9,5.4,-5);plane.rotation.y=-side*Math.PI/2;}
    this.backdrop=backdrop;
    // Sweeping light beams, only visible during celebrations.
    this.beams=[];
    const beamMaterial=()=>new THREE.MeshBasicMaterial({color:'#fff',transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,fog:false});
    for(let i=0;i<6;i++){
      const geometry=new THREE.ConeGeometry(.75,7,20,1,true);geometry.translate(0,-3.5,0);
      const beam=new THREE.Mesh(geometry,beamMaterial());beam.position.set((i%2?-1:1)*(1.2+(i>>1)*.9),6.6,-LANE.length+1.5-(i>>1)*1.2);
      beam.material.color.set(i%2?this.theme.neonA:this.theme.neonB);beam.renderOrder=4;this.scene.add(beam);this.beams.push(beam);
    }
  }
  buildCrowd(){
    const seats=[];
    for(const side of [-1,1])for(let row=0;row<3;row++){
      const x=side*(1.55+row*.46),y=.06+row*.26;
      this.mesh(new THREE.BoxGeometry(.46,.26+row*.26,10.4),new THREE.MeshStandardMaterial({color:row%2?'#3a1670':'#2c0f58',roughness:.8}),x,(.26+row*.26)/2-.2,-5.4,true);
      for(let z=-.5;z>-10.4;z-=.47)seats.push({x,y:y+.2,z:z-(row%2)*.2,yaw:Math.atan2(-side*.75,1)});
    }
    this.crowd=new Crowd(this.scene,seats);
  }
  buildLights(){
    this.scene.add(new THREE.HemisphereLight('#ffffff','#5a2a9a',.5));
    const key=this.key=new THREE.DirectionalLight('#fff4e0',1.5);
    key.position.set(1.6,5.5,-LANE.length+3.2);key.target.position.copy(RACK_CENTER);
    key.castShadow=this.quality==='high';key.shadow.mapSize.set(2048,2048);
    Object.assign(key.shadow.camera,{left:-1.7,right:1.7,top:2.4,bottom:-2.6,near:.5,far:14});key.shadow.bias=-.0004;key.shadow.normalBias=.012;
    this.scene.add(key,key.target);
    const fill=new THREE.DirectionalLight('#c9b8ff',.55);fill.position.set(-2,4,2);this.scene.add(fill);
    this.showLights=[new THREE.PointLight(this.theme.neonA,0,9,1.6),new THREE.PointLight(this.theme.neonB,0,9,1.6)];
    this.showLights[0].position.set(-1.1,1.6,-LANE.length+.2);this.showLights[1].position.set(1.1,1.6,-LANE.length-.8);
    this.flashLight=new THREE.PointLight('#fff',0,7,1.4);this.flashLight.position.set(0,.6,-LANE.length+.2);
    this.scene.add(...this.showLights,this.flashLight);
  }
  buildActors(){
    this.ballMaterial=new THREE.MeshPhysicalMaterial({roughness:.16,clearcoat:1,clearcoatRoughness:.05,envMapIntensity:1.25,emissive:'#ffffff',emissiveIntensity:0});
    this.ball=new THREE.Mesh(new THREE.SphereGeometry(BALL_RADIUS,48,32),this.ballMaterial);this.ball.castShadow=true;this.scene.add(this.ball);
    this.glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture(),color:'#fff',transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
    this.glow.scale.setScalar(.9);this.scene.add(this.glow);
    const blob=new THREE.PlaneGeometry(.34,.34);blob.rotateX(-Math.PI/2);
    this.ballShadow=this.mesh(blob,new THREE.MeshBasicMaterial({map:glowTexture(),color:'#000',transparent:true,opacity:.45,depthWrite:false}),0,.004,0);
    const geometry=pinGeometry(),material=new THREE.MeshPhysicalMaterial({map:pinTexture(),roughness:.2,clearcoat:1,clearcoatRoughness:.08,envMapIntensity:1.1});
    this.pins=Array.from({length:10},(_,id)=>{
      const pin=new THREE.Mesh(geometry,material);pin.castShadow=true;pin.receiveShadow=true;this.scene.add(pin);return pin;
    });
    // Aim zones painted on the lane and the floating +1 power-up token (used by the real game, hidden in the pilot).
    this.zoneCanvas=document.createElement('canvas');this.zoneCanvas.width=640;this.zoneCanvas.height=256;
    this.zoneTexture=new THREE.CanvasTexture(this.zoneCanvas);this.zoneTexture.colorSpace=THREE.SRGBColorSpace;
    const zonePlane=new THREE.PlaneGeometry(1,.95);zonePlane.rotateX(-Math.PI/2);
    this.zoneMesh=this.mesh(zonePlane,new THREE.MeshBasicMaterial({map:this.zoneTexture,transparent:true,toneMapped:false,depthWrite:false}),0,.006,-1.55);this.zoneMesh.visible=false;
    const tokenCanvas=document.createElement('canvas');tokenCanvas.width=tokenCanvas.height=160;
    const g=tokenCanvas.getContext('2d');g.fillStyle='#17083b';g.beginPath();g.arc(80,80,70,0,7);g.fill();g.lineWidth=12;g.strokeStyle='#ffdb42';g.stroke();
    g.fillStyle='#fff';g.font='900 78px "Comic Relief",system-ui';g.textAlign='center';g.textBaseline='middle';g.fillText('+1',80,86);
    const tokenTexture=new THREE.CanvasTexture(tokenCanvas);tokenTexture.colorSpace=THREE.SRGBColorSpace;
    this.token=new THREE.Sprite(new THREE.SpriteMaterial({map:tokenTexture,transparent:true,toneMapped:false}));this.token.scale.setScalar(.3);this.token.visible=false;this.scene.add(this.token);
    this.setBall(9);this.resetRack([0,1,2,3,4,5,6,7,8,9]);
  }
  setBall(skin,cardId=null){
    const key=cardId||`skin-${skin}`;
    if(!this.ballTextures.has(key)){
      const meta=cardId?CARD_META[cardId]:null;
      this.ballTextures.set(key,ballTexture(meta?[meta.name,meta.dark,meta.color,'card',meta.symbol]:BALL_SKINS[skin]||BALL_SKINS[0]));
    }
    this.ballMaterial.map=this.ballMaterial.emissiveMap=this.ballTextures.get(key);this.ballMaterial.needsUpdate=true;
  }
  resetRack(remaining,startX=0){
    this.pins.forEach((pin,id)=>{
      pin.visible=remaining.includes(id);const p=pinWorldPosition(id);pin.position.set(p.x,0,p.z);pin.quaternion.identity();
    });
    this.ball.position.set(startX,BALL_RADIUS,0);this.ball.quaternion.identity();this.ball.visible=true;this.syncBallExtras();
  }
  /** Shows one recorded frame, blended with the next one. Frame layout: ball then pins, 7 floats each. */
  applyFrame(a,b,alpha,order){
    const read=(target,offset)=>{
      target.position.set(a[offset]+(b[offset]-a[offset])*alpha,a[offset+1]+(b[offset+1]-a[offset+1])*alpha,a[offset+2]+(b[offset+2]-a[offset+2])*alpha);
      this.qa.set(a[offset+3],a[offset+4],a[offset+5],a[offset+6]);this.qb.set(b[offset+3],b[offset+4],b[offset+5],b[offset+6]);
      target.quaternion.slerpQuaternions(this.qa,this.qb,alpha);
    };
    this.qa??=new THREE.Quaternion();this.qb??=new THREE.Quaternion();
    read(this.ball,0);order.forEach((id,i)=>read(this.pins[id],7*(i+1)));
    this.syncBallExtras();
  }
  syncBallExtras(){
    const p=this.ball.position;this.glow.position.copy(p);
    const onLane=p.y>-.02;this.ballShadow.visible=onLane&&this.ball.visible;this.ballShadow.position.set(p.x,.004,p.z);
  }
  /** Draws the numbered aim zones on the lane (count 0 hides them) and places the +1 token over tokenZone. */
  setZones(count=0,selected=0,tokenZone=null){
    this.zoneMesh.visible=count>0;this.token.visible=count>0&&!!tokenZone;
    if(!count)return;
    const g=this.zoneCanvas.getContext('2d'),W=640,H=256,colors=['#f03596','#29b7e5','#ffe33d','#e11b71','#873fea'],cell=W/count;
    g.clearRect(0,0,W,H);g.textAlign='center';g.textBaseline='middle';g.font='900 150px "Comic Relief",system-ui';g.lineJoin='round';
    for(let i=0;i<count;i++){
      const on=selected===i+1;
      g.globalAlpha=on?1:.62;g.fillStyle=colors[i%5];g.beginPath();g.roundRect(i*cell+5,8,cell-10,H-16,22);g.fill();
      g.globalAlpha=1;g.lineWidth=on?14:5;g.strokeStyle=on?'#ffffff':'rgba(255,255,255,.6)';g.stroke();
      g.lineWidth=16;g.strokeStyle='#3a1248';g.strokeText(String(i+1),(i+.5)*cell,H/2+8,cell-24);g.fillStyle=i%5===2?'#583872':'#fff';g.fillText(String(i+1),(i+.5)*cell,H/2+8,cell-24);
    }
    this.zoneTexture.needsUpdate=true;
    const left=laneX(zoneCenter(.5,count)),right=laneX(zoneCenter(count+.5,count));
    this.zoneMesh.scale.x=right-left;this.zoneMesh.position.x=(left+right)/2;
    if(tokenZone)this.token.position.set(laneX(zoneCenter(tokenZone,count)),.34,-3.3);
  }
  /** Coloured halo and tint on the ball (power cards). level 0 removes it. */
  setAura(color,level=1){this.aura=level;if(level>0){this.glow.material.color.set(color);this.ballMaterial.emissive.set(color);}else{this.glow.material.color.set('#fff');this.ballMaterial.emissive.set('#fff');}}
  cheer(level){this.excitement=Math.max(this.excitement,level);}
  lightShow(level){this.show=Math.max(this.show,level);}
  flashAt(position,strength=1){this.flash=strength;this.flashLight.position.set(position.x,.7,position.z);}
  update(dt){
    this.time+=dt;
    this.excitement=Math.max(0,this.excitement-dt*.28);this.show=Math.max(0,this.show-dt*.3);this.flash=Math.max(0,this.flash-dt*3.2);
    this.strip.offset.x-=dt*(.25+this.show*1.6);
    const aura=this.aura||0;
    this.ballMaterial.emissiveIntensity=Math.max(this.charge*.35,aura*.5);this.glow.material.opacity=Math.max(this.charge*.38,aura*.6);this.glow.scale.setScalar(.4+Math.max(this.charge*.45,aura*.5));
    this.flashLight.intensity=this.flash*5;
    this.showLights.forEach((light,i)=>{light.intensity=this.show*(3.5+2.5*Math.sin(this.time*9+i*2.4));});
    this.beams.forEach((beam,i)=>{
      beam.material.opacity=this.show*.2;beam.visible=this.show>.02;
      beam.rotation.z=Math.sin(this.time*1.7+i*1.3)*.5;beam.rotation.x=Math.cos(this.time*1.3+i*.9)*.35;
    });
    if(this.bloom)this.bloom.strength=.28+this.show*.16+this.flash*.2;
    if(this.token.visible){this.token.position.y=.34+Math.sin(this.time*3.2)*.05;this.token.material.rotation=Math.sin(this.time*2)*.12;}
    this.crowd.update(this.time,this.excitement);this.sparks.update(dt);this.confetti.update(dt);this.shockwaves.update(dt);
  }
  dispose(){
    for(const texture of this.ballTextures.values())texture.dispose();
    super.dispose();
  }
}
export {RACK_CENTER};
