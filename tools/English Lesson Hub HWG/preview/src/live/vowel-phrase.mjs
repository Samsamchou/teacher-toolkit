// Keep raw character indices for existing answer/report compatibility.
export function editVowelPhrase(entry, value) {
  const word = value.replace(/\s/g, ' ').replace(/[^A-Za-z ]/g, '').replace(/ +/g, ' ').slice(0, 24);
  const oldLetters = [...entry.word].filter(c => c !== ' ').join('');
  if (oldLetters !== word.replace(/ /g, '')) return {word, targets: []};
  const marked = new Set();
  let ordinal = 0;
  [...entry.word].forEach((c, i) => { if (c !== ' ') { if(entry.targets.includes(i)) marked.add(ordinal); ordinal++; } });
  ordinal = 0;
  const targets = [];
  [...word].forEach((c, i) => { if(c !== ' ') { if(marked.has(ordinal)) targets.push(i); ordinal++; } });
  return {word, targets};
}
