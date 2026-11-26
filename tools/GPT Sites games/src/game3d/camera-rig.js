// Camera helper shared by the 3D game directors: smoothed position/target, zoom and impact shake,
// plus the small "fire once" and "tell the game" helpers every show timeline needs.
import * as THREE from 'three';

export class CameraRig{
  constructor(stage){
    this.stage=stage;this.active=null;
    this.camPos=new THREE.Vector3(0,1.3,3);this.camLook=new THREE.Vector3(0,.2,-4);this.fov=48;this.shake=0;
    this.wantPos=new THREE.Vector3();this.wantLook=new THREE.Vector3();this.tmp=new THREE.Vector3();
  }
  applyCamera(){
    const camera=this.stage.camera;camera.position.copy(this.camPos);
    if(this.shake>.0005)camera.position.add(this.tmp.set((Math.random()-.5),(Math.random()-.5),(Math.random()-.5)).multiplyScalar(this.shake));
    camera.lookAt(this.camLook);
    if(Math.abs(camera.fov-this.fov)>.01){camera.fov=this.fov;camera.updateProjectionMatrix();}
  }
  /** Moves the camera toward wantPos/wantLook; snap jumps there at once (a cut). */
  follow(dt,rate,snap=false){
    const k=snap?1:1-Math.exp(-rate*dt);
    this.camPos.lerp(this.wantPos,k);this.camLook.lerp(this.wantLook,k);
  }
  /** Sends a cue (label, impact, replayStart…) to the game through the running show's options.onCue. */
  cue(name,data){this.active?.options.onCue?.(name,data);}
  /** Runs fn the first time it is asked for `key` during the running show. */
  once(key,fn){const a=this.active;if(a.fired.has(key))return;a.fired.add(key);fn();}
}
