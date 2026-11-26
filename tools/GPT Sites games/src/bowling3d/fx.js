// Particle, confetti and shockwave effects for the 3D bowling stage.
import * as THREE from 'three';
import {glowTexture} from './textures.js';

const VERT=`attribute float size;attribute vec4 tint;varying vec4 vTint;uniform float scale;
void main(){vTint=tint;vec4 mv=modelViewMatrix*vec4(position,1.);gl_PointSize=size*scale/max(.1,-mv.z);gl_Position=projectionMatrix*mv;}`;
const FRAG=`uniform sampler2D map;varying vec4 vTint;void main(){vec4 t=texture2D(map,gl_PointCoord);gl_FragColor=vec4(vTint.rgb,vTint.a*t.a);}`;

export class Sparks{
  constructor(scene,capacity=2600){
    this.capacity=capacity;this.count=0;this.cursor=0;
    this.pos=new Float32Array(capacity*3);this.vel=new Float32Array(capacity*3);this.tint=new Float32Array(capacity*4);
    this.size=new Float32Array(capacity);this.life=new Float32Array(capacity);this.maxLife=new Float32Array(capacity);
    this.base=new Float32Array(capacity*4);this.gravity=new Float32Array(capacity);this.drag=new Float32Array(capacity);this.grow=new Float32Array(capacity);
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.BufferAttribute(this.pos,3));
    geometry.setAttribute('tint',new THREE.BufferAttribute(this.tint,4));
    geometry.setAttribute('size',new THREE.BufferAttribute(this.size,1));
    this.material=new THREE.ShaderMaterial({vertexShader:VERT,fragmentShader:FRAG,transparent:true,depthWrite:false,
      blending:THREE.AdditiveBlending,uniforms:{map:{value:glowTexture()},scale:{value:600}}});
    this.points=new THREE.Points(geometry,this.material);this.points.frustumCulled=false;this.points.renderOrder=5;
    scene.add(this.points);this.geometry=geometry;
  }
  setViewport(height){this.material.uniforms.scale.value=height*.9;}
  emit(x,y,z,vx,vy,vz,color,size,life,gravity=0,drag=1.5,grow=0){
    const i=this.cursor;this.cursor=(this.cursor+1)%this.capacity;
    this.pos.set([x,y,z],i*3);this.vel.set([vx,vy,vz],i*3);this.base.set([color.r,color.g,color.b,1],i*4);
    this.size[i]=size;this.life[i]=life;this.maxLife[i]=life;this.gravity[i]=gravity;this.drag[i]=drag;this.grow[i]=grow;
  }
  burst(origin,count,{speed=3,up=1.5,colors,size=.09,life=.7,gravity=6,spread=1,drag=1.2}){
    for(let i=0;i<count;i++){
      const a=Math.random()*Math.PI*2,b=Math.acos(2*Math.random()-1),s=speed*(.35+Math.random()*.65);
      this.emit(origin.x,origin.y,origin.z,Math.sin(b)*Math.cos(a)*s*spread,Math.abs(Math.cos(b))*s+up*Math.random(),Math.sin(b)*Math.sin(a)*s*spread,
        colors[i%colors.length],size*(.6+Math.random()*.8),life*(.6+Math.random()*.6),gravity,drag);
    }
  }
  update(dt){
    const {pos,vel,tint,base,life,maxLife,gravity,drag,size,grow}=this;
    for(let i=0;i<this.capacity;i++){
      if(life[i]<=0){if(tint[i*4+3]!==0)tint[i*4+3]=0;continue;}
      life[i]-=dt;const k=Math.max(0,life[i]/maxLife[i]),damp=Math.exp(-drag[i]*dt);
      vel[i*3]*=damp;vel[i*3+1]=vel[i*3+1]*damp-gravity[i]*dt;vel[i*3+2]*=damp;
      pos[i*3]+=vel[i*3]*dt;pos[i*3+1]+=vel[i*3+1]*dt;pos[i*3+2]+=vel[i*3+2]*dt;
      if(pos[i*3+1]<.01&&gravity[i]>0){pos[i*3+1]=.01;vel[i*3+1]*=-.35;}
      size[i]+=grow[i]*dt;
      tint[i*4]=base[i*4];tint[i*4+1]=base[i*4+1];tint[i*4+2]=base[i*4+2];tint[i*4+3]=k*k*(3-2*k);
    }
    this.geometry.attributes.position.needsUpdate=true;this.geometry.attributes.tint.needsUpdate=true;this.geometry.attributes.size.needsUpdate=true;
  }
  clear(){this.life.fill(0);}
}

export class Confetti{
  constructor(scene,count=420){
    this.count=count;this.items=Array.from({length:count},()=>({life:0,p:new THREE.Vector3(),v:new THREE.Vector3(),r:new THREE.Euler(),w:new THREE.Vector3()}));
    const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide,toneMapped:false});
    this.mesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(.06,.032),material,count);
    this.mesh.frustumCulled=false;this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.matrix=new THREE.Matrix4();this.quat=new THREE.Quaternion();this.hidden=new THREE.Matrix4().makeScale(0,0,0);
    const color=new THREE.Color();
    for(let i=0;i<count;i++){this.mesh.setMatrixAt(i,this.hidden);this.mesh.setColorAt(i,color.setHSL(i*.137%1,.95,.6));}
    scene.add(this.mesh);this.next=0;
  }
  shoot(origin,direction,amount,power=5){
    for(let n=0;n<amount;n++){
      const item=this.items[this.next];this.next=(this.next+1)%this.count;
      item.life=2.6+Math.random()*1.6;item.p.copy(origin);
      item.v.set(direction.x*power+(Math.random()-.5)*2.6,direction.y*power+Math.random()*2.6,direction.z*power+(Math.random()-.5)*2.6);
      item.r.set(Math.random()*6,Math.random()*6,Math.random()*6);item.w.set((Math.random()-.5)*14,(Math.random()-.5)*14,(Math.random()-.5)*14);
    }
  }
  update(dt){
    let dirty=false;
    this.items.forEach((item,i)=>{
      if(item.life<=0)return;
      item.life-=dt;dirty=true;
      if(item.life<=0){this.mesh.setMatrixAt(i,this.hidden);return;}
      item.v.multiplyScalar(Math.exp(-1.6*dt));item.v.y-=3.2*dt;
      item.v.x+=Math.sin(item.life*7+i)*dt*1.4;item.p.addScaledVector(item.v,dt);
      if(item.p.y<.02){item.p.y=.02;item.v.set(0,0,0);item.w.set(0,0,0);}
      item.r.x+=item.w.x*dt;item.r.y+=item.w.y*dt;item.r.z+=item.w.z*dt;
      const fade=Math.min(1,item.life*2);
      this.matrix.compose(item.p,this.quat.setFromEuler(item.r),new THREE.Vector3(fade,fade,fade));
      this.mesh.setMatrixAt(i,this.matrix);
    });
    if(dirty)this.mesh.instanceMatrix.needsUpdate=true;
  }
  clear(){this.items.forEach((item,i)=>{item.life=0;this.mesh.setMatrixAt(i,this.hidden);});this.mesh.instanceMatrix.needsUpdate=true;}
}

export class Shockwaves{
  constructor(scene){
    this.rings=Array.from({length:4},()=>{
      const mesh=new THREE.Mesh(new THREE.RingGeometry(.72,1,48),new THREE.MeshBasicMaterial({color:'#fff',transparent:true,opacity:0,
        blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));
      mesh.rotation.x=-Math.PI/2;mesh.visible=false;scene.add(mesh);return {mesh,life:0,max:1,reach:1};
    });
    this.next=0;
  }
  fire(position,color,reach=1.6,life=.55){
    const ring=this.rings[this.next];this.next=(this.next+1)%this.rings.length;
    ring.mesh.position.set(position.x,.02,position.z);ring.mesh.material.color.set(color);ring.life=ring.max=life;ring.reach=reach;ring.mesh.visible=true;
  }
  update(dt){
    for(const ring of this.rings){
      if(ring.life<=0)continue;
      ring.life-=dt;const k=1-Math.max(0,ring.life/ring.max);
      ring.mesh.scale.setScalar(.08+ring.reach*(1-Math.pow(1-k,3)));ring.mesh.material.opacity=(1-k)*.9;
      if(ring.life<=0)ring.mesh.visible=false;
    }
  }
}
