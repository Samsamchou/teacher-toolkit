// Base for the 3D game stages: renderer, tone mapping, reflections, glow and the frame-rate safety valve.
import * as THREE from 'three';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';

export class Stage3D{
  constructor(canvas,{quality='high',fog='#000000',fogNear=16,fogFar=34,fov=48}={}){
    this.quality=quality;this.time=0;
    const renderer=this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.92;
    renderer.shadowMap.enabled=quality==='high';renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    const scene=this.scene=new THREE.Scene();
    scene.background=new THREE.Color(fog);scene.fog=new THREE.Fog(fog,fogNear,fogFar);
    const pmrem=new THREE.PMREMGenerator(renderer);
    scene.environment=pmrem.fromScene(new RoomEnvironment(),.04).texture;scene.environmentIntensity=.35;pmrem.dispose();
    this.camera=new THREE.PerspectiveCamera(fov,16/9,.05,60);
  }
  /** Adds the glow pass. Call once the scene has been built. */
  addGlow(){
    if(this.quality!=='high')return;
    this.composer=new EffectComposer(this.renderer);this.composer.addPass(new RenderPass(this.scene,this.camera));
    this.bloom=new UnrealBloomPass(new THREE.Vector2(1280,720),.28,.5,.92);this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
  }
  mesh(geometry,material,x=0,y=0,z=0,shadow=false){
    const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.receiveShadow=shadow;this.scene.add(mesh);return mesh;
  }
  // The drawing buffer is capped (about 1500×850 in high quality) so a full-HD projector on integrated
  // graphics still reaches 60 fps; CSS scales the canvas up to the screen.
  resize(width,height,pixelRatio=Math.min(globalThis.devicePixelRatio||1,2,Math.sqrt((this.quality==='high'?1.3e6:8e5)/(width*height)))){
    this.viewport=[width,height];
    this.renderer.setPixelRatio(pixelRatio);this.renderer.setSize(width,height,false);
    this.camera.aspect=width/height;this.camera.updateProjectionMatrix();
    this.composer?.setPixelRatio(pixelRatio);this.composer?.setSize(width,height);this.sparks?.setViewport(height*pixelRatio);
  }
  /** Drops glow, shadows and resolution when a device cannot keep up. */
  degrade(){
    if(this.quality==='low')return;
    this.quality='low';this.composer=null;this.bloom=null;this.renderer.shadowMap.enabled=false;if(this.key)this.key.castShadow=false;
    if(this.viewport)this.resize(...this.viewport);
  }
  render(){if(this.composer)this.composer.render();else this.renderer.render(this.scene,this.camera);}
  dispose(){
    this.scene.traverse(object=>{object.geometry?.dispose?.();const m=object.material;if(m){m.map?.dispose?.();m.dispose?.();}});
    this.scene.environment?.dispose?.();this.composer?.dispose?.();this.renderer.dispose();
  }
}
