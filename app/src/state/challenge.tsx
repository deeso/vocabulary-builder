import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { CHALLENGES, ChallengeMode, roundKey, RoundScore } from '@/content/challenge';

const STORAGE_KEY = 'vocab-builder/challenge-v1';

export type ModeSetting = ChallengeMode | 'mixed';

type RoundRecord = { plays: number; perfect: boolean; bestPoints: number; lastAt: number };

type Persisted = {
  version: 1;
  rounds: Record<string, RoundRecord>;
  points: number;
  played: number;
  perfect: number;
  streak: number;
  bestStreak: number;
  mode: ModeSetting;
};

const EMPTY: Persisted = {
  version: 1,
  rounds: {},
  points: 0,
  played: 0,
  perfect: 0,
  streak: 0,
  bestStreak: 0,
  mode: 'mixed',
};

type ChallengeValue = Persisted & {
  ready: boolean;
  setMode: (m: ModeSetting) => void;
  record: (key: string, score: RoundScore) => void;
  /** Pick the next round, preferring ones not yet solved perfectly; never repeats `avoid`. */
  pickNext: (avoid?: string) => { id: string; mode: ChallengeMode };
  reset: () => void;
};

const Ctx = createContext<ChallengeValue | null>(null);

export function ChallengeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(EMPTY);
  const [ready, setReady] = useState(false);
  const ref = useRef(state);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const loaded = { ...EMPTY, ...(JSON.parse(raw) as Partial<Persisted>) };
        ref.current = loaded;
        setState(loaded);
      })
      .catch((e) => console.warn('Could not load challenge stats.', e))
      .finally(() => setReady(true));
  }, []);

  const persist = useCallback((next: Persisted) => {
    ref.current = next;
    setState(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch((e) =>
      console.warn('Could not save challenge stats.', e),
    );
  }, []);

  const setMode = useCallback((mode: ModeSetting) => persist({ ...ref.current, mode }), [persist]);

  const record = useCallback(
    (key: string, score: RoundScore) => {
      const prev = ref.current;
      const old = prev.rounds[key];
      const streak = score.perfect ? prev.streak + 1 : 0;
      persist({
        ...prev,
        rounds: {
          ...prev.rounds,
          [key]: {
            plays: (old?.plays ?? 0) + 1,
            perfect: (old?.perfect ?? false) || score.perfect,
            bestPoints: Math.max(old?.bestPoints ?? 0, score.points),
            lastAt: Date.now(),
          },
        },
        points: prev.points + score.points,
        played: prev.played + 1,
        perfect: prev.perfect + (score.perfect ? 1 : 0),
        streak,
        bestStreak: Math.max(prev.bestStreak, streak),
      });
    },
    [persist],
  );

  const pickNext = useCallback((avoid?: string) => {
    const { mode, rounds } = ref.current;
    const modes: ChallengeMode[] = mode === 'mixed' ? ['synonyms', 'antonyms'] : [mode];
    const all = CHALLENGES.flatMap((c) =>
      modes.map((m) => ({ id: c.id, mode: m, key: roundKey(c.id, m), level: c.level })),
    );
    const pool = all.filter((r) => r.key !== avoid);
    // Unplayed first, then not-yet-perfect, then everything (least recently played first).
    const unplayed = pool.filter((r) => !rounds[r.key]);
    const imperfect = pool.filter((r) => rounds[r.key] && !rounds[r.key].perfect);
    const tier = unplayed.length ? unplayed : imperfect.length ? imperfect : pool;
    // Within the tier, lean toward easier words early on.
    const minLevel = Math.min(...tier.map((r) => r.level));
    const candidates = unplayed.length ? tier.filter((r) => r.level === minLevel) : tier;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    return { id: pick.id, mode: pick.mode };
  }, []);

  const reset = useCallback(() => persist({ ...EMPTY, mode: ref.current.mode }), [persist]);

  const value = useMemo<ChallengeValue>(
    () => ({ ...state, ready, setMode, record, pickNext, reset }),
    [state, ready, setMode, record, pickNext, reset],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useChallenge(): ChallengeValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useChallenge must be used inside <ChallengeProvider>');
  return v;
}
