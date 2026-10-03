// Only v2 student records are in scope. Teacher media and v1 are never touched.
export async function cleanupLiveRetention({
  db,
  bucket,
  now = Date.now(),
  enabled = false,
  limit = 50,
}) {
  if (!enabled) return { enabled: false, deleted: 0 };
  let deleted = 0;
  const attempts = await db
    .collection("liveAudioAttemptsV2")
    .where("retentionAt", "<=", new Date(now))
    .limit(limit)
    .get();
  for (const doc of attempts.docs) {
    const a = doc.data();
    if (!/^[\w-]{1,128}$/.test(a.uid) || !/^[\w-]{8,100}$/.test(doc.id))
      throw new Error("Retention identifier rejected");
    for (const name of ["audio", "score.json"])
      await bucket
        .file(`liveAudioV2/${a.uid}/${doc.id}/${name}`)
        .delete({ ignoreNotFound: true });
    if (/^\d{6}$/.test(a.code))
      await db
        .collection("liveRoomsV2")
        .doc(a.code)
        .collection("responses")
        .doc(doc.id)
        .delete();
    await doc.ref.delete();
    deleted++;
  }
  const quotas = await db
    .collection("liveAudioQuotaV2")
    .where("expiresAt", "<=", new Date(now))
    .limit(limit)
    .get();
  for (const doc of quotas.docs) {
    await doc.ref.delete();
    deleted++;
  }
  const rooms = await db
    .collection("liveRoomsV2")
    .where("expiresAt", "<=", new Date(now))
    .limit(limit)
    .get();
  for (const doc of rooms.docs) {
    if (!/^\d{6}$/.test(doc.id)) throw new Error("Retention room rejected");
    await db.recursiveDelete(doc.ref);
    deleted++;
  }
  return { enabled: true, deleted };
}
