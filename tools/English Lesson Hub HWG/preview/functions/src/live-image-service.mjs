import { createHash } from "node:crypto";
import { createImageSearch } from "./pixabay-core.mjs";
const hash = (value) => createHash("sha256").update(value).digest("hex");
export async function rateLimit(db, uid, scope, limit, now = Date.now()) {
  const ref = db
    .collection("liveServiceLimitsV2")
    .doc(hash([scope, uid].join("|")));
  await db.runTransaction(async (tx) => {
    const previous = await tx.get(ref),
      attempts = (previous.data()?.attempts || []).filter(
        (t) => t > now - 60000,
      );
    if (attempts.length >= limit) throw new Error("請稍候一分鐘再試。");
    tx.set(ref, {
      attempts: [...attempts, now],
      expiresAt: new Date(now + 86400000),
    });
  });
}
export function createCloudImageService({
  db,
  key,
  enabled = false,
  requireTeacher,
  fetcher = fetch,
  now = Date.now,
}) {
  const queries = db.collection("liveImageSearchCacheV2"),
    hits = db.collection("liveImageHitsV2");
  const cacheStore = {
    async getQuery(q) {
      return (await queries.doc(hash(q)).get()).data();
    },
    async getHit(id) {
      if (!/^\d{1,20}$/.test(id)) throw new Error("圖片 ID 無效。");
      return (await hits.doc(id).get()).data();
    },
    async save(q, value) {
      const batch = db.batch();
      batch.set(queries.doc(hash(q)), {
        ...value,
        expiresAt: new Date(value.until),
      });
      for (const h of value.data.hits)
        batch.set(hits.doc(h.id), {
          ...h,
          until: value.until,
          expiresAt: new Date(value.until),
        });
      await batch.commit();
    },
  };
  const run = createImageSearch({
    key,
    enabled,
    now,
    cacheStore,
    fetcher: async (...args) => {
      await rateLimit(db, "provider", "pixabay", 80, now());
      return fetcher(...args);
    },
  });
  return async (request) => {
    if (!enabled || !key) throw new Error("Pixabay 尚未部署啟用。");
    await requireTeacher(request);
    const uid = request.auth?.uid;
    if (!uid) throw new Error("需要教師登入。");
    const input = request.data?.input || {};
    if (input.action && !["search", "download"].includes(input.action))
      throw new Error("未知操作。");
    if (input.action === "download" && input.licenseConfirmed !== true)
      throw new Error("請先確認圖片來源及授權。");
    await rateLimit(
      db,
      uid,
      input.action === "download" ? "image-download" : "image-search",
      input.action === "download" ? 10 : 30,
      now(),
    );
    return run(input);
  };
}
