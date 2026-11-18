import raw from './challenges.json';

export type Gloss = { word: string; definition: string; note?: string };

export type ChallengeWord = {
  id: string;
  word: string;
  pos: string;
  level: 1 | 2 | 3;
  definition: string;
  example: string;
  synonyms: Gloss[];
  antonyms: Gloss[];
  /** Plausible near-misses: related-sounding words that are neither. */
  distractors: Gloss[];
};

export type ChallengeMode = 'synonyms' | 'antonyms';
export type OptionGroup = 'synonym' | 'antonym' | 'unrelated';

export type RoundOption = Gloss & { group: OptionGroup; isTarget: boolean };

export type Round = {
  key: string; // `${id}:${mode}`
  entry: ChallengeWord;
  mode: ChallengeMode;
  options: RoundOption[];
  targetCount: number;
};

export const CHALLENGES: ChallengeWord[] = raw as ChallengeWord[];
export const CHALLENGES_BY_ID: Record<string, ChallengeWord> = Object.fromEntries(CHALLENGES.map((c) => [c.id, c]));

export const roundKey = (id: string, mode: ChallengeMode) => `${id}:${mode}`;

/** Small deterministic PRNG so a given round always shuffles the same way (render-safe). */
function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/**
 * Every round shows the whole pool — synonyms, antonyms and near-miss distractors —
 * so in synonym mode the antonyms are traps too (and vice versa).
 */
export function buildRound(id: string, mode: ChallengeMode): Round {
  const entry = CHALLENGES_BY_ID[id];
  const options: RoundOption[] = [
    ...entry.synonyms.map((g) => ({ ...g, group: 'synonym' as const, isTarget: mode === 'synonyms' })),
    ...entry.antonyms.map((g) => ({ ...g, group: 'antonym' as const, isTarget: mode === 'antonyms' })),
    ...entry.distractors.map((g) => ({ ...g, group: 'unrelated' as const, isTarget: false })),
  ];
  const rand = seeded(roundKey(id, mode));
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return { key: roundKey(id, mode), entry, mode, options, targetCount: options.filter((o) => o.isTarget).length };
}

export type RoundScore = {
  found: number;
  missed: number;
  wrong: number;
  perfect: boolean;
  points: number;
};

export const POINTS = { found: 10, wrong: -5, perfectBonus: 20 } as const;

export function scoreRound(round: Round, picked: Set<string>, usedHints: boolean): RoundScore {
  let found = 0;
  let wrong = 0;
  for (const o of round.options) {
    if (!picked.has(o.word)) continue;
    if (o.isTarget) found++;
    else wrong++;
  }
  const missed = round.targetCount - found;
  const perfect = missed === 0 && wrong === 0;
  const raw = found * POINTS.found + wrong * POINTS.wrong + (perfect && !usedHints ? POINTS.perfectBonus : 0);
  return { found, missed, wrong, perfect, points: Math.max(0, raw) };
}
