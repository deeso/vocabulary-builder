import raw from './words.json';
import type { LangCode, Relation, Word } from './types';

export type { LangCode, Relation, RelationKind, Word } from './types';

export const LANGUAGES: Record<LangCode, { name: string; native: string; speech: string }> = {
  en: { name: 'English', native: 'English', speech: 'en-US' },
  es: { name: 'Spanish', native: 'Español', speech: 'es-ES' },
  fr: { name: 'French', native: 'Français', speech: 'fr-FR' },
  de: { name: 'German', native: 'Deutsch', speech: 'de-DE' },
  it: { name: 'Italian', native: 'Italiano', speech: 'it-IT' },
};

export const LANG_CODES = Object.keys(LANGUAGES) as LangCode[];

/** Display names for related-word languages outside the study set. */
const EXTRA_LANG_NAMES: Record<string, string> = {
  la: 'Latin',
  grc: 'Ancient Greek',
  ar: 'Arabic',
  cs: 'Czech',
  non: 'Old Norse',
  nl: 'Dutch',
  pt: 'Portuguese',
};

export function langName(code: string): string {
  return (LANGUAGES as Record<string, { name: string }>)[code]?.name ?? EXTRA_LANG_NAMES[code] ?? code;
}

export const WORDS: Word[] = (raw as Word[]).slice().sort((a, b) => a.level - b.level);

export const WORDS_BY_ID: Record<string, Word> = Object.fromEntries(WORDS.map((w) => [w.id, w]));

/**
 * Relations as authored, plus back-links: if A lists B (by id), B also shows A,
 * so cross-language links are always two-way.
 */
const RELATED: Record<string, Relation[]> = (() => {
  const out: Record<string, Relation[]> = Object.fromEntries(WORDS.map((w) => [w.id, [...w.related]]));
  for (const w of WORDS) {
    for (const r of w.related) {
      if (!r.id || !out[r.id]) continue;
      if (out[r.id].some((x) => x.id === w.id)) continue;
      out[r.id].push({ id: w.id, term: w.term, lang: w.lang, kind: r.kind === 'borrowing' ? 'borrowing' : r.kind });
    }
  }
  return out;
})();

export function relatedFor(id: string): Relation[] {
  return RELATED[id] ?? [];
}

export const RELATION_LABEL: Record<Relation['kind'], string> = {
  cognate: 'Cognate',
  borrowing: 'Borrowing',
  calque: 'Loan-translation',
  root: 'Same root',
  'false-friend': 'False friend',
  opposite: 'Opposite',
  related: 'Related',
};

/** A stable "word of the day": same word for everyone on a given local date. */
export function wordOfTheDay(date = new Date()): Word {
  const key = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  let h = key;
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = ((h >>> 16) ^ h) * 0x45d9f3b;
  h = (h >>> 16) ^ h;
  return WORDS[Math.abs(h) % WORDS.length];
}
