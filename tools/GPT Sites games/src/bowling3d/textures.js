// Canvas-drawn textures for the 3D bowling stage. Everything is generated locally; no image downloads.
import * as THREE from 'three';
import {LANE,PIN_HEIGHT,pinWorldPosition} from './physics.mjs';

const make=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return [c,c.getContext('2d')];};
const finish=(canvas,repeat)=>{
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
  if(repeat){texture.wrapS=texture.wrapT=THREE.RepeatWrapping;}
  return texture;
};
function seeded(seed){let s=seed;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}

export const LANE_NEAR=LANE.approach,LANE_FAR=-LANE.length-LANE.deckEnd,LANE_SPAN=LANE_NEAR-LANE_FAR;

export function laneTexture(){
  const W=512,H=4096,[c,g]=make(W,H),rnd=seeded(7);
  const py=z=>(z-LANE_FAR)/LANE_SPAN*H,px=x=>(x/LANE.width+.5)*W;
  const boards=39,bw=W/boards;
  for(let i=0;i<boards;i++){
    const tone=rnd();
    g.fillStyle=`hsl(${33+tone*6},${62+tone*12}%,${62+tone*13}%)`;g.fillRect(i*bw,0,bw+1,H);
    g.strokeStyle='rgba(120,70,20,.28)';g.lineWidth=1;g.beginPath();g.moveTo(i*bw,0);g.lineTo(i*bw,H);g.stroke();
    for(let k=0;k<26;k++){ // grain
      g.strokeStyle=`rgba(${110+rnd()*60},${60+rnd()*40},20,${.05+rnd()*.07})`;
      const x=i*bw+rnd()*bw,y=rnd()*H,len=120+rnd()*500;
      g.beginPath();g.moveTo(x,y);g.bezierCurveTo(x+2,y+len*.3,x-2,y+len*.6,x+1,y+len);g.stroke();
    }
  }
  g.fillStyle='rgba(255,246,214,.25)';g.fillRect(0,0,W,py(-LANE.length+.5)); // pin deck
  g.fillStyle='rgba(70,35,8,.2)';g.fillRect(0,py(0),W,H-py(0)); // approach
  g.fillStyle='#2a1238';g.fillRect(0,py(0)-5,W,10); // foul line
  g.fillStyle='#3b1a12';
  for(let i=-3;i<=3;i++){ // aiming arrows
    const x=px(i*.132),y=py(-3.9-Math.abs(i)*.22);
    g.beginPath();g.moveTo(x,y-46);g.lineTo(x+11,y+22);g.lineTo(x-11,y+22);g.closePath();g.fill();
  }
  for(let i=-4;i<=4;i++){g.beginPath();g.arc(px(i*.105),py(-1.9),5,0,7);g.fill();}
  g.fillStyle='rgba(40,20,10,.55)';
  for(let id=0;id<10;id++){const p=pinWorldPosition(id);g.beginPath();g.ellipse(px(p.x),py(p.z),13,13*W/H*(LANE_SPAN/LANE.width),0,0,7);g.fill();}
  return finish(c);
}

export function pinTexture(){
  const [c,g]=make(64,512);
  const grad=g.createLinearGradient(0,0,0,512);grad.addColorStop(0,'#ffffff');grad.addColorStop(1,'#f3f0ea');
  g.fillStyle=grad;g.fillRect(0,0,64,512);
  const band=(lo,hi)=>g.fillRect(0,512*(1-hi/PIN_HEIGHT),64,512*(hi-lo)/PIN_HEIGHT);
  g.fillStyle='#e3122f';band(.252,.268);band(.279,.295);
  return finish(c);
}

function star(g,x,y,r,stretch){
  g.save();g.translate(x,y);g.scale(stretch,1);g.beginPath();
  for(let i=0;i<10;i++){const a=i*Math.PI/5-Math.PI/2,rad=i%2?r*.45:r;g.lineTo(Math.cos(a)*rad,Math.sin(a)*rad);}
  g.closePath();g.fill();g.restore();
}
function onSphere(rnd,count,W,H,draw){
  for(let i=0;i<count;i++){
    const v=Math.acos(2*rnd()-1)/Math.PI,u=rnd(),stretch=Math.min(6,1/Math.max(.16,Math.sin(v*Math.PI)));
    for(const shift of [-1,0,1])draw((u+shift)*W,v*H,stretch,i);
  }
}
/** Equirectangular texture for a bowling ball. skin = [name, base, light, asset] from BALL_SKINS. */
export function ballTexture(skin){
  const W=1024,H=512,[c,g]=make(W,H),[,base,light,asset,symbol]=skin,rnd=seeded(asset.length*97+11);
  g.fillStyle=base;g.fillRect(0,0,W,H);
  const blob=(color,count,size)=>{g.fillStyle=color;onSphere(rnd,count,W,H,(x,y,s)=>{g.beginPath();g.ellipse(x,y,size*s,size,0,0,7);g.fill();});};
  switch(asset){
    case 'stars':g.fillStyle='#5a1fb0';g.fillRect(0,0,W,H);g.fillStyle='#ffe21f';onSphere(rnd,26,W,H,(x,y,s,i)=>star(g,x,y,34+(i%3)*9,s));break;
    case 'eight-ball':g.fillStyle='#fff';g.beginPath();g.arc(W*.25,H*.5,88,0,7);g.fill();
      g.fillStyle='#111';g.font='900 128px Arial';g.textAlign='center';g.textBaseline='middle';g.fillText('8',W*.25,H*.52);break;
    case 'basketball':g.strokeStyle='#22130a';g.lineWidth=13;
      for(const u of [0,.5,1]){g.beginPath();g.moveTo(u*W,0);g.lineTo(u*W,H);g.stroke();}
      g.beginPath();g.moveTo(0,H/2);g.lineTo(W,H/2);g.stroke();
      for(const u of [.25,.75]){g.beginPath();g.ellipse(u*W,H/2,W*.14,H*.5,0,0,7);g.stroke();}break;
    case 'soccer':g.fillStyle='#fafafa';g.fillRect(0,0,W,H);blob('#1b1b1f',16,42);break;
    case 'baseball':g.fillStyle='#fbf8f0';g.fillRect(0,0,W,H);g.strokeStyle='#d6202d';g.lineWidth=9;g.setLineDash([10,14]);
      for(const u of [.25,.75]){g.beginPath();g.ellipse(u*W,H/2,W*.13,H*.42,0,0,7);g.stroke();}g.setLineDash([]);break;
    case 'watermelon':g.fillStyle='#0d5a24';
      for(let i=0;i<12;i++){g.beginPath();for(let y=0;y<=H;y+=16)g.lineTo(i*W/12+Math.sin(y/26+i)*13,y);
        for(let y=H;y>=0;y-=16)g.lineTo(i*W/12+34+Math.sin(y/22+i*2)*13,y);g.closePath();g.fill();}break;
    case 'swirl-candy':g.fillStyle=light;
      for(let i=-4;i<12;i++){g.beginPath();g.moveTo(i*W/8,0);g.lineTo(i*W/8+W/16,0);g.lineTo(i*W/8+W/16+H*.9,H);g.lineTo(i*W/8+H*.9,H);g.closePath();g.fill();}break;
    case 'zebra':g.fillStyle='#fff';g.fillRect(0,0,W,H);g.fillStyle='#1c1a22';
      for(let i=0;i<14;i++){g.beginPath();for(let y=0;y<=H;y+=14)g.lineTo(i*W/14+Math.sin(y/40+i*1.7)*26,y);
        for(let y=H;y>=0;y-=14)g.lineTo(i*W/14+30+Math.sin(y/33+i)*22,y);g.closePath();g.fill();}break;
    case 'fire':{const grad=g.createLinearGradient(0,0,0,H);grad.addColorStop(0,'#ffe14a');grad.addColorStop(.55,'#ff7a1a');grad.addColorStop(1,'#c81e12');
      g.fillStyle=grad;g.fillRect(0,0,W,H);g.fillStyle='rgba(255,240,120,.8)';
      for(let i=0;i<22;i++){const x=rnd()*W,h=90+rnd()*190;g.beginPath();g.moveTo(x-26,H);g.quadraticCurveTo(x-10,H-h*.5,x,H-h);g.quadraticCurveTo(x+12,H-h*.5,x+26,H);g.fill();}break;}
    case 'lightning':g.strokeStyle=light;g.lineWidth=9;g.lineJoin='miter';
      for(let i=0;i<9;i++){let x=rnd()*W,y=0;g.beginPath();g.moveTo(x,y);while(y<H){x+=(rnd()-.5)*110;y+=50+rnd()*50;g.lineTo(x,y);}g.stroke();}break;
    case 'flowers':onSphere(rnd,18,W,H,(x,y,s)=>{g.fillStyle=light;for(let k=0;k<6;k++){const a=k*Math.PI/3;g.beginPath();g.ellipse(x+Math.cos(a)*24*s,y+Math.sin(a)*24,15*s,15,0,0,7);g.fill();}
      g.fillStyle='#ffd21c';g.beginPath();g.ellipse(x,y,12*s,12,0,0,7);g.fill();});break;
    case 'donut':blob(light,34,13);g.fillStyle='#fff';onSphere(rnd,90,W,H,(x,y,s,i)=>{g.fillStyle=['#fff','#39c5f2','#ffe14a','#7be06a'][i%4];g.fillRect(x,y,16*s,6);});break;
    case 'pizza':blob('#c9321f',20,30);blob('#3c7a2a',18,10);break;
    case 'camouflage':blob('#3c4424',26,54);blob(light,22,40);blob('#2a2f1a',16,30);break;
    case 'dragon-eye':g.fillStyle=light;g.beginPath();g.ellipse(W*.25,H/2,130,150,0,0,7);g.fill();
      g.fillStyle='#0a2a20';g.beginPath();g.ellipse(W*.25,H/2,26,128,0,0,7);g.fill();break;
    case 'card':{ // power-card ball: bright band with the card's symbol repeated around it
      g.fillStyle=light;g.fillRect(0,H*.3,W,H*.4);g.fillStyle='rgba(255,255,255,.85)';g.fillRect(0,H*.3-10,W,10);g.fillRect(0,H*.7,W,10);
      g.font='900 150px "Comic Relief","Comic Sans MS",system-ui';g.textAlign='center';g.textBaseline='middle';g.lineJoin='round';
      for(const u of [.08,.42,.92]){g.lineWidth=22;g.strokeStyle=base;g.strokeText(symbol||'★',u*W,H*.51);g.fillStyle='#fff';g.fillText(symbol||'★',u*W,H*.51);}
      g.fillStyle='rgba(255,255,255,.9)';onSphere(rnd,14,W,H,(x,y,s)=>{if(y<H*.26||y>H*.74)star(g,x,y,16,s);});break;}
    default:blob(light,24,46);
  }
  // Three finger holes near the top.
  g.fillStyle='rgba(8,4,14,.92)';
  for(const [u,v] of [[.72,.2],[.765,.2],[.742,.29]]){g.beginPath();g.ellipse(u*W,v*H,13/Math.sin(v*Math.PI),13,0,0,7);g.fill();}
  return finish(c);
}

export function signTexture(theme){
  const [c,g]=make(1024,400);
  const grad=g.createLinearGradient(0,0,0,400);grad.addColorStop(0,theme.signTop);grad.addColorStop(1,theme.signBottom);
  g.fillStyle=grad;g.fillRect(0,0,1024,400);
  const rnd=seeded(31);g.fillStyle='rgba(255,255,255,.9)';
  for(let i=0;i<34;i++)star(g,rnd()*1024,rnd()*400,6+rnd()*13,1);
  g.font='900 190px "Comic Relief","Comic Sans MS",system-ui';g.textAlign='center';g.textBaseline='middle';
  g.lineJoin='round';g.lineWidth=30;g.strokeStyle='#2a0850';g.strokeText('BOWLING!',512,210);
  g.lineWidth=12;g.strokeStyle='#fff';g.strokeText('BOWLING!',512,210);
  g.fillStyle=theme.signText;g.fillText('BOWLING!',512,210);
  return finish(c);
}

export function backdropTexture(theme){
  const [c,g]=make(1024,512),rnd=seeded(5);
  const grad=g.createLinearGradient(0,0,0,512);grad.addColorStop(0,theme.skyTop);grad.addColorStop(1,theme.skyBottom);
  g.fillStyle=grad;g.fillRect(0,0,1024,512);
  for(let i=0;i<70;i++){ // retro confetti shapes, like the original arcade wall
    g.save();g.translate(rnd()*1024,rnd()*512);g.rotate(rnd()*6.3);
    g.strokeStyle=g.fillStyle=`hsla(${[300,190,45,275][i%4]},95%,${60+rnd()*15}%,${.2+rnd()*.3})`;g.lineWidth=5;
    if(i%3===0){g.beginPath();g.moveTo(0,-16);g.lineTo(14,12);g.lineTo(-14,12);g.closePath();g.fill();}
    else if(i%3===1){g.beginPath();g.arc(0,0,13,0,7);g.stroke();}
    else{g.beginPath();for(let k=0;k<5;k++)g.lineTo(k*11-22,k%2?-9:9);g.stroke();}
    g.restore();
  }
  return finish(c,true);
}

export function stripTexture(theme){
  const [c,g]=make(256,8);
  for(let i=0;i<8;i++){g.fillStyle=i%2?theme.neonA:theme.neonB;g.fillRect(i*32,0,22,8);g.fillStyle='#120420';g.fillRect(i*32+22,0,10,8);}
  return finish(c,true);
}

export function glowTexture(){
  const [c,g]=make(64,64),grad=g.createRadialGradient(32,32,0,32,32,32);
  grad.addColorStop(0,'rgba(255,255,255,1)');grad.addColorStop(.35,'rgba(255,255,255,.55)');grad.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=grad;g.fillRect(0,0,64,64);return finish(c);
}
