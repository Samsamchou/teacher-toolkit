'use strict';
const {initializeApp}=require('firebase-admin/app');const {getFirestore}=require('firebase-admin/firestore');const {onSchedule}=require('firebase-functions/v2/scheduler');const {runCleanup}=require('./retention-engine.cjs');
initializeApp();
exports.purgeExpiredQuizResults=onSchedule({schedule:'0 4 * * *',timeZone:'Asia/Taipei',region:'asia-east1',timeoutSeconds:540,memory:'512MiB',maxInstances:1,retryCount:3},async()=>{const summary=await runCleanup(getFirestore());console.log(JSON.stringify(summary));});
