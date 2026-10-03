import { createHash } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { transcodeVideo } from "./video-transcode.mjs";
let videoQueue = Promise.resolve();
export function byteRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(header || '');
  if (!match || (!match[1] && !match[2])) return null;
  const suffix = !match[1];
  const start = suffix ? Math.max(0, size - Number(match[2])) : Number(match[1]);
  const end = suffix || !match[2] ? size - 1 : Math.min(Number(match[2]), size - 1);
  return Number.isSafeInteger(start) && Number.isSafeInteger(end) && start >= 0 && start < size && end >= start ? { start, end } : null;
}
const types = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "video/mp4": "mp4",
  "video/webm": "webm",
};
export function liveMediaPlugin() {
  return {
    name: "lesson-live-local-media",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/api/lab-media", async (req, res) => {
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Cache-Control", "no-store");
        const host = req.headers.host || "";
        if (
          !/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host) ||
          (req.headers.origin && req.headers.origin !== `http://${host}`)
        ) {
          res.statusCode = 403;
          res.end();
          return;
        }
        const root = resolve(".live-lab/media");
        try {
          await mkdir(root, { recursive: true });
          if (req.method === "POST") {
            const mime = String(req.headers["content-type"] || "");
            if (!types[mime]) throw new Error("不支援此媒體格式。");
            let size = 0;
            const chunks = [];
            for await (const part of req) {
              size += part.length;
              if (size > 100 * 1024 * 1024)
                throw new Error("媒體上限 100 MB。");
              chunks.push(part);
            }
            if (size === 0) throw new Error("空白媒體檔。");
            const body = Buffer.concat(chunks),
              hash = createHash("sha256").update(body).digest("hex");
            const id = `${hash}.${types[mime]}`;
            await writeFile(resolve(root, id), body, { flag: "wx" }).catch(
              (e) => {
                if (e.code !== "EEXIST") throw e;
              },
            );
            if (mime.startsWith("video/")) {
              const job = videoQueue.then(async () => {
                const output = resolve(root, `${hash}-720p.mp4`),
                  poster = resolve(root, `${hash}-poster.jpg`);
                await transcodeVideo(resolve(root, id), output, poster);
                const optimized = await readFile(output),
                  cover = await readFile(poster);
                const playbackId = `${createHash("sha256").update(optimized).digest("hex")}.mp4`,
                  posterId = `${createHash("sha256").update(cover).digest("hex")}.jpg`;
                await writeFile(resolve(root, playbackId), optimized);
                await writeFile(resolve(root, posterId), cover);
                return {
                  id: playbackId,
                  originalId: id,
                  posterId,
                  sha256: hash,
                  bytes: optimized.length,
                  profile: "H.264/AAC 720p",
                  durationLimitSeconds: 300,
                };
              });
              videoQueue = job.catch(() => {});
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify(await job));
              return;
            }
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                id,
                sha256: hash,
                url: `/api/lab-media/${id}`,
                bytes: size,
              }),
            );
          } else if (req.method === "GET" || req.method === "HEAD") {
            const id = req.url.slice(1);
            if (!/^[a-f0-9]{64}\.(jpg|png|webp|mp3|wav|mp4|webm)$/.test(id))
              throw new Error("媒體識別碼不正確。");
            const ext = id.split(".").pop();
            res.setHeader(
              "Content-Type",
              Object.keys(types).find((k) => types[k] === ext),
            );
            const body = await readFile(resolve(root, id));
            res.setHeader('Accept-Ranges', 'bytes');
            if (req.headers.range) {
              const range = byteRange(req.headers.range, body.length);
              if (!range) {
                res.statusCode = 416;
                res.setHeader('Content-Range', `bytes */${body.length}`);
                res.end();
                return;
              }
              res.statusCode = 206;
              res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${body.length}`);
              res.setHeader('Content-Length', range.end - range.start + 1);
              res.end(req.method === 'HEAD' ? undefined : body.subarray(range.start, range.end + 1));
            } else {
              res.setHeader('Content-Length', body.length);
              res.end(req.method === 'HEAD' ? undefined : body);
            }
          } else {
            res.statusCode = 405;
            res.end();
          }
        } catch (e) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              error: e.code === "ENOENT" ? "找不到素材。" : e.message,
            }),
          );
        }
      });
    },
  };
}
