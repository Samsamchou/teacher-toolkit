import {initializeTestEnvironment,assertSucceeds,assertFails} from '@firebase/rules-unit-testing';
import {setDoc,doc,getDoc,updateDoc,deleteDoc,serverTimestamp} from 'firebase/firestore';
const env=await initializeTestEnvironment({projectId:'demo-song-quiz',firestore:{host:'127.0.0.1',port:8188}});
const anon=env.authenticatedContext('student',{firebase:{sign_in_provider:'anonymous'}}).firestore();
const teacher=env.authenticatedContext('teacher',{email:'teacher@example.com',firebase:{sign_in_provider:'password'}}).firestore();
const other=env.authenticatedContext('other',{email:'other@example.com',firebase:{sign_in_provider:'password'}}).firestore();
const guest=env.unauthenticatedContext().firestore();let count=0;
const p={schemaVersion:2,sessionId:'session',revision:1,ownerUid:'student',quizId:'test',quizTitle:'test',studentId:'001',score:6.67,correctCount:1,wrongCount:1,answeredCount:2,unansweredCount:13,totalQuestions:15,wrongSentences:'2. Test sentence',status:'ended_early',recordedAt:new Date().toISOString(),submittedAt:serverTimestamp()};
try{await assertSucceeds(setDoc(doc(anon,'quizResults','valid'),p));count++;await assertSucceeds(getDoc(doc(teacher,'quizResults','valid')));count++;
for(const db of [anon,other,guest]){await assertFails(getDoc(doc(db,'quizResults','valid')));count++;}
for(const db of [teacher,other,guest]){await assertFails(setDoc(doc(db,'quizResults','bad-'+count),p));count++;}
for(const db of [anon,teacher]){await assertFails(updateDoc(doc(db,'quizResults','valid'),{score:100}));count++;await assertFails(deleteDoc(doc(db,'quizResults','valid')));count++;}
for(const patch of [{score:100},{correctCount:-1},{wrongCount:-1},{unansweredCount:0},{status:'completed'},{wrongSentences:''},{ownerUid:'other'},{extra:1},{submittedAt:new Date(0)},{totalQuestions:0}]){await assertFails(setDoc(doc(anon,'quizResults','invalid-'+count),{...p,...patch}));count++;}
for(let n=1;n<=15;n++){for(let c=0;c<=n;c++){await assertSucceeds(setDoc(doc(anon,'quizResults',`n${n}-c${c}`),{...p,totalQuestions:n,correctCount:c,wrongCount:0,answeredCount:c,unansweredCount:n-c,wrongSentences:'',score:Math.round(c*10000/n)/100}));count++;}}
console.log(`PASS ${count} Firestore assertions`);
}finally{await env.cleanup();}
