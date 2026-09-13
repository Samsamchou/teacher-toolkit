import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {setDoc,doc,getDoc,updateDoc,deleteDoc,serverTimestamp,Timestamp,writeBatch} from 'firebase/firestore';
const env=await initializeTestEnvironment({projectId:'demo-song-quiz',firestore:{host:'127.0.0.1',port:8188}});
const anon=env.authenticatedContext('student',{firebase:{sign_in_provider:'anonymous'}}).firestore(),teacher=env.authenticatedContext('teacher',{email:'teacher@example.com',firebase:{sign_in_provider:'password'}}).firestore(),other=env.authenticatedContext('other',{email:'other@example.com',firebase:{sign_in_provider:'password'}}).firestore(),guest=env.unauthenticatedContext().firestore();let count=0;
const expiry=Timestamp.fromMillis(Date.now()+400*86400000);
const p={schemaVersion:4,sessionId:'session',revision:1,ownerUid:'student',quizId:'test',quizTitle:'test',studentId:'001',score:6.25,correctCount:1,wrongCount:1,answeredCount:2,unansweredCount:14,totalQuestions:16,wrongSentences:'2. Test sentence',retryDetails:'1. Test\n第一次選錯：A. old → 第二次答對：B. new',retryDetailsRecorded:true,status:'ended_early',startedAt:new Date().toISOString(),recordedAt:new Date().toISOString(),expiresAt:expiry,submittedAt:serverTimestamp()};
try{
 await assertSucceeds(setDoc(doc(anon,'quizResults','valid'),p));count++;
 await assertSucceeds(getDoc(doc(teacher,'quizResults','valid')));count++;
 for(const db of [anon,other,guest]){await assertFails(getDoc(doc(db,'quizResults','valid')));count++;}
 for(const db of [teacher,other,guest]){await assertFails(setDoc(doc(db,'quizResults','bad-'+count),p));count++;}
 for(const db of [anon,teacher]){await assertFails(updateDoc(doc(db,'quizResults','valid'),{score:100}));count++;await assertFails(deleteDoc(doc(db,'quizResults','valid')));count++;}
 for(const patch of [{score:100},{correctCount:-1},{wrongCount:-1},{unansweredCount:0},{status:'completed'},{wrongSentences:''},{ownerUid:'other'},{extra:1},{submittedAt:new Date(0)},{totalQuestions:0},{schemaVersion:2},{schemaVersion:3},{expiresAt:Timestamp.fromMillis(0)},{expiresAt:Timestamp.fromMillis(Date.now()+500*86400000)},{retryDetailsRecorded:false},{retryDetails:123}]){await assertFails(setDoc(doc(anon,'quizResults','invalid-'+count),{...p,...patch}));count++;}
 for(let n=1;n<=16;n++)for(let c=0;c<=n;c++){await assertSucceeds(setDoc(doc(anon,'quizResults',`n${n}-c${c}`),{...p,totalQuestions:n,correctCount:c,wrongCount:0,answeredCount:c,unansweredCount:n-c,wrongSentences:'',retryDetails:'',score:Math.round(c*10000/n)/100}));count++;}
 await assertSucceeds(setDoc(doc(anon,'quizResults','other-practice'),{...p,sessionId:'keep'}));count++;
 const marker={deletedAt:serverTimestamp(),expiresAt:expiry};
 for(const db of [anon,other,guest]){await assertFails(setDoc(doc(db,'quizDeletedSessions','student_session'),marker));count++;}
 await assertSucceeds(setDoc(doc(teacher,'quizDeletedSessions','student_session'),marker));count++;
 await assertSucceeds(getDoc(doc(anon,'quizDeletedSessions','student_session')));count++;
 await assertFails(getDoc(doc(other,'quizDeletedSessions','student_session')));count++;
 await assertFails(setDoc(doc(anon,'quizResults','replayed'),{...p,revision:99}));count++;
 await assertFails(deleteDoc(doc(anon,'quizResults','valid')));count++;
 await assertSucceeds(deleteDoc(doc(teacher,'quizResults','valid')));count++;
 await assertFails(deleteDoc(doc(teacher,'quizResults','other-practice')));count++;
 await assertSucceeds(getDoc(doc(teacher,'quizResults','other-practice')));count++;
 await assertFails(deleteDoc(doc(teacher,'quizDeletedSessions','student_session')));count++;
 await env.withSecurityRulesDisabled(async ctx=>{await setDoc(doc(ctx.firestore(),'quizResults','legacy'),{quizId:'old',studentId:'001',score:0});});
 await assertSucceeds(setDoc(doc(teacher,'quizDeletedSessions','legacy_legacy'),marker));count++;
 await assertSucceeds(deleteDoc(doc(teacher,'quizResults','legacy')));count++;
 console.log(`PASS ${count} rules assertions including teacher single-practice delete, other sessions preserved, anonymous denial, replay rejection, expired records, legacy delete`);
}finally{await env.cleanup();}
