// Three.js scene for 3D Animal Basketball: court, hoop with a moving net, the animal shooter and the crowd.
// Playback is driven by director.js; shots come from shots.mjs.
import * as THREE from 'three';
import {Stage3D} from '../game3d/stage3d.js';
import {Crowd} from '../game3d/crowd.js';
import {Sparks,Confetti,Shockwaves} from '../bowling3d/fx.js';
import {backdropTexture,stripTexture,glowTexture} from '../bowling3d/textures.js';
import {HOOP,SPOTS} from './shots.mjs';
import {ANIMALS} from '../basketball-model.mjs';
import {HOLD,holdPoint,footLift} from './hold.mjs';

const COLORS={skyTop:'#2a0a5c',skyBottom:'#7a14c9',floor:'#241046',neonA:'#ff3fd0',neonB:'#27e0ff',fog:'#33106a',key:'#7a2bd6'};
const COURT={x0:-3,x1:11.5,z0:-6,z1:6}; // floor texture bounds; the baseline is at x=-1.2
const SHEETS=['cat-dog','rabbit-panda','fox-penguin'];

function texture(canvas){const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;}
function courtTexture(){
  const W=2048,H=1696,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
  const sx=W/(COURT.x1-COURT.x0),sz=H/(COURT.z1-COURT.z0),X=x=>(x-COURT.x0)*sx,Z=z=>(z-COURT.z0)*sz;
  let seed=11;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  for(let i=0;i<64;i++){const tone=rnd();g.fillStyle=`hsl(${32+tone*6},${58+tone*14}%,${60+tone*12}%)`;g.fillRect(0,i*H/64,W,H/64+1);}
  for(let i=0;i<900;i++){g.strokeStyle=`rgba(120,70,20,${.04+rnd()*.06})`;const x=rnd()*W,y=rnd()*H;g.beginPath();g.moveTo(x,y);g.lineTo(x+60+rnd()*260,y+(rnd()-.5)*4);g.stroke();}
  g.fillStyle=COLORS.key;g.globalAlpha=.82;g.fillRect(X(-1.2),Z(-1.8),X(4.6)-X(-1.2),Z(1.8)-Z(-1.8));g.globalAlpha=1;
  g.strokeStyle='#fff';g.lineWidth=11;
  g.strokeRect(X(-1.2),Z(-5.6),X(11.2)-X(-1.2),Z(5.6)-Z(-5.6)); // boundary
  g.strokeRect(X(-1.2),Z(-1.8),X(4.6)-X(-1.2),Z(1.8)-Z(-1.8)); // key
  g.beginPath();g.ellipse(X(4.6),Z(0),1.8*sx,1.8*sz,0,0,7);g.stroke(); // free-throw circle
  g.beginPath();g.ellipse(X(0),Z(0),6.75*sx,6.75*sz,0,-Math.acos(-1.2/6.75),Math.acos(-1.2/6.75));g.stroke(); // three-point arc
  g.beginPath();g.ellipse(X(0),Z(0),1.25*sx,1.25*sz,0,-Math.PI/2,Math.PI/2);g.stroke();
  // Shooting spots for 1, 2 and 3 points.
  g.textAlign='center';g.textBaseline='middle';g.font='900 120px "Comic Relief",system-ui';
  for(const [points,color] of [[1,'#ffe21f'],[2,'#27e0ff'],[3,'#ff3fd0']]){
    g.fillStyle=color;g.globalAlpha=.85;g.beginPath();g.ellipse(X(SPOTS[points]),Z(0),.55*sx,.55*sz,0,0,7);g.fill();g.globalAlpha=1;g.lineWidth=9;g.stroke();
    g.fillStyle='#2a0850';g.fillText(String(points),X(SPOTS[points]),Z(0)+8);
  }
  return texture(c);
}
function boardTexture(){
  const c=document.createElement('canvas');c.width=720;c.height=420;const g=c.getContext('2d');
  g.fillStyle='rgba(255,255,255,.9)';g.fillRect(0,0,720,420);g.lineWidth=18;g.strokeStyle='#ff3fd0';g.strokeRect(9,9,702,402);
  g.strokeStyle='#ff6a1f';g.lineWidth=14;g.strokeRect(248,206,224,150);
  return texture(c);
}
function ballTexture(){
  const W=512,H=256,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
  g.fillStyle='#e8761a';g.fillRect(0,0,W,H);
  for(let i=0;i<2600;i++){g.fillStyle=`rgba(90,35,0,${Math.random()*.16})`;g.fillRect(Math.random()*W,Math.random()*H,2,2);}
  g.strokeStyle='#1f0f06';g.lineWidth=7;
  for(const u of [0,.5,1]){g.beginPath();g.moveTo(u*W,0);g.lineTo(u*W,H);g.stroke();}
  g.beginPath();g.moveTo(0,H/2);g.lineTo(W,H/2);g.stroke();
  for(const u of [.25,.75]){g.beginPath();g.ellipse(u*W,H/2,W*.14,H*.5,0,0,7);g.stroke();}
  return texture(c);
}

export class BasketStage extends Stage3D{
  constructor(canvas,{quality='high'}={}){
    super(canvas,{quality,fog:COLORS.fog,fogNear:22,fogFar:46,fov:46});
    this.excitement=0;this.show=0;this.flash=0;this.charge=0;this.aura=0;this.netAt=-9;this.netPower=0;this.rimShake=0;this.boardShake=0;
    this.buildCourt();this.buildHoop();this.buildCrowd();this.buildLights();this.buildActors();
    this.sparks=new Sparks(this.scene);this.confetti=new Confetti(this.scene,quality==='high'?420:160);this.shockwaves=new Shockwaves(this.scene);
    this.addGlow();
  }
  buildCourt(){
    const w=COURT.x1-COURT.x0,d=COURT.z1-COURT.z0,court=new THREE.PlaneGeometry(w,d);court.rotateX(-Math.PI/2);
    this.mesh(court,new THREE.MeshPhysicalMaterial({map:courtTexture(),roughness:.3,clearcoat:.8,clearcoatRoughness:.12}),(COURT.x0+COURT.x1)/2,0,0,true);
    const around=new THREE.PlaneGeometry(60,50);around.rotateX(-Math.PI/2);
    this.mesh(around,new THREE.MeshStandardMaterial({color:COLORS.floor,roughness:.4,metalness:.2}),4,-.02,0,true);
    const backdrop=backdropTexture(COLORS);backdrop.repeat.set(4,2.4);
    const wall=new THREE.MeshBasicMaterial({map:backdrop,toneMapped:false,color:'#b9a6d9'});
    this.mesh(new THREE.PlaneGeometry(60,30),wall,4,14,-11.5);
    const left=this.mesh(new THREE.PlaneGeometry(40,30),wall,-8,14,0);left.rotation.y=Math.PI/2;
    // LED boards along the far sideline and behind the hoop.
    this.strip=stripTexture(COLORS);this.strip.repeat.set(10,1);
    const neon=new THREE.MeshBasicMaterial({map:this.strip,toneMapped:false});
    this.mesh(new THREE.BoxGeometry(w,.55,.12),neon,(COURT.x0+COURT.x1)/2,.3,COURT.z0-.1);
    const end=this.mesh(new THREE.BoxGeometry(.12,.55,d),neon,COURT.x0-.1,.3,0);
    const uv=end.geometry.attributes.uv,pos=end.geometry.attributes.position;
    for(let i=0;i<uv.count;i++)uv.setXY(i,pos.getZ(i)/d+.5,uv.getY(i));
  }
  buildHoop(){
    const dark=new THREE.MeshStandardMaterial({color:'#2a1450',roughness:.4,metalness:.4});
    this.mesh(new THREE.CylinderGeometry(.09,.11,3.5,16),dark,-1.75,1.75,0,true).castShadow=true;
    const arm=this.mesh(new THREE.BoxGeometry(1.4,.12,.12),dark,-1.07,3.42,0);arm.castShadow=true;
    this.board=new THREE.Group();this.board.position.set(HOOP.boardX,3.425,0);
    const glass=new THREE.Mesh(new THREE.BoxGeometry(.05,1.05,1.8),new THREE.MeshStandardMaterial({color:'#fff',transparent:true,opacity:.35,roughness:.1}));glass.position.x=-.025;
    const face=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.05),new THREE.MeshBasicMaterial({map:boardTexture(),transparent:true,toneMapped:false,side:THREE.DoubleSide}));
    face.rotation.y=Math.PI/2;face.position.x=.002;
    this.board.add(glass,face);this.scene.add(this.board);
    this.rimMaterial=new THREE.MeshStandardMaterial({color:'#ff6a1f',emissive:'#ff5a1f',emissiveIntensity:.6,roughness:.35,metalness:.3});
    const rimGeometry=new THREE.TorusGeometry(HOOP.rimR,.02,12,40);rimGeometry.rotateX(Math.PI/2);
    this.rim=new THREE.Group();this.rim.position.set(0,HOOP.rimY,0);
    this.rim.add(new THREE.Mesh(rimGeometry,this.rimMaterial));
    const neck=new THREE.Mesh(new THREE.BoxGeometry(.16,.03,.1),this.rimMaterial);neck.position.x=-HOOP.rimR-.07;this.rim.add(neck);
    this.scene.add(this.rim);
    // Second rim for Double Points: hidden until the card turns the hoop into a golden double hoop.
    this.rim2=new THREE.Mesh(rimGeometry,new THREE.MeshStandardMaterial({color:'#ffd23f',emissive:'#ffb21f',emissiveIntensity:1.4,roughness:.3}));
    this.rim2.position.set(0,HOOP.rimY+.38,0);this.rim2.visible=false;this.scene.add(this.rim2);
    // Net: a diamond mesh of lines, re-shaped every frame.
    const rings=7,around=14,index=[];
    for(let k=0;k<rings-1;k++)for(let i=0;i<around;i++){const a=k*around+i,b=(k+1)*around+i,c=(k+1)*around+(i+1)%around;index.push(a,b,a,c);}
    const geometry=new THREE.BufferGeometry();this.netPoints=new Float32Array(rings*around*3);this.netShape={rings,around};
    geometry.setAttribute('position',new THREE.BufferAttribute(this.netPoints,3));geometry.setIndex(index);
    this.net=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:'#ffffff',toneMapped:false}));this.net.frustumCulled=false;this.scene.add(this.net);
    this.shapeNet();
  }
  /** Shapes the net: hanging still, or billowing down and out for a moment after the ball goes through. */
  shapeNet(){
    const {rings,around}=this.netShape,since=this.time-this.netAt,wave=this.netPower*Math.exp(-since*3.4)*Math.sin(since*15),rattle=this.rimShake;
    for(let k=0;k<rings;k++){
      const u=k/(rings-1),radius=HOOP.rimR*(1-u*.42)+wave*.07*Math.sin(u*Math.PI)+(since<.25?this.netPower*.05*Math.sin(u*Math.PI)*(1-since/.25):0);
      const y=HOOP.rimY-u*.44-Math.max(0,wave)*.1*u-(since<.3?this.netPower*.09*u*(1-since/.3):0);
      for(let i=0;i<around;i++){
        const a=(i+(k%2)*.5)/around*Math.PI*2,o=(k*around+i)*3;
        this.netPoints[o]=Math.cos(a)*radius+Math.sin(this.time*38)*rattle*.02*u;this.netPoints[o+1]=y;this.netPoints[o+2]=Math.sin(a)*radius;
      }
    }
    this.net.geometry.attributes.position.needsUpdate=true;
  }
  buildCrowd(){
    const seats=[],riser=new THREE.MeshStandardMaterial({color:'#2c0f58',roughness:.8});
    for(let row=0;row<3;row++){
      const z=COURT.z0-.9-row*.5,y=.1+row*.3;
      this.mesh(new THREE.BoxGeometry(15,.3+row*.3,.5),riser,4.2,(.3+row*.3)/2-.1,z,true);
      for(let x=-3;x<11.4;x+=.48)seats.push({x:x+(row%2)*.24,y:y+.3,z,yaw:0});
      const bx=COURT.x0-.9-row*.5;
      this.mesh(new THREE.BoxGeometry(.5,.3+row*.3,10),riser,bx,(.3+row*.3)/2-.1,0,true);
      for(let s=-4.6;s<4.8;s+=.48)seats.push({x:bx,y:y+.3,z:s+(row%2)*.24,yaw:Math.PI/2});
    }
    this.crowd=new Crowd(this.scene,seats);
  }
  buildLights(){
    this.scene.add(new THREE.HemisphereLight('#ffffff','#5a2a9a',.55));
    const key=this.key=new THREE.DirectionalLight('#fff4e0',1.5);
    key.position.set(4,9,6);key.target.position.set(2.5,0,0);key.castShadow=this.quality==='high';key.shadow.mapSize.set(2048,2048);
    Object.assign(key.shadow.camera,{left:-7,right:8,top:6,bottom:-6,near:1,far:24});key.shadow.bias=-.0004;key.shadow.normalBias=.02;
    this.scene.add(key,key.target);
    const fill=new THREE.DirectionalLight('#c9b8ff',.5);fill.position.set(-3,5,6);this.scene.add(fill);
    this.showLights=[new THREE.PointLight(COLORS.neonA,0,12,1.6),new THREE.PointLight(COLORS.neonB,0,12,1.6)];
    this.showLights[0].position.set(-1,4.4,2);this.showLights[1].position.set(2,4.4,-2);
    this.flashLight=new THREE.PointLight('#fff',0,9,1.4);this.flashLight.position.set(0,3,1);
    this.scene.add(...this.showLights,this.flashLight);
    this.beams=[];
    for(let i=0;i<6;i++){
      const geometry=new THREE.ConeGeometry(1.1,9,20,1,true);geometry.translate(0,-4.5,0);
      const beam=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:i%2?COLORS.neonA:COLORS.neonB,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,toneMapped:false,fog:false}));
      beam.position.set(-1+i*1.8,8.5,-2.5+(i%3));beam.renderOrder=4;this.scene.add(beam);this.beams.push(beam);
    }
  }
  buildActors(){
    this.ballMaterial=new THREE.MeshStandardMaterial({map:ballTexture(),roughness:.75,emissive:'#ffffff',emissiveIntensity:0});
    this.ballMaterial.emissiveMap=this.ballMaterial.map;
    this.ball=new THREE.Mesh(new THREE.SphereGeometry(HOOP.ballR,32,20),this.ballMaterial);this.ball.castShadow=true;this.scene.add(this.ball);
    this.glow=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture(),color:'#fff',transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
    this.scene.add(this.glow);
    const blob=()=>{const g=new THREE.PlaneGeometry(1,1);g.rotateX(-Math.PI/2);
      return this.mesh(g,new THREE.MeshBasicMaterial({map:glowTexture(),color:'#000',transparent:true,opacity:.4,depthWrite:false}),0,.012,0);};
    this.ballShadow=blob();this.playerShadow=blob();this.playerShadow.scale.set(1.3,1,.7);
    // The shooter: a flat cut-out from the existing sprite sheets (4 poses per animal), always facing the camera side.
    const loader=new THREE.TextureLoader();
    this.sheets=Object.fromEntries(SHEETS.map(name=>{const t=loader.load(`/basketball/${name}.png`);t.colorSpace=THREE.SRGBColorSpace;t.repeat.set(.25,.5);return [name,t];}));
    // One more picture per animal: ready to shoot with the ball in both paws (see hold.mjs).
    this.holdSheet=loader.load(HOLD.url);this.holdSheet.colorSpace=THREE.SRGBColorSpace;this.holdSheet.repeat.set(1/HOLD.cols,1/HOLD.rows);
    this.playerMaterial=new THREE.MeshBasicMaterial({map:this.sheets['cat-dog'],transparent:true,alphaTest:.08,toneMapped:false,side:THREE.DoubleSide});
    const body=new THREE.PlaneGeometry(1.65,2.2);body.translate(0,1.1,0);
    this.player=new THREE.Mesh(body,this.playerMaterial);this.player.renderOrder=3;this.scene.add(this.player);
    this.animal=ANIMALS[0];this.pose=0;
    this.setPlayer('cat');this.placePlayer(2);
  }
  setPlayer(id){this.animal=ANIMALS.find(a=>a.id===id)||ANIMALS[0];this.setPose(this.pose);if(this.pose===4)this.holdBall();}
  /** 0 ready with empty paws, 1 shooting, 2 celebrating, 3 disappointed, 4 ready with the ball held in both paws. */
  setPose(pose){
    this.pose=pose;const hold=pose===4?HOLD.cells[this.animal.id]:null,map=hold?this.holdSheet:this.sheets[this.animal.sheet];
    if(hold)map.offset.set(hold.col/HOLD.cols,1-(hold.row+1)/HOLD.rows);else map.offset.set((pose===4?0:pose)*.25,this.animal.row?0:.5);
    this.playerMaterial.map=map;this.playerMaterial.needsUpdate=true;
    // Lower the picture so this pose's shoes touch the court.
    const lift=footLift(this.animal.id,pose);this.player.geometry.translate(0,(this.lift||0)-lift,0);this.lift=lift;
  }
  /** Stands the shooter on the spot for a 1, 2, 3 (or 4) point shot, holding the ball. */
  placePlayer(points){
    this.player.position.set(SPOTS[points],0,0);this.player.scale.set(1,1,1);this.player.rotation.z=0;this.player.visible=true;
    this.setPose(4);this.holdBall();
  }
  /** Hides the 3D ball exactly on the ball painted in the animal's paws, at the painted size. */
  holdBall(){
    const at=holdPoint(this.animal.id,this.player.position,this.player.scale.y);
    this.ball.position.set(at.x,at.y,at.z);this.ball.quaternion.identity();this.ball.scale.setScalar(at.scale);this.ball.visible=!HOLD.cells[this.animal.id];this.syncExtras();
  }
  /** The painted ball becomes the real one: shooting picture (arms going up), 3D ball shown at the same place and size. No effect once released. */
  releaseBall(){if(this.pose!==4)return false;this.holdBall();this.setPose(1);this.ball.visible=true;this.syncExtras();return true;}
  /** Shows one recorded frame, blended with the next one. Frame layout: x,y,z,qx,qy,qz,qw. */
  applyBall(a,b,alpha){
    this.ball.position.set(a[0]+(b[0]-a[0])*alpha,a[1]+(b[1]-a[1])*alpha,a[2]+(b[2]-a[2])*alpha);
    this.qa??=new THREE.Quaternion();this.qb??=new THREE.Quaternion();
    this.ball.quaternion.slerpQuaternions(this.qa.set(a[3],a[4],a[5],a[6]),this.qb.set(b[3],b[4],b[5],b[6]),alpha);
    this.syncExtras();
  }
  syncExtras(){
    const p=this.ball.position,h=Math.max(.2,1-p.y*.12);this.glow.position.copy(p);
    this.ballShadow.visible=this.ball.visible;this.ballShadow.position.set(p.x,.012,p.z);this.ballShadow.scale.setScalar(.45*h);this.ballShadow.material.opacity=.42*h;
    this.playerShadow.visible=this.player.visible;this.playerShadow.position.set(this.player.position.x,.012,this.player.position.z);
    this.playerShadow.material.opacity=.4*Math.max(.25,1-this.player.position.y*.35);
  }
  setAura(color,level=1){this.aura=level;const c=level>0?color:'#fff';this.glow.material.color.set(c);this.ballMaterial.emissive.set(c);}
  swishNet(power=1){this.netAt=this.time;this.netPower=power;}
  hitRim(strength=1){this.rimShake=Math.max(this.rimShake,strength);}
  hitBoard(strength=1){this.boardShake=Math.max(this.boardShake,strength);}
  /** Double Points: the hoop turns gold and a second golden rim appears above it (level 0–1). */
  goldHoop(level){
    this.rim2.visible=level>.01;this.rim2.scale.setScalar(Math.max(.01,level));
    this.rimMaterial.color.set(level>.01?'#ffd23f':'#ff6a1f');this.rimMaterial.emissive.set(level>.01?'#ffb21f':'#ff5a1f');this.rimMaterial.emissiveIntensity=.6+level*.9;
  }
  cheer(level){this.excitement=Math.max(this.excitement,level);}
  lightShow(level){this.show=Math.max(this.show,level);}
  flashAt(position,strength=1){this.flash=strength;this.flashLight.position.set(position.x,position.y??3,position.z+.6);}
  update(dt){
    this.time+=dt;
    this.excitement=Math.max(0,this.excitement-dt*.28);this.show=Math.max(0,this.show-dt*.3);this.flash=Math.max(0,this.flash-dt*3.2);
    this.rimShake*=Math.exp(-6*dt);this.boardShake*=Math.exp(-7*dt);
    this.rim.rotation.z=Math.sin(this.time*42)*this.rimShake*.07;this.board.position.x=HOOP.boardX+Math.sin(this.time*55)*this.boardShake*.025;
    this.shapeNet();this.strip.offset.x-=dt*(.2+this.show*1.4);
    this.ballMaterial.emissiveIntensity=Math.max(this.charge*.35,this.aura*.5);this.glow.material.opacity=Math.max(this.charge*.38,this.aura*.6);
    this.glow.scale.setScalar(.45+Math.max(this.charge*.5,this.aura*.55));
    this.flashLight.intensity=this.flash*6;
    this.showLights.forEach((light,i)=>{light.intensity=this.show*(4+3*Math.sin(this.time*9+i*2.4));});
    this.beams.forEach((beam,i)=>{beam.material.opacity=this.show*.18;beam.visible=this.show>.02;beam.rotation.z=Math.sin(this.time*1.7+i*1.3)*.5;beam.rotation.x=Math.cos(this.time*1.3+i*.9)*.35;});
    if(this.bloom)this.bloom.strength=.28+this.show*.16+this.flash*.2;
    this.crowd.update(this.time,this.excitement);this.sparks.update(dt);this.confetti.update(dt);this.shockwaves.update(dt);
  }
}
