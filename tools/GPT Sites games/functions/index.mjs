import {onRequest} from 'firebase-functions/v2/https';
import {defineSecret} from 'firebase-functions/params';
import {initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
import {createHmac} from 'node:crypto';
import {verifyPin,nextLimit} from './pin.mjs';
initializeApp();
const teacherPin=defineSecret('CLASSROOM_TEACHER_PIN');
export const teacherLogin=onRequest({region:'asia-east1',secrets:[teacherPin],maxInstances:2,concurrency:10,timeoutSeconds:20,memory:'256MiB',cors:false},async(req,res)=>{
  res.set('Cache-Control','no-store');res.set('X-Content-Type-Options','nosniff');
  if(req.method!=='POST')return res.status(405).json({message:'Please use the teacher sign-in page.'});
  const origins=['https://gamesinclass-5d9d1.web.app','https://gamesinclass-5d9d1.firebaseapp.com'];
  if(req.headers.origin&&!origins.includes(req.headers.origin))return res.status(403).json({message:'Please open your classroom website to sign in.'});
  if(!req.is('application/json')||typeof req.body?.pin!=='string'||!/^\d{6}$/.test(req.body.pin))return res.status(400).json({message:'Enter your 6-digit passcode.'});
  try{
    const secret=teacherPin.value(),now=Date.now(),db=getFirestore();
    // Store no raw IP, passcode or request body. Global limits also bound attacks that rotate IPs.
    const ipHash=createHmac('sha256',secret).update(req.ip||'unknown').digest('hex');
    const checks=[['global-short',15*60*1000,30],['global-day',24*60*60*1000,150],[`ip-${ipHash}`,15*60*1000,5]];
    const allowed=await db.runTransaction(async tx=>{
      const refs=checks.map(([id])=>db.doc(`loginLimits/${id}`));const snapshots=await tx.getAll(...refs);
      const results=checks.map(([,window,limit],i)=>nextLimit(snapshots[i].exists?snapshots[i].data():null,now,window,limit));
      if(results.some(r=>!r.allowed))return false;
      results.forEach((r,i)=>tx.set(refs[i],{...r.next,expiresAt:new Date(now+48*60*60*1000)}));return true;
    });
    if(!allowed)return res.status(429).json({message:'Too many sign-in attempts. Please wait before trying again.'});
    if(!await verifyPin(req.body.pin,secret))return res.status(401).json({message:'That passcode did not match. Please try again.'});
    const token=await getAuth().createCustomToken('classroom-owner',{classroomTeacher:true});
    return res.status(200).json({token});
  }catch{
    // Never log the exception: upstream request context may contain credentials.
    return res.status(503).json({message:'Teacher sign-in is not ready. Please check the private classroom setup.'});
  }
});
