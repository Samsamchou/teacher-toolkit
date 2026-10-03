import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, relative } from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { transcodeVideo } from "../scripts/video-transcode.mjs";
const validId = (id) =>
  /^cloud-[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(id || "");
export function createVideoWorker({
  db,
  bucket,
  transcode = transcodeVideo,
  now = Date.now,
}) {
  return async (id) => {
    if (!validId(id)) throw new Error("Invalid asset ID");
    const jobRef = db.collection("liveVideoJobsV2").doc(id),
      assetRef = db.collection("liveMediaV2").doc(id),
      token = randomUUID();
    const claim = await db.runTransaction(async (tx) => {
      const jobDoc = await tx.get(jobRef),
        assetDoc = await tx.get(assetRef);
      if (!jobDoc.exists || !assetDoc.exists)
        throw new Error("Missing media job");
      const job = jobDoc.data(),
        asset = assetDoc.data();
      if (job.status === "ready" || job.status === "failed")
        return { terminal: job.status };
      if (job.status === "processing" && job.leaseUntil > now())
        return { terminal: "busy" };
      if (!["queued", "processing"].includes(job.status))
        throw new Error("Invalid job state");
      if (job.attempts >= 3) {
        tx.update(jobRef, { status: "failed", error: "已達三次處理上限。" });
        tx.update(assetRef, { status: "failed", error: "已達三次處理上限。" });
        return { terminal: "failed" };
      }
      if (
        asset.kind !== "video" ||
        asset.paths.original !==
          `liveMediaV2/${asset.ownerUid}/${id}/original` ||
        asset.variants.original.bytes > 100 * 1024 * 1024
      )
        throw new Error("Invalid media source");
      tx.update(jobRef, {
        status: "processing",
        attempts: job.attempts + 1,
        token,
        leaseUntil: now() + 10 * 60000,
      });
      tx.update(assetRef, { status: "processing" });
      return { asset };
    });
    if (claim.terminal) return { status: claim.terminal };
    const asset = claim.asset,
      temporary = await mkdtemp(join(tmpdir(), "lesson-live-video-"));
    try {
      const input = join(temporary, "input"),
        output = join(temporary, "playback.mp4"),
        poster = join(temporary, "poster.jpg");
      const file = bucket.file(asset.paths.original, {
        generation: asset.variants.original.generation,
      });
      const [meta] = await file.getMetadata();
      if (Number(meta.size) !== asset.variants.original.bytes)
        throw new Error("原始影片大小不符。");
      await file.download({ destination: input });
      const bytes = await readFile(input);
      if (
        createHash("sha256").update(bytes).digest("hex") !==
        asset.variants.original.sha256
      )
        throw new Error("原始影片雜湊不符。");
      await transcode(input, output, poster);
      const paths = { ...asset.paths },
        variants = { ...asset.variants };
      for (const [variant, local, mime, extension] of [
        ["playback", output, "video/mp4", "mp4"],
        ["poster", poster, "image/jpeg", "jpg"],
      ]) {
        const size = (await stat(local)).size;
        if (size < 1 || size > 150 * 1024 * 1024)
          throw new Error("轉檔輸出超過安全上限。");
        const sha256 = createHash("sha256")
          .update(await readFile(local))
          .digest("hex");
        const destination = `liveMediaV2/${asset.ownerUid}/${id}/${variant}-${sha256}.${extension}`;
        try {
          await bucket.upload(local, {
            destination,
            resumable: false,
            preconditionOpts: { ifGenerationMatch: 0 },
            metadata: {
              contentType: mime,
              cacheControl: "private,max-age=300",
              metadata: { sha256 },
            },
          });
        } catch (e) {
          if (e.code !== 412) throw e;
        }
        const [stored] = await bucket.file(destination).getMetadata();
        if (Number(stored.size) !== size || stored.metadata?.sha256 !== sha256)
          throw new Error("轉檔檔案讀回不符。");
        paths[variant] = destination;
        variants[variant] = {
          mime,
          bytes: size,
          sha256,
          generation: String(stored.generation),
        };
      }
      await db.runTransaction(async (tx) => {
        const job = await tx.get(jobRef);
        if (job.data().token !== token || job.data().status !== "processing")
          throw new Error("轉檔工作已由另一個程序接手。");
        tx.update(assetRef, {
          status: "ready",
          paths,
          variants,
          updatedAt: now(),
          error: null,
        });
        tx.update(jobRef, {
          status: "ready",
          completedAt: now(),
          leaseUntil: 0,
        });
      });
      return { status: "ready" };
    } catch (e) {
      // Sanitized message only: no bucket URLs, credentials or FFmpeg stderr.
      await db.runTransaction(async (tx) => {
        const job = await tx.get(jobRef);
        if (
          job.data()?.token === token &&
          job.data()?.status === "processing"
        ) {
          tx.update(jobRef, {
            status: "failed",
            error: "影片處理失敗；原檔保留，可由教師重試。",
            leaseUntil: 0,
          });
          tx.update(assetRef, {
            status: "failed",
            error: "影片處理失敗；原檔保留，可由教師重試。",
          });
        }
      });
      return { status: "failed" };
    } finally {
      // Delete only the exact per-job temporary folder created above.
      const rel = relative(resolve(tmpdir()), resolve(temporary));
      if (
        !rel.startsWith("..") &&
        !rel.includes("/") &&
        !rel.includes("\\") &&
        rel.startsWith("lesson-live-video-")
      )
        await rm(temporary, { recursive: true, force: true });
    }
  };
}
