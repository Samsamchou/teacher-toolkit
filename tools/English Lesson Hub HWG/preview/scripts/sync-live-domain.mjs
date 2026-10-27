import { mkdir, copyFile, readFile, writeFile } from "node:fs/promises";
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
for (const name of ["rewards.mjs", "reward-physics.mjs", "reward-random.mjs", "parity.mjs", "video.mjs", "annotations.mjs", "review.mjs", "mastery.mjs", "slide-canvas.mjs", "sentence-rebuild.mjs", "spelling.mjs"]) {
  const from = new URL("../src/live/" + name, import.meta.url),
    to = new URL("../functions/generated/" + name, import.meta.url);
  await copyFile(from, to);
  if (!Buffer.from(await readFile(from)).equals(await readFile(to)))
    throw new Error("Reward sync mismatch");
  console.log("Verified shared reward module:", name);
}

await mkdir(new URL('../functions/generated/sports-source/', import.meta.url), {recursive:true});
for (const name of ['reward-sports.mjs','sports-source/bowling-model.mjs','sports-source/bowling-motion.mjs','sports-source/worldpup-model.mjs','sports-source/worldpup-countries.mjs']) {
 const from=new URL('../src/live/'+name,import.meta.url), to=new URL('../functions/generated/'+name,import.meta.url);
 await copyFile(from,to);
 if(!Buffer.from(await readFile(from)).equals(await readFile(to)))throw Error('Sports sync mismatch');
 console.log('Verified sports module:',name);
}

// Assignment domain has one normalized import path in the deployable tree.
const assignmentText=await readFile(new URL('../src/assignments/assignment-domain.mjs',import.meta.url),'utf8');
await writeFile(new URL('../functions/generated/assignment-domain.mjs',import.meta.url),assignmentText.replace("'../live/domain.mjs'","'./live-domain.mjs'"));

await copyFile(new URL('../src/assignments/game-heroes.mjs',import.meta.url),new URL('../functions/generated/game-heroes.mjs',import.meta.url));
