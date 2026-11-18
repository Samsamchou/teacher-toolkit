// Keep raw character indices for existing answer/report compatibility.
export function editVowelPhrase(entry, value) {
  const word = value.replace(/\s/g, ' ').replace(/[^A-Za-z ]/g, '').replace(/ +/g, ' ').slice(0, 24);
  const oldLetters = [...entry.word].filter(c => c !== ' ').join('');
  // Capitalising a proper noun (english → English) keeps the marks.
  if (oldLetters.toLowerCase() !== word.replace(/ /g, '').toLowerCase()) return {word, targets: [], ...(entry.links ? {links: []} : {})};
  // Same letters (only spacing or case changed): move each marked position to its new index.
  const ordinalOf = new Map(), indexOf = [];
  let ordinal = 0;
  [...entry.word].forEach((c, i) => { if (c !== ' ') ordinalOf.set(i, ordinal++); });
  [...word].forEach((c, i) => { if (c !== ' ') indexOf.push(i); });
  const move = i => indexOf[ordinalOf.get(i)];
  const targets = entry.targets.map(move).sort((a, b) => a - b);
  if (!entry.links) return {word, targets};
  const links = entry.links.map(link => link.map(move))
    .filter(link => !word.slice(Math.min(...link), Math.max(...link) + 1).includes(' '));
  return {word, targets, links};
}

// Unmarking a letter also removes it from teacher-made links.
export function pruneVowelLinks(links, targets) {
  return (links || []).map(link => link.filter(i => targets.includes(i))).filter(link => link.length > 1);
}
