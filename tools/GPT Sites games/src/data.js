import { openDB } from 'idb';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signOut, onAuthStateChanged, browserSessionPersistence, setPersistence } from 'firebase/auth';
import { getFirestore, collection, getDocs, setDoc, deleteDoc, doc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getBlob, deleteObject } from 'firebase/storage';
import { DEFAULT_GAME, validateImage, MAX_IMAGE_BYTES } from './model.mjs';
export const DEMO = import.meta.env.DEV && import.meta.env.MODE === 'demo';
const OWNER = 'classroom-owner';
let app, auth, db, storage;
const local = DEMO ? openDB('classroom-club-preview-v1', 1, { upgrade(d) { for (const name of ['images','lessons','games']) d.createObjectStore(name, { keyPath: 'id' }); } }) : null;
export async function initializeSession(onUser) {
  if (DEMO) { onUser({ uid: 'local-preview' }); return () => {}; }
  const res = await fetch('/__/firebase/init.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('The private classroom is not connected yet. Please finish the Firebase setup.');
  let config; try { config = await res.json(); } catch { throw new Error('Firebase setup is required before signing in.'); }
  if (config.projectId !== 'gamesinclass-5d9d1') throw new Error('This site is connected to an unexpected project.');
  app = initializeApp(config); auth = getAuth(app); db = getFirestore(app); storage = getStorage(app);
  await setPersistence(auth, browserSessionPersistence);
  return onAuthStateChanged(auth, async user => {
    if (!user) return onUser(null);
    try {
      const token = await user.getIdTokenResult();
      if (user.uid !== OWNER || token.claims.classroomTeacher !== true || Date.now()/1000-Number(token.claims.auth_time) >= 28800) { await signOut(auth); return; }
      onUser(user);
    } catch { onUser(null); }
  });
}
export async function login(pin) {
  const r = await fetch('/api/teacher-login', { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ pin }) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.message || 'Could not sign in. Please try again shortly.');
  await signInWithCustomToken(auth, data.token);
}
export async function logout() { if (!DEMO) await signOut(auth); }
const cloudCollection = type => collection(db, 'teachers', OWNER, type);
export async function list(type) {
  if (DEMO) return (await local).getAll(type);
  const snapshot = await getDocs(cloudCollection(type)); return snapshot.docs.map(d => d.data());
}
export async function put(type, record) {
  if (DEMO) { await (await local).put(type, record); return; }
  await setDoc(doc(cloudCollection(type), record.id), record);
}
export async function remove(type, id) {
  if (type === 'images' && !DEMO) await deleteObject(ref(storage, `teachers/${OWNER}/images/${id}`));
  if (DEMO) await (await local).delete(type, id); else await deleteDoc(doc(cloudCollection(type), id));
}
export async function readImage(record) {
  if (DEMO) { const item = await (await local).get('images', record.id); if (!item?.blob) throw new Error('An image is missing. Restore it from a backup.'); return item.blob; }
  return getBlob(ref(storage, record.path), MAX_IMAGE_BYTES);
}
export async function addImage(file) {
  validateImage(file);
  const bitmap = await createImageBitmap(file);
  const width = bitmap.width, height = bitmap.height; bitmap.close();
  if (width * height > 40000000) throw new Error(`${file.name}: please resize images larger than 40 megapixels.`);
  const id = crypto.randomUUID();
  const record = { id, name: file.name.slice(0,180), type: file.type, size: file.size, width, height, createdAt: Date.now(), path: `teachers/${OWNER}/images/${id}` };
  if (DEMO) await put('images', { ...record, blob: file });
  else {
    await uploadBytes(ref(storage, record.path), file, { contentType: file.type, cacheControl: 'private, max-age=0' });
    try { await put('images', record); } catch (e) { await deleteObject(ref(storage, record.path)).catch(()=>{}); throw e; }
  }
  return record;
}
export async function seedDemo() {
  if (!DEMO || (await list('images')).length || localStorage.getItem('club-seeded')) return;
  const fixtures = [ ['Sunny shapes','#f2c45b',960,640], ['Ocean circles','#80bfc9',640,960], ['Little garden','#a6bd88',800,800], ['A blue day','#96b9e0',960,640], ['Warm & bright','#eaaa8c',960,640], ['Color stories','#bda9d2',800,800] ];
  for (const [name,color,w,h] of fixtures) {
    const c = document.createElement('canvas'); c.width=w;c.height=h; const ctx=c.getContext('2d');
    ctx.fillStyle=color;ctx.fillRect(0,0,w,h);ctx.fillStyle='#fff7e3';ctx.beginPath();ctx.arc(w*.5,h*.42,Math.min(w,h)*.23,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#234439';ctx.font=`600 ${Math.min(w,h)*.06}px sans-serif`;ctx.textAlign='center';ctx.fillText(name,w*.5,h*.8);
    const blob=await new Promise(r=>c.toBlob(r,'image/png'));await addImage(new File([blob],name+'.png',{type:'image/png'}));
  }
  await put('games', DEFAULT_GAME);localStorage.setItem('club-seeded','1');
}
export async function saveGameOrders(games) { for (let i=0;i<games.length;i++) await put('games',{...games[i],order:i}); }
