import { createServer } from "node:http";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { OAuth2Client } from "google-auth-library";
import { createVideoWorker } from "./core.mjs";
import { authenticateWorker } from "./auth.mjs";
const { LIVE_WORKER_AUDIENCE, LIVE_WORKER_CALLER, LIVE_MEDIA_BUCKET } =
  process.env;
if (!LIVE_WORKER_AUDIENCE || !LIVE_WORKER_CALLER || !LIVE_MEDIA_BUCKET)
  throw new Error(
    "Worker requires explicit audience, caller and bucket configuration.",
  );
initializeApp({ storageBucket: LIVE_MEDIA_BUCKET });
const oauth = new OAuth2Client(),
  run = createVideoWorker({
    db: getFirestore(),
    bucket: getStorage().bucket(),
  });
const server = createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST" || req.url !== "/transcode") {
    res.writeHead(404);
    res.end("{}");
    return;
  }
  try {
    await authenticateWorker({
      authorization: req.headers.authorization,
      audience: LIVE_WORKER_AUDIENCE,
      caller: LIVE_WORKER_CALLER,
      verifyIdToken: (input) => oauth.verifyIdToken(input),
    });
  } catch {
    res.writeHead(403);
    res.end(JSON.stringify({ error: "Forbidden" }));
    return;
  }
  try {
    let size = 0;
    const chunks = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 1024) throw new Error("size");
      chunks.push(chunk);
    }
    const { assetId } = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    const result = await run(assetId);
    res.writeHead(result.status === "busy" ? 409 : 200);
    res.end(JSON.stringify(result));
  } catch {
    res.writeHead(503);
    res.end(JSON.stringify({ error: "Worker unavailable" }));
  }
});
server.requestTimeout = 9 * 60000;
server.listen(Number(process.env.PORT) || 8080, "0.0.0.0");
