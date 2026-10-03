import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
export function runFfmpeg(
  args,
  { binary = process.env.LIVE_FFMPEG_PATH || "ffmpeg", timeout = 180000 } = {},
) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      binary,
      ["-nostdin", "-hide_banner", "-loglevel", "error", ...args],
      { windowsHide: true, stdio: ["ignore", "ignore", "pipe"] },
    );
    let errors = "";
    let expired = false;
    const timer = setTimeout(() => {
      expired = true;
      child.kill();
    }, timeout);
    child.stderr.on("data", (chunk) => {
      errors = (errors + chunk.toString()).slice(-1500);
    });
    child.on("error", () => {
      clearTimeout(timer);
      reject(new Error("FFmpeg 無法啟動；原始影片保留，可重試轉檔。"));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve();
      else
        reject(
          new Error(
            expired
              ? "影片轉檔逾時，原檔已保留。"
              : "影片無法解碼或轉檔失敗，原檔已保留。",
          ),
        );
    });
  });
}
export async function transcodeVideo(input, output, poster, options = {}) {
  const duration = await new Promise((resolve, reject) => {
    const child = spawn(
      process.env.LIVE_FFPROBE_PATH || "ffprobe",
      [
        "-v",
        "error",
        "-protocol_whitelist",
        "file,pipe",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        input,
      ],
      { windowsHide: true },
    );
    let value = "";
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("影片檢查逾時。"));
    }, 15000);
    child.stdout.on("data", (b) => {
      value += b;
    });
    child.stderr.resume();
    child.on("error", () => {
      clearTimeout(timer);
      reject(new Error("無法啟動 ffprobe。"));
    });
    child.on("close", (c) => {
      clearTimeout(timer);
      const seconds = Number(value.trim());
      if (c !== 0 || !Number.isFinite(seconds) || seconds <= 0)
        reject(new Error("無法確認影片長度。"));
      else resolve(seconds);
    });
  });
  if (duration > 300)
    throw new Error("影片超過試行 5 分鐘上限，原檔保留，不會截斷。");
  // File-only input protocols stop uploaded playlists from fetching network URLs.
  await runFfmpeg(
    [
      "-y",
      "-protocol_whitelist",
      "file,pipe",
      "-i",
      input,
      "-map",
      "0:v:0",
      "-map",
      "0:a?",
      "-vf",
      "scale=w='min(1280,iw)':h='min(720,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "26",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      output,
    ],
    options,
  );
  await runFfmpeg(
    [
      "-y",
      "-protocol_whitelist",
      "file,pipe",
      "-i",
      output,
      "-frames:v",
      "1",
      "-update",
      "1",
      poster,
    ],
    options,
  );
  await access(output);
  await access(poster);
  return { profile: "mp4-h264-aac-720p-crf26", maxDurationSeconds: 300 };
}
