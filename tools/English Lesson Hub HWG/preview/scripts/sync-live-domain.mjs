import { mkdir, copyFile, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const source = new URL("../src/live/domain.mjs", import.meta.url),
  target = new URL("../functions/generated/live-domain.mjs", import.meta.url);
await mkdir(new URL("../functions/generated/", import.meta.url), {
  recursive: true,
});
await copyFile(source, target);
if (!Buffer.from(await readFile(source)).equals(await readFile(target)))
  throw new Error("Domain sync mismatch");
console.log("Verified shared live domain:", fileURLToPath(target));
for (const name of ["rewards.mjs", "reward-physics.mjs", "reward-random.mjs", "parity.mjs", "video.mjs", "annotations.mjs", "review.mjs", "mastery.mjs", "slide-canvas.mjs"]) {
  const from = new URL("../src/live/" + name, import.meta.url),
    to = new URL("../functions/generated/" + name, import.meta.url);
  await copyFile(from, to);
  if (!Buffer.from(await readFile(from)).equals(await readFile(to)))
    throw new Error("Reward sync mismatch");
  console.log("Verified shared reward module:", name);
}
