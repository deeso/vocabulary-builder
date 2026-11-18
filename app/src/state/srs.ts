import { DefaultScheduler, type DefaultSchedulerCard, Rating, State } from 'ts-fsrs';

export { Rating, State };

type Scheduler = DefaultScheduler<'FSRS-7'>;
export type SrsCard = DefaultSchedulerCard<'FSRS-7'>;
export type Grade = typeof Rating.Again | typeof Rating.Hard | typeof Rating.Good | typeof Rating.Easy;

export const GRADES: Grade[] = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy];

let schedulerPromise: Promise<Scheduler> | null = null;

/** One shared FSRS-7 scheduler with classic learning steps (1m → 10m). */
export function getScheduler(): Promise<Scheduler> {
  schedulerPromise ??= DefaultScheduler<'FSRS-7'>({
    version: 'FSRS-7',
    desiredRetention: 0.9,
    enableShortTerm: true,
    learningSteps: ['1m', '10m'],
    relearningSteps: ['10m'],
    allowModelOverride: false,
    enableFuzz: true,
    maximumInterval: 3650,
  });
  return schedulerPromise;
}

/** Cards go through JSON in storage; bring the Date fields back. */
export function reviveCard(raw: any): SrsCard {
  return {
    ...raw,
    dueAt: new Date(raw.dueAt),
    lastReviewAt: raw.lastReviewAt ? new Date(raw.lastReviewAt) : null,
  } as SrsCard;
}

export function isLearning(card: SrsCard): boolean {
  return card.state === State.Learning || card.state === State.Relearning;
}

/** "1m", "10m", "4h", "3d", "2mo", "1.2y" */
export function formatInterval(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60000));
  if (min < 60) return `${min}m`;
  const h = min / 60;
  if (h < 24) return `${Math.round(h)}h`;
  const d = h / 24;
  if (d < 30) return `${Math.round(d)}d`;
  if (d < 365) return `${Math.round(d / 30)}mo`;
  return `${(d / 365).toFixed(1).replace(/\.0$/, '')}y`;
}
