const http = require("http");
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "public");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".webm": "audio/webm"
};
const port = Number(process.env.PORT || 8765);
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent((req.url || "/").split("?")[0]);
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const file = path.resolve(root, relative);
  if (!file.startsWith(path.resolve(root))) { res.writeHead(403); return res.end("Forbidden"); }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream" }); res.end(data);
  });
}).listen(port, "127.0.0.1", () => console.log(`Local site: http://127.0.0.1:${port}`));

let shuttingDown = false;
function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  const forceExit = setTimeout(() => process.exit(0), 2_000);
  forceExit.unref();
  server.close(() => process.exit(0));
}

for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, shutdown);
}
