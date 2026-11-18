import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { LANG_CODES, LangCode, WORDS, WORDS_BY_ID } from '@/content';

import { getScheduler, Grade, GRADES, reviveCard, SrsCard } from './srs';

const STORAGE_KEY = 'vocab-builder/v1';
const MAX_LOG = 5000;

export type Settings = {
  newPerDay: number;
  languages: LangCode[];
};

export type ReviewEntry = { id: string; grade: Grade; at: number };

type Persisted = {
  version: 1;
  cards: Record<string, SrsCard>;
  log: ReviewEntry[];
  settings: Settings;
  /** How many brand-new cards were introduced on `date` (local YYYY-MM-DD). */
  newToday: { date: string; count: number };
};

const DEFAULT_SETTINGS: Settings = { newPerDay: 10, languages: [...LANG_CODES] };

function emptyState(): Persisted {
  return { version: 1, cards: {}, log: [], settings: DEFAULT_SETTINGS, newToday: { date: dayKey(), count: 0 } };
}

export function dayKey(d: Date | number = new Date()): string {
  const x = new Date(d);
  const mm = String(x.getMonth() + 1).padStart(2, '0');
  const dd = String(x.getDate()).padStart(2, '0');
  return `${x.getFullYear()}-${mm}-${dd}`;
}

/** New words in teaching order: by level, round-robin across languages for variety. */
const NEW_ORDER: string[] = (() => {
  const out: string[] = [];
  for (const level of [1, 2, 3] as const) {
    const buckets = LANG_CODES.map((l) => WORDS.filter((w) => w.level === level && w.lang === l));
    const max = Math.max(...buckets.map((b) => b.length));
    for (let i = 0; i < max; i++) for (const b of buckets) if (b[i]) out.push(b[i].id);
  }
  return out;
})();

type ProgressValue = {
  ready: boolean;
  cards: Record<string, SrsCard>;
  log: ReviewEntry[];
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  /** Due reviews + today's allowance of new words, for the selected languages. */
  buildQueue: (now?: Date) => { due: string[]; fresh: string[] };
  newRemainingToday: number;
  /** Interval (ms from now) each grade would schedule for this word. */
  previewIntervals: (id: string, now?: Date) => Promise<Record<Grade, number>>;
  review: (id: string, grade: Grade, now?: Date) => Promise<SrsCard>;
  resetAll: () => Promise<void>;
};

const ProgressContext = createContext<ProgressValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(emptyState);
  const [ready, setReady] = useState(false);
  // Mirror of `state` for async callbacks; only written outside render.
  const stateRef = useRef(state);

  // Load once.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Persisted;
          const cards: Record<string, SrsCard> = {};
          for (const [id, c] of Object.entries(parsed.cards ?? {})) {
            if (WORDS_BY_ID[id]) cards[id] = reviveCard(c);
          }
          const languages = (parsed.settings?.languages ?? []).filter((l) => LANG_CODES.includes(l));
          const loaded: Persisted = {
            version: 1,
            cards,
            log: parsed.log ?? [],
            settings: {
              newPerDay: parsed.settings?.newPerDay ?? DEFAULT_SETTINGS.newPerDay,
              languages: languages.length ? languages : DEFAULT_SETTINGS.languages,
            },
            newToday: parsed.newToday ?? { date: dayKey(), count: 0 },
          };
          stateRef.current = loaded;
          setState(loaded);
        }
      } catch (e) {
        console.warn('Could not load progress; starting fresh.', e);
      } finally {
        setReady(true);
      }
    })();
    // Warm the scheduler so the first card isn't delayed.
    getScheduler();
  }, []);

  const persist = useCallback((next: Persisted) => {
    stateRef.current = next;
    setState(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch((e) => console.warn('Could not save progress.', e));
  }, []);

  const newCountToday = state.newToday.date === dayKey() ? state.newToday.count : 0;
  const newRemainingToday = Math.max(0, state.settings.newPerDay - newCountToday);

  const buildQueue = useCallback(
    (now = new Date()) => {
      const { cards, settings } = stateRef.current;
      const langs = new Set(settings.languages);
      const due = Object.entries(cards)
        .filter(([id, c]) => langs.has(WORDS_BY_ID[id].lang) && c.dueAt.getTime() <= now.getTime())
        .sort((a, b) => a[1].dueAt.getTime() - b[1].dueAt.getTime())
        .map(([id]) => id);
      const fresh = NEW_ORDER.filter((id) => !cards[id] && langs.has(WORDS_BY_ID[id].lang)).slice(0, newRemainingToday);
      return { due, fresh };
    },
    [newRemainingToday],
  );

  const previewIntervals = useCallback(async (id: string, now = new Date()) => {
    const s = await getScheduler();
    const card = stateRef.current.cards[id] ?? s.newCard({ now });
    const out = {} as Record<Grade, number>;
    for (const p of s.preview({ card, now })) {
      if ((GRADES as number[]).includes(p.grade)) out[p.grade as Grade] = p.card.dueAt.getTime() - now.getTime();
    }
    return out;
  }, []);

  const review = useCallback(
    async (id: string, grade: Grade, now = new Date()) => {
      const s = await getScheduler();
      const prev = stateRef.current;
      const isNew = !prev.cards[id];
      const card = prev.cards[id] ?? s.newCard({ now });
      const next = s.review({ card, grade, now }).card as SrsCard;
      const today = dayKey(now);
      const baseCount = prev.newToday.date === today ? prev.newToday.count : 0;
      persist({
        ...prev,
        cards: { ...prev.cards, [id]: next },
        log: [...prev.log, { id, grade, at: now.getTime() }].slice(-MAX_LOG),
        newToday: { date: today, count: baseCount + (isNew ? 1 : 0) },
      });
      return next;
    },
    [persist],
  );

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      const prev = stateRef.current;
      persist({ ...prev, settings: { ...prev.settings, ...patch } });
    },
    [persist],
  );

  const resetAll = useCallback(async () => {
    const fresh = { ...emptyState(), settings: stateRef.current.settings };
    persist(fresh);
  }, [persist]);

  const value = useMemo<ProgressValue>(
    () => ({
      ready,
      cards: state.cards,
      log: state.log,
      settings: state.settings,
      updateSettings,
      buildQueue,
      newRemainingToday,
      previewIntervals,
      review,
      resetAll,
    }),
    [ready, state, updateSettings, buildQueue, newRemainingToday, previewIntervals, review, resetAll],
  );

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress(): ProgressValue {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used inside <ProgressProvider>');
  return ctx;
}

/** Consecutive days (ending today, or yesterday if nothing yet today) with at least one review. */
export function computeStreak(log: ReviewEntry[], now = new Date()): number {
  const days = new Set(log.map((e) => dayKey(e.at)));
  const cursor = new Date(now);
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
