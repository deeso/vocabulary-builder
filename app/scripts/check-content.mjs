// Validates src/content/words.json: required fields, unique ids, id/lang
// consistency and that every linked relation points at a real entry.
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const words = JSON.parse(await readFile(join(root, 'src/content/words.json'), 'utf8'));
const LANGS = ['en', 'es', 'fr', 'de', 'it'];
const KINDS = ['cognate', 'borrowing', 'calque', 'root', 'false-friend', 'opposite', 'related'];
const REQUIRED = ['id', 'lang', 'term', 'ipa', 'pos', 'gloss', 'definition', 'example', 'etymology', 'related', 'level'];

const errors = [];
const ids = new Set();
for (const w of words) {
  const where = w.id ?? JSON.stringify(w).slice(0, 40);
  for (const k of REQUIRED) if (w[k] === undefined || w[k] === '') errors.push(`${where}: missing ${k}`);
  if (ids.has(w.id)) errors.push(`${where}: duplicate id`);
  ids.add(w.id);
  if (!LANGS.includes(w.lang)) errors.push(`${where}: unknown lang ${w.lang}`);
  if (!w.id?.startsWith(`${w.lang}-`)) errors.push(`${where}: id should start with "${w.lang}-"`);
  if (![1, 2, 3].includes(w.level)) errors.push(`${where}: level must be 1, 2 or 3`);
  if (w.lang !== 'en' && !w.exampleTranslation) errors.push(`${where}: non-English example needs exampleTranslation`);
}
for (const w of words) {
  for (const r of w.related ?? []) {
    if (!KINDS.includes(r.kind)) errors.push(`${w.id}: relation "${r.term}" has unknown kind ${r.kind}`);
    if (r.id && !ids.has(r.id)) errors.push(`${w.id}: relation "${r.term}" links to missing id ${r.id}`);
    if (r.id === w.id) errors.push(`${w.id}: relates to itself`);
  }
}

// ---- challenges.json ----
const challenges = JSON.parse(await readFile(join(root, 'src/content/challenges.json'), 'utf8'));
const cids = new Set();
for (const ch of challenges) {
  const where = `challenge ${ch.id ?? '?'}`;
  for (const k of ['id', 'word', 'pos', 'definition', 'example', 'synonyms', 'antonyms', 'distractors', 'level']) {
    if (ch[k] === undefined || ch[k] === '') errors.push(`${where}: missing ${k}`);
  }
  if (cids.has(ch.id)) errors.push(`${where}: duplicate id`);
  cids.add(ch.id);
  if ((ch.synonyms?.length ?? 0) < 3) errors.push(`${where}: needs at least 3 synonyms`);
  if ((ch.antonyms?.length ?? 0) < 3) errors.push(`${where}: needs at least 3 antonyms`);
  if ((ch.distractors?.length ?? 0) < 2) errors.push(`${where}: needs at least 2 distractors`);
  // A word may appear only once per round, or the puzzle becomes ambiguous.
  const seen = new Set();
  for (const g of [...(ch.synonyms ?? []), ...(ch.antonyms ?? []), ...(ch.distractors ?? [])]) {
    const w = g.word?.toLowerCase();
    if (!w || !g.definition) errors.push(`${where}: option missing word/definition`);
    if (w === ch.word.toLowerCase()) errors.push(`${where}: option repeats the headword`);
    if (seen.has(w)) errors.push(`${where}: "${g.word}" appears twice`);
    seen.add(w);
  }
  for (const d of ch.distractors ?? []) if (!d.note) errors.push(`${where}: distractor "${d.word}" needs a note`);
}

const perLang = Object.fromEntries(LANGS.map((l) => [l, words.filter((w) => w.lang === l).length]));
if (errors.length) {
  console.error(errors.join('\n'));
  console.error(`\n${errors.length} problem(s) in words.json`);
  process.exit(1);
}
console.log(`words.json OK — ${words.length} words`, perLang);
console.log(`challenges.json OK — ${challenges.length} words × 2 modes = ${challenges.length * 2} rounds`);
