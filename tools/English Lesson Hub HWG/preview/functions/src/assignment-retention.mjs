export async function cleanupAssignmentRetention({db,bucket,now=Date.now(),enabled=false,limit=30}) {
 if(!enabled)return {enabled:false,deleted:0};let deleted=0;
 const audio=await db.collection('lessonAssignmentAudioV1').where('retentionAt','<=',new Date(now)).limit(limit).get();
 for(const doc of audio.docs){const a=doc.data();if(!/^[-\w]{1,128}$/.test(a.uid)||!/^[-\w]{8,100}$/.test(doc.id))throw Error('錄音保存識別碼無效。');for(const name of ['audio','score.json'])await bucket.file(`assignmentAudioV1/${a.uid}/${doc.id}/${name}`).delete({ignoreNotFound:true});await doc.ref.delete();deleted++;}
 const assignments=await db.collection('lessonAssignmentsV1').where('expiresAt','<=',new Date(now)).limit(limit).get();
 for(const doc of assignments.docs){if(!/^\d{6}$/.test(doc.id))throw Error('分配保存識別碼無效。');await db.recursiveDelete(doc.ref);deleted++;}
 const claims=await db.collection('assignmentCreationsV1').where('expiresAt','<=',new Date(now)).limit(limit).get();for(const doc of claims.docs){await doc.ref.delete();deleted++;}
 return {enabled:true,deleted};
}
