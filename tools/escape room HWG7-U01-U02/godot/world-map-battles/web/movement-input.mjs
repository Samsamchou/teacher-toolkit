// Track every pointer independently; releasing one finger never clears another.
export function createMovement(){
 const keys=new Set(),pointers=new Map();
 function vector(){const values=new Set([...keys,...pointers.values()]);return {x:Number(values.has('d')||values.has('arrowright'))-Number(values.has('a')||values.has('arrowleft')),y:Number(values.has('s')||values.has('arrowdown'))-Number(values.has('w')||values.has('arrowup')),dash:values.has('shift')};}
 return {vector,key(k,down){if(down)keys.add(k);else keys.delete(k);return vector();},press(id,k){pointers.set(id,k);return vector();},release(id){pointers.delete(id);return vector();},clear(){keys.clear();pointers.clear();return vector();}};
}
export function controlKey(e){const physical={KeyA:'a',KeyD:'d',KeyW:'w',KeyS:'s',KeyE:'e',Space:' ',ShiftLeft:'shift',ShiftRight:'shift'};return physical[e.code]||String(e.key||e.code||'').toLowerCase();}
