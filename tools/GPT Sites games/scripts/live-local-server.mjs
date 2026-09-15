// Local-only adapter for the exact same service used by the production Function.
import http from 'node:http';
import {initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {getStorage} from 'firebase-admin/storage';
import {createActivityService} from '../functions/unscramble-service.mjs';
import {ActivityError} from '../functions/unscramble-model.mjs';
if(process.env.GCLOUD_PROJECT!=='demo-classroom-games'||process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8186'||process.env.FIREBASE_STORAGE_EMULATOR_HOST!=='127.0.0.1:9296')throw new Error('Only the designated local demo emulators are allowed.');
initializeApp({projectId:'demo-classroom-games',storageBucket:'demo-classroom-games.appspot.com'});
const service=createActivityService({db:getFirestore(),bucket:getStorage().bucket(),verifyTeacher:async auth=>{if(auth!=='Bearer local-teacher')throw new ActivityError('Teacher required.',401);}});
http.createServer(async(req,res)=>{
 res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');
 if(req.url!=='/api/live-activity'||req.method!=='POST'){res.writeHead(404);return res.end('{}');}
 let raw='',size=0;try{for await(const chunk of req){size+=chunk.length;if(size>9*1024*1024)throw new ActivityError('Request too large.',413);raw+=chunk;}
 const data=await service(JSON.parse(raw),req.headers.authorization);res.end(JSON.stringify(data));
 }catch(e){res.writeHead(e instanceof ActivityError?e.status:503);res.end(JSON.stringify({message:e instanceof ActivityError?e.message:'Local service unavailable. Please retry.'}));if(!(e instanceof ActivityError))console.error('Local activity failure:',e.code||e.name);}
}).listen(5185,'127.0.0.1',()=>console.log('Local activity API ready: http://127.0.0.1:5185 (emulators only)'));
