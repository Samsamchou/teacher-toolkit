import { randomUUID, createHash } from "node:crypto";
import { rateLimit } from "./live-image-service.mjs";
export const mediaId = (value) =>
  /^cloud-[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(value || "");
const allowed = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "video/mp4",
  "video/webm",
]);
export function validateUpload(input) {
  if (
    !input ||
    typeof input.name !== "string" ||
    !input.name.trim() ||
    input.name.length > 200
  )
    throw new Error("素材名稱無效。");
  const variants = input.variants;
  if (
    !variants ||
    !variants.original ||
    Object.keys(variants).some((k) => !["original", "playback"].includes(k))
  )
    throw new Error("素材版本無效。");
  if (typeof variants.original.mime !== "string")
    throw new Error("素材 MIME 無效。");
  const kind = variants.original.mime.split("/")[0];
  for (const [name, v] of Object.entries(variants)) {
    if (
      !allowed.has(v.mime) ||
      !Number.isSafeInteger(v.bytes) ||
      v.bytes < 1 ||
      v.bytes > (kind === "image" ? 20 : 100) * 1024 * 1024 ||
      !/^[a-f0-9]{64}$/.test(v.sha256 || "")
    )
      throw new Error("素材格式、大小或雜湊無效。");
    if (name === "playback" && (kind !== "image" || v.mime !== "image/webp"))
      throw new Error("圖片播放版本必須是 WebP。");
  }
  if (kind === "image" && !variants.playback)
    throw new Error("圖片缺少壓縮播放版本。");
  return {
    name: input.name,
    kind,
    variants: Object.fromEntries(
      Object.entries(variants).map(([k, v]) => [
        k,
        { mime: v.mime, bytes: v.bytes, sha256: v.sha256 },
      ]),
    ),
  };
}
export function mediaSignature(bytes, mime) {
  const head = Buffer.from(bytes);
  if (mime === "image/png")
    return head
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mime === "image/jpeg")
    return head[0] === 255 && head[1] === 216 && head[2] === 255;
  if (mime === "image/webp")
    return (
      head.toString("ascii", 0, 4) === "RIFF" &&
      head.toString("ascii", 8, 12) === "WEBP"
    );
  if (mime.includes("wav"))
    return (
      head.toString("ascii", 0, 4) === "RIFF" &&
      head.toString("ascii", 8, 12) === "WAVE"
    );
  if (mime === "audio/mpeg")
    return (
      head.toString("ascii", 0, 3) === "ID3" ||
      (head[0] === 255 && (head[1] & 224) === 224)
    );
  if (mime === "video/mp4") return head.toString("ascii", 4, 8) === "ftyp";
  if (mime === "video/webm")
    return head.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163]));
  return false;
}
export async function verifyStoredVariant(file, expected) {
  const [metadata] = await file.getMetadata();
  if (
    Number(metadata.size) !== expected.bytes ||
    metadata.contentType !== expected.mime
  )
    throw new Error("上傳檔案大小或格式不一致。");
  const hash = createHash("sha256");
  let count = 0,
    head = Buffer.alloc(0);
  for await (const chunk of file.createReadStream()) {
    count += chunk.length;
    if (count > expected.bytes) throw new Error("素材超出宣告大小。");
    if (head.length < 32)
      head = Buffer.concat([head, chunk.subarray(0, 32 - head.length)]);
    hash.update(chunk);
  }
  if (
    count !== expected.bytes ||
    hash.digest("hex") !== expected.sha256 ||
    !mediaSignature(head, expected.mime)
  )
    throw new Error("檔案雜湊或檔頭不符，已停止使用。");
  // Do not retain long-lived Firebase download tokens on classroom media.
  await file.setMetadata({ metadata: { firebaseStorageDownloadTokens: null } });
  return { ...expected, generation: String(metadata.generation) };
}
export function createMediaService({
  db,
  bucket,
  requireTeacher,
  videoEnabled = false,
  now = Date.now,
}) {
  const records = db.collection("liveMediaV2"),
    grants = db.collection("liveMediaUploadsV2"),
    jobs = db.collection("liveVideoJobsV2");
  return async (request) => {
    const uid = request.auth?.uid;
    if (!uid || request.auth.token?.firebase?.sign_in_provider !== "anonymous")
      throw new Error("需要登入。");
    const {
      action,
      id,
      input,
      code,
      variant = "playback",
    } = request.data || {};
    if (action === "begin") {
      await requireTeacher(request);
      const value = validateUpload(input),
        id = "cloud-" + randomUUID();
      if (value.kind === "video" && !videoEnabled)
        throw new Error("雲端影片轉檔尚未啟用。");
      await rateLimit(db, uid, "media-upload", 10, now());
      let source = null;
      if (input.derivedFrom) {
        if (!mediaId(input.derivedFrom)) throw new Error('原圖 ID 無效。');
        const old = (await records.doc(input.derivedFrom).get()).data();
        if (!old || (old.workspaceOwnerUid || old.ownerUid) !== uid || old.kind !== 'image' || old.status !== 'ready' ||
          old.variants.original.sha256 !== value.variants.original.sha256) throw new Error('原圖擁有者或雜湊不符。');
        source = old.source || null;
      } else if (input.source) {
        if (
          input.source.provider !== "Pixabay" ||
          input.source.licenseConfirmed !== true ||
          !/^\d{1,20}$/.test(input.source.id || "")
        )
          throw new Error("圖片來源授權未確認。");
        const hit = (
          await db.collection("liveImageHitsV2").doc(input.source.id).get()
        ).data();
        if (!hit || hit.until < now())
          throw new Error("圖片來源已到期，請重新搜尋。");
        source = {
          provider: "Pixabay",
          id: input.source.id,
          page: hit.page,
          author: hit.author,
          license: "https://pixabay.com/service/license-summary/",
          confirmedAt: new Date(now()).toISOString(),
        };
      }
      const paths = Object.fromEntries(
        Object.keys(value.variants).map((v) => [
          v,
          `liveMediaV2/${request.teacherUploadUid || uid}/${id}/${v}`,
        ]),
      );
      const grant = {
        // Storage grant remains bound to the actual uploader's anonymous auth.
        ownerUid: request.teacherUploadUid || uid,
        variants: value.variants,
        expiresAt: new Date(now() + 15 * 60000),
        active: true,
      };
      const batch = db.batch();
      batch.create(records.doc(id), {
        ...value,
        id,
        ownerUid: request.teacherUploadUid || uid,
        ...(request.teacherUploadUid ? {workspaceOwnerUid:uid} : {}),
        paths,
        status: "uploading",
        createdAt: now(),
        source,
      });
      batch.create(grants.doc(id), grant);
      await batch.commit();
      return { id, paths, expiresAt: grant.expiresAt.getTime() };
    }
    if (!mediaId(id)) throw new Error("素材 ID 無效。");
    const ref = records.doc(id),
      doc = await ref.get();
    if (!doc.exists) throw new Error("找不到素材。");
    const asset = doc.data();
    const owner = (asset.workspaceOwnerUid || asset.ownerUid) === uid;
    if (owner) await requireTeacher(request);
    else {
      if (action !== "read" || !/^\d{6}$/.test(code || ""))
        throw new Error("無權存取素材。");
      const roomDoc = await db.collection("liveRoomsV2").doc(code).get();
      if (!roomDoc.exists) throw new Error("找不到課堂。");
      const room = JSON.parse(roomDoc.data().json);
      if (
        (asset.workspaceOwnerUid || asset.ownerUid) !== room.teacher ||
        !room.participants[uid] ||
        room.expiresAt < now() ||
        room.phase === "lobby" ||
        room.phase === "complete" ||
        !room.deck.blocks[room.index].media?.some((m) => m.id === id)
      )
        throw new Error("本頁未提供此素材。");
    }
    if (action === "finalize") {
      if (!owner) throw new Error("需要素材擁有者。");
      if (asset.status !== "uploading") return { asset: descriptor(asset) };
      const verified = {};
      for (const [v, expected] of Object.entries(asset.variants))
        verified[v] = await verifyStoredVariant(
          bucket.file(asset.paths[v]),
          expected,
        );
      const next = asset.kind === "video" ? "queued" : "ready";
      await db.runTransaction(async (tx) => {
        const current = await tx.get(ref);
        if (current.data().status !== "uploading") return;
        tx.update(ref, { status: next, variants: verified, updatedAt: now() });
        tx.update(grants.doc(id), { active: false });
        if (next === "queued")
          tx.create(jobs.doc(id), {
            assetId: id,
            status: "queued",
            attempts: 0,
            createdAt: now(),
            ownerUid: asset.ownerUid,
          });
      });
      return { asset: descriptor((await ref.get()).data()) };
    }
    if (action === "retry") {
      if (!owner || asset.kind !== "video") throw new Error("不能重試此素材。");
      await db.runTransaction(async (tx) => {
        const job = await tx.get(jobs.doc(id));
        if (
          !job.exists ||
          job.data().status !== "failed" ||
          job.data().attempts >= 3
        )
          throw new Error("尚在轉檔、已完成或已達三次上限。");
        tx.update(jobs.doc(id), { status: "queued", error: null });
        tx.update(ref, { status: "queued", error: null });
      });
      return { status: "queued" };
    }
    if (action === "status") return { asset: descriptor(asset) };
    if (action !== "read") throw new Error("操作無效。");
    if (asset.status !== "ready")
      return { status: asset.status, error: asset.error || null };
    if (!["playback", "poster"].includes(variant) && !(owner && variant === "original"))
      throw new Error("學生不得索取原始素材。");
    const path =
      asset.paths[variant] ||
      (variant === "playback" && asset.kind === "audio"
        ? asset.paths.original
        : null);
    if (!path) throw new Error("素材版本不存在。");
    const expiresAt = now() + 10 * 60000;
    const [url] = await bucket
      .file(path)
      .getSignedUrl({ version: "v4", action: "read", expires: expiresAt });
    return { status: "ready", url, expiresAt, source: asset.source || null };
  };
}
export function descriptor(asset) {
  return {
    id: asset.id,
    name: asset.name,
    kind: asset.kind,
    status: asset.status,
    sha256: asset.variants.original.sha256,
    originalId: asset.id,
    source: asset.source || null,
  };
}
