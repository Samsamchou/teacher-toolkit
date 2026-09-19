import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const release=JSON.parse(fs.readFileSync('public/release.json'));
for(const [file,sha] of Object.entries(release.sources))assert.equal(createHash('sha256').update(fs.readFileSync('src/'+file)).digest('hex'),sha,`Review and update the unified release manifest before building: ${file}`);
for(const marker of ['SELECT_TEAM','completedThisRound'])assert.ok(fs.readFileSync('src/spin-model.mjs','utf8').includes(marker));
const media=JSON.parse(fs.readFileSync('src/spin-media.json'));for(const item of Object.values(media))assert.equal(createHash('sha256').update(fs.readFileSync('public'+item.url)).digest('hex'),item.sha256);
console.log(`Unified release verified: ${release.version}; ${Object.keys(release.sources).length} source files; ${Object.keys(media).length} media files.`);
const cardArt=JSON.parse(fs.readFileSync('public/plinkoh/cards/manifest.json'));assert.equal(cardArt.cards.length,6);for(const card of cardArt.cards)assert.equal(createHash('sha256').update(fs.readFileSync('public'+card.url)).digest('hex'),card.sha256,`Card artwork mismatch: ${card.id}`);console.log('Six illustrated power-up assets verified.');
