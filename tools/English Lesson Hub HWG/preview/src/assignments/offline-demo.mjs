// Synthetic, local-only downloadable preview. Never used by the formal /lab route.
import {newBlock,copy} from '../live/domain.mjs';
import {spellDefinition} from '../live/spelling.mjs';
import {createAssignment,newAssignmentRun,assignmentSnapshot,currentBlock,applyAttempt,advanceAssignment,feedbackFor,checkRevision} from './assignment-domain.mjs';
const KEY='forest-of-words-offline-heroes-v2';
export function offlineDemoAPI(){
 const read=()=>{const value=localStorage.getItem(KEY);return value?JSON.parse(value):null;},save=state=>localStorage.setItem(KEY,JSON.stringify(state));
 return {exists:()=>!!read(),create(settings){const words=['Chinese','English','social studies','water','friend','teacher'],blocks=Array.from({length:36},(_,i)=>{const word=words[Math.floor(i/6)];return i%3===1?{...newBlock('spell'),title:`Spell the word: ${word}`,points:i<28?3:2,...spellDefinition(word,'ae')}:{...newBlock('choice'),title:`Choose the word: ${word}`,options:[word,'moon','bird'],answer:[0],points:i<28?3:2};});const a=createAssignment({id:'offline-synthetic',title:'Synthetic English demo',blocks},{title:'六關英語冒險・本機體驗',mode:settings.mode,questionOrder:settings.questionOrder,optionOrder:settings.optionOrder,game:'survivors',gameVersion:2,dueAt:Date.now()+364*86400000},'offline-preview','990015');save({a,r:null,attempts:{}});},
 async api(action,code,payload={}){const state=read();if(!state)throw Error('請先建立本機體驗。');const {a}=state;let r=state.r;if(action==='assignmentInfo')return {assignment:assignmentSnapshot(a,null).assignment,expired:false};if(action==='assignmentJoin'){r=state.r||newAssignmentRun(a,payload.studentId,'offline-student',crypto.randomUUID(),Date.now(),payload.roleId||'mage');state.r=r;save(state);return assignmentSnapshot(a,r);}
 if(!r)throw Error('請先輸入學號加入分配。');
 if(action==='assignmentSnapshot'){const id=currentBlock(a,r)?.id,last=id?r.records[id]?.lastAttemptId:null;return assignmentSnapshot(a,r,last?state.attempts[last]:null);}
 if(action==='assignmentSubmit'){let attempt=state.attempts[payload.attemptId];if(!attempt){checkRevision(r,payload.revision);const b=currentBlock(a,r);if(!b||b.id!==payload.blockId)throw Error('題目進度不符。');attempt=applyAttempt(a,r,b,payload.answer,payload.attemptId);state.attempts[payload.attemptId]=attempt;save(state);}return {...assignmentSnapshot(a,r,attempt),feedback:feedbackFor(a,r,attempt),saved:true};}
 if(action==='assignmentAdvance'){advanceAssignment(a,r,payload.revision);save(state);return assignmentSnapshot(a,r);}
 if(action==='assignmentCheckpoint'){if(r.index!==payload.index)throw Error('關卡進度不符。');r.game=copy(payload.game);save(state);return {saved:true};}
 throw Error('本機體驗不提供教師後台或正式成績。');}
 };
}
