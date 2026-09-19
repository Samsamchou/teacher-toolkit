export class ActivityError extends Error { constructor(message,status=400,code='INVALID_REQUEST'){super(message);this.status=status;this.code=code;} }
export const requireValue=(condition,message,status=400,code='INVALID_REQUEST')=>{if(!condition)throw new ActivityError(message,status,code);};
export const normalize=text=>String(text).replace(/[’‘]/g,"'").trim().replace(/\s+/g,' ');
export const words=text=>normalize(text).split(' ').filter(Boolean);
export function members(value){
 requireValue(typeof value==='string' && /^[0-9\s]+$/.test(value),'Enter student numbers separated by spaces.');
 const ids=value.trim().split(/\s+/);requireValue(ids.length>0&&ids[0],'Enter your student numbers.');
 requireValue(new Set(ids).size===ids.length,'A student number is repeated.');return ids;
}
export const memberKey=value=>[...value].sort().join('\u0000');
export const sameMembers=(left,right)=>Array.isArray(left)&&Array.isArray(right)&&memberKey(left)===memberKey(right);
export function validateDeck(input){
 requireValue(typeof input?.name==='string'&&input.name.trim()&&input.name.length<=150,'Give the question set a name (up to 150 characters).');
 requireValue(Array.isArray(input.questions)&&input.questions.length>0&&input.questions.length<=50,'Use 1–50 questions.');
 return {name:input.name.trim(),questions:input.questions.map((q,i)=>{
  requireValue(typeof q.prompt==='string'&&typeof q.answer==='string'&&q.prompt.trim()&&q.answer.trim(),`Question ${i+1}: enter both sentences.`);
  requireValue(q.prompt.length+q.answer.length<=600,`Question ${i+1}: sentences are too long.`);
  requireValue(typeof q.imageId==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(q.imageId),`Question ${i+1}: add a picture.`);
  return {prompt:normalize(q.prompt),answer:normalize(q.answer),imageId:q.imageId};
 })};
}
export function evaluate(question,lines){
 requireValue(Array.isArray(lines)&&lines.length===2&&lines.every(x=>Array.isArray(x)&&x.every(y=>typeof y==='string')),'Arrange two sentences.');
 const expected=[...words(question.prompt),...words(question.answer)].sort();
 const used=lines.flat().sort();requireValue(expected.length===used.length&&expected.every((x,i)=>x===used[i]),'Use every word exactly once.');
 return {lines:lines.map(x=>x.join(' ')),correct:normalize(lines[0].join(' '))===question.prompt&&normalize(lines[1].join(' '))===question.answer};
}
export function stageNext(room){
 if(room.phase==='ended')return room;
 if(room.phase==='preview')return {...room,phase:'open',revision:room.revision+1};
 if(room.questionIndex+1>=room.questions.length)return {...room,phase:'ended',reviewIndex:room.questionIndex,revision:room.revision+1};
 return {...room,phase:'preview',reviewIndex:room.questionIndex,questionIndex:room.questionIndex+1,revision:room.revision+1};
}
export function publicRoom(room,groupId){
 const group=room.groups[groupId];requireValue(group,'This group is not in the activity.',403);
 const question=room.questions[room.questionIndex];
 // Sorted tokens disclose the available words but never the answer order.
 return {id:room.id,title:room.title,className:room.className,phase:room.phase,questionIndex:room.questionIndex,questionCount:room.questions.length,revision:room.revision,imageId:question.imageId,
  tokens:[...words(question.prompt),...words(question.answer)].sort(),group:{id:group.id,number:group.number,members:group.members,attempts:group.attempts},maxAttempts:5};
}
export function teacherRoom(room){return {...room,groups:Object.fromEntries(Object.entries(room.groups).map(([id,{tokenHash,login,lastReleaseId,...g}])=>[id,{...g,loginStatus:login?.status||'active',loginVersion:Number.isInteger(login?.version)?login.version:1}]))};}
