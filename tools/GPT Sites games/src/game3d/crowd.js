// Cheering crowd shared by the 3D games: colourful blob spectators that hop higher as excitement rises.
import * as THREE from 'three';

function faceTexture(){
  const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d');
  g.fillStyle='#fff';for(const x of [44,84]){g.beginPath();g.arc(x,50,17,0,7);g.fill();}
  g.fillStyle='#1a0b2b';for(const x of [46,86]){g.beginPath();g.arc(x,52,8,0,7);g.fill();}
  g.strokeStyle='#1a0b2b';g.lineWidth=7;g.lineCap='round';g.beginPath();g.arc(64,74,26,.15*Math.PI,.85*Math.PI);g.stroke();
  const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}

export class Crowd{
  /** seats: [{x,y,z,yaw}] — y is the spectator's centre height, yaw the direction they face. */
  constructor(scene,seats){
    this.seats=seats.map(seat=>({...seat,phase:Math.random()*6.3,speed:5+Math.random()*3,hop:.6+Math.random()*.6}));
    this.body=new THREE.InstancedMesh(new THREE.CapsuleGeometry(.13,.15,4,12),new THREE.MeshStandardMaterial({roughness:.55}),seats.length);
    this.face=new THREE.InstancedMesh(new THREE.PlaneGeometry(.2,.2),new THREE.MeshBasicMaterial({map:faceTexture(),transparent:true,toneMapped:false,depthWrite:false}),seats.length);
    const color=new THREE.Color();
    this.seats.forEach((_,i)=>this.body.setColorAt(i,color.setHSL((i*.173)%1,.9,.42)));
    this.body.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.face.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.body.frustumCulled=this.face.frustumCulled=false;
    scene.add(this.body,this.face);
    this.matrix=new THREE.Matrix4();this.quat=new THREE.Quaternion();this.scale=new THREE.Vector3();this.point=new THREE.Vector3();this.up=new THREE.Vector3(0,1,0);
    this.update(0,0);
  }
  update(time,excitement){
    const {matrix:m,quat:q,scale:s,point:p}=this;
    this.seats.forEach((seat,i)=>{
      const wave=Math.abs(Math.sin(time*seat.speed*(.5+excitement*.6)+seat.phase));
      const y=seat.y+wave*(.015+excitement*.24*seat.hop);
      q.setFromAxisAngle(this.up,seat.yaw);s.set(1,1+wave*excitement*.12,1);
      m.compose(p.set(seat.x,y,seat.z),q,s);this.body.setMatrixAt(i,m);
      m.compose(p.set(seat.x+Math.sin(seat.yaw)*.135,y+.07,seat.z+Math.cos(seat.yaw)*.135),q,s);this.face.setMatrixAt(i,m);
    });
    this.body.instanceMatrix.needsUpdate=true;this.face.instanceMatrix.needsUpdate=true;
  }
}
