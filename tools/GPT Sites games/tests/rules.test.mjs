import {test,before,after} from 'node:test';
import {readFile} from 'node:fs/promises';
import {initializeTestEnvironment,assertFails,assertSucceeds} from '@firebase/rules-unit-testing';
import {doc,setDoc,getDoc,collection,getDocs} from 'firebase/firestore';
import {ref,uploadBytes,getBytes} from 'firebase/storage';
let env;const owner='classroom-owner',storageFixture='fixture-'+Date.now();
const valid={classroomTeacher:true,auth_time:Math.floor(Date.now()/1000),firebase:{sign_in_provider:'custom'}};
before(async()=>{env=await initializeTestEnvironment({projectId:'demo-classroom-games',firestore:{host:'127.0.0.1',port:8186,rules:await readFile(new URL('../firestore.rules',import.meta.url),'utf8')},storage:{host:'127.0.0.1',port:9296,rules:await readFile(new URL('../storage.rules',import.meta.url),'utf8')}});});
after(async()=>env?.cleanup());
test('live activity documents and private activity pictures cannot be read or changed directly by clients',async()=>{for(const c of [env.unauthenticatedContext(),env.authenticatedContext(owner,valid),env.authenticatedContext('student',{})]){for(const path of ['liveRooms/test','liveDecks/test']){await assertFails(getDoc(doc(c.firestore(),path)));await assertFails(setDoc(doc(c.firestore(),path),{phase:'open'}));}await assertFails(uploadBytes(ref(c.storage(),'live-images/test'),new Uint8Array([1,2]),{contentType:'image/png'}));}});
test('signed-in passcode session can save and read a lesson',async()=>{const db=env.authenticatedContext(owner,valid).firestore();const d=doc(db,`teachers/${owner}/lessons/test`);await assertSucceeds(setDoc(d,{id:'test',name:'Test',gameId:'scratch',imageIds:[],updatedAt:1}));await assertSucceeds(getDoc(d));});
test('anonymous, wrong account, expired session and missing claims cannot read or list',async()=>{const contexts=[env.unauthenticatedContext(),env.authenticatedContext('other',valid),env.authenticatedContext(owner,{}),env.authenticatedContext(owner,{...valid,auth_time:1}),env.authenticatedContext(owner,{...valid,firebase:{sign_in_provider:'google.com'}})];for(const c of contexts){await assertFails(getDoc(doc(c.firestore(),`teachers/${owner}/lessons/test`)));await assertFails(getDocs(collection(c.firestore(),`teachers/${owner}/images`)));}});
test('client cannot edit login throttle or another owner namespace',async()=>{const db=env.authenticatedContext(owner,valid).firestore();await assertFails(setDoc(doc(db,'loginLimits/global-short'),{count:0}));await assertFails(setDoc(doc(db,'teachers/other/lessons/a'),{id:'a',name:'x',gameId:'scratch',imageIds:[],updatedAt:1}));});
test('image records must point to the private owner path',async()=>{const db=env.authenticatedContext(owner,valid).firestore();await assertFails(setDoc(doc(db,`teachers/${owner}/images/x`),{id:'x',name:'x',path:'public/x',size:10,type:'image/png',width:1,height:1,createdAt:1}));});
test('storage admits teacher images but rejects anonymous reads and SVG uploads',async()=>{const c=env.authenticatedContext(owner,valid);const file=ref(c.storage(),`teachers/${owner}/images/${storageFixture}`);await assertSucceeds(uploadBytes(file,new Uint8Array([137,80,78,71]),{contentType:'image/png'}));await assertSucceeds(getBytes(file));await assertFails(getBytes(ref(env.unauthenticatedContext().storage(),`teachers/${owner}/images/${storageFixture}`)));await assertFails(uploadBytes(ref(c.storage(),`teachers/${owner}/images/svg`),new Uint8Array([1]),{contentType:'image/svg+xml'}));});
test('existing storage objects cannot be overwritten',async()=>{const s=env.authenticatedContext(owner,valid).storage();await assertFails(uploadBytes(ref(s,`teachers/${owner}/images/${storageFixture}`),new Uint8Array([1,2]),{contentType:'image/png'}));});

 test('optimized pictures, thumbnails and original backups remain private even for direct teacher clients',async()=>{
  const paths=['live-images/qa-private','live-thumbnails/qa-private','live-image-backups/qa-private'];
  await env.withSecurityRulesDisabled(async c=>{for(const path of paths)await uploadBytes(ref(c.storage(),path),new Uint8Array([1,2,3]),{contentType:'image/png'});await setDoc(doc(c.firestore(),'liveDeckImageBackups/qa-private'),{deck:{name:'Private'}});});
  for(const c of [env.unauthenticatedContext(),env.authenticatedContext(owner,valid),env.authenticatedContext('student',{})]){
   for(const path of paths){await assertFails(getBytes(ref(c.storage(),path)));await assertFails(uploadBytes(ref(c.storage(),path),new Uint8Array([2]),{contentType:'image/png'}));}
   await assertFails(getDoc(doc(c.firestore(),'liveDeckImageBackups/qa-private')));
  }
 });
