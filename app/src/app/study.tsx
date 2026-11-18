import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, LangTag, SpeakButton, T } from '@/components/ui';
import { WordBody } from '@/components/word-detail';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { WORDS_BY_ID } from '@/content';
import { useTheme } from '@/hooks/use-theme';
import { useProgress } from '@/state/progress';
import { formatInterval, Grade, GRADES, Rating } from '@/state/srs';

/** Cards that come back within this window are re-queued in the same session. */
const REQUEUE_WITHIN_MS = 20 * 60 * 1000;

const GRADE_META: Record<Grade, { label: string; key: 'again' | 'hard' | 'good' | 'easy' }> = {
  [Rating.Again]: { label: 'Again', key: 'again' },
  [Rating.Hard]: { label: 'Hard', key: 'hard' },
  [Rating.Good]: { label: 'Good', key: 'good' },
  [Rating.Easy]: { label: 'Easy', key: 'easy' },
};

export default function StudyScreen() {
  const c = useTheme();
  const { ready } = useProgress();
  // Wait for stored progress so the session queue is built from real data.
  if (!ready) {
    return (
      <View style={[styles.root, { backgroundColor: c.background, justifyContent: 'center' }]}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }
  return <Session />;
}

function Session() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // Keyboard hints only make sense on a desktop-sized browser window.
  const showKeyHints = Platform.OS === 'web' && width >= 700;
  const { cards, buildQueue, previewIntervals, review } = useProgress();

  // Snapshot the queue once when the session opens.
  const [initial] = useState(() => {
    const { due, fresh } = buildQueue();
    return [...due, ...fresh];
  });
  const [queue, setQueue] = useState<string[]>(initial);
  const [revealed, setRevealed] = useState(false);
  const [preview, setPreview] = useState<{ id: string; intervals: Record<Grade, number> } | null>(null);
  const [done, setDone] = useState({ reviewed: 0, again: 0 });
  const busy = useRef(false);

  const currentId = queue[0];
  const word = currentId ? WORDS_BY_ID[currentId] : undefined;
  const isNew = !!currentId && !cards[currentId];
  const intervals = preview && preview.id === currentId ? preview.intervals : null;

  useEffect(() => {
    if (!currentId) return;
    let live = true;
    previewIntervals(currentId).then((iv) => live && setPreview({ id: currentId, intervals: iv }));
    return () => {
      live = false;
    };
  }, [currentId, previewIntervals]);

  const grade = useCallback(
    async (g: Grade) => {
      if (!currentId || busy.current) return;
      busy.current = true;
      try {
        const now = new Date();
        const next = await review(currentId, g, now);
        const comesBackSoon = next.dueAt.getTime() - now.getTime() <= REQUEUE_WITHIN_MS;
        setQueue((q) => {
          const rest = q.slice(1);
          return comesBackSoon ? [...rest, currentId] : rest;
        });
        setDone((d) => ({ reviewed: d.reviewed + 1, again: d.again + (g === Rating.Again ? 1 : 0) }));
        setRevealed(false);
      } finally {
        busy.current = false;
      }
    },
    [currentId, review],
  );

  // Keyboard shortcuts on web: Space/Enter reveals, 1–4 grade.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => {
      if (!word) return;
      if (!revealed && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && ['1', '2', '3', '4'].includes(e.key)) {
        grade(GRADES[Number(e.key) - 1]);
      } else if (e.key === 'Escape') {
        router.back();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [word, revealed, grade]);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const remaining = queue.length;
  const progress = done.reviewed + remaining ? done.reviewed / (done.reviewed + remaining) : 0;

  return (
    <View
      style={[styles.root, { backgroundColor: c.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close session" onPress={close} hitSlop={12}>
          <Ionicons name="close" size={28} color={c.text} />
        </Pressable>
        <View style={[styles.progressTrack, { backgroundColor: c.surfaceAlt }]}>
          <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: c.accent }]} />
        </View>
        <T variant="small" style={{ minWidth: 28, textAlign: 'right', fontWeight: '600' }}>
          {remaining}
        </T>
      </View>

      {!word ? (
        <View style={styles.finished}>
          <Ionicons name="checkmark-circle" size={64} color={c.good} />
          <T variant="title" style={{ textAlign: 'center' }}>
            {done.reviewed ? 'Session complete' : 'Nothing to study'}
          </T>
          <T variant="secondary" style={{ textAlign: 'center' }}>
            {done.reviewed
              ? `${done.reviewed} review${done.reviewed === 1 ? '' : 's'}${done.again ? ` · ${done.again} to practise again` : ''}. Come back when cards are due.`
              : 'No reviews are due and today’s new words are done.'}
          </T>
          <Button title="Back to Today" onPress={close} style={{ alignSelf: 'stretch', marginTop: Spacing.lg }} />
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.cardArea} style={{ flex: 1 }}>
            <Pressable
              disabled={revealed}
              onPress={() => setRevealed(true)}
              accessibilityRole="button"
              accessibilityLabel={revealed ? undefined : 'Reveal answer'}>
              <Card style={styles.front}>
                <View style={styles.frontTop}>
                  <LangTag lang={word.lang} />
                  {isNew && (
                    <View style={[styles.newBadge, { backgroundColor: c.good + '22' }]}>
                      <T variant="small" style={{ color: c.good, fontWeight: '700' }}>
                        NEW
                      </T>
                    </View>
                  )}
                  <View style={{ flex: 1 }} />
                  <SpeakButton text={word.term} lang={word.lang} />
                </View>
                <T variant="word" style={styles.term}>
                  {word.term}
                </T>
                <T variant="secondary" style={{ textAlign: 'center' }}>
                  {word.ipa} · {word.pos}
                </T>
                {!revealed && (
                  <T variant="small" style={{ textAlign: 'center', marginTop: Spacing.lg }}>
                    Recall the meaning, then tap to check
                  </T>
                )}
              </Card>
            </Pressable>
            {revealed && <WordBody word={word} linkRelated={false} />}
          </ScrollView>

          <View style={[styles.actions, { borderTopColor: c.border, backgroundColor: c.background }]}>
            {!revealed ? (
              <Button title="Show answer" onPress={() => setRevealed(true)} />
            ) : (
              <View style={styles.grades}>
                {GRADES.map((g, i) => {
                  const meta = GRADE_META[g];
                  const color = c[meta.key];
                  return (
                    <Pressable
                      key={g}
                      accessibilityRole="button"
                      accessibilityLabel={`${meta.label}${intervals ? `, next in ${formatInterval(intervals[g])}` : ''}`}
                      onPress={() => grade(g)}
                      style={({ pressed }) => [
                        styles.gradeBtn,
                        { backgroundColor: color + '1C', borderColor: color + '66', opacity: pressed ? 0.7 : 1 },
                      ]}>
                      <T variant="body" style={{ color, fontWeight: '700' }}>
                        {meta.label}
                      </T>
                      <T variant="small" style={{ color }}>
                        {intervals ? formatInterval(intervals[g]) : ' '}
                      </T>
                      {showKeyHints && (
                        <T variant="small" style={{ fontSize: 10, opacity: 0.6 }}>
                          {i + 1}
                        </T>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  progressTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  cardArea: {
    padding: Spacing.lg,
    gap: Spacing.xl,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  front: { paddingVertical: Spacing.xl, gap: Spacing.sm, minHeight: 240, justifyContent: 'center' },
  frontTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    position: 'absolute',
    top: Spacing.lg,
    left: Spacing.lg,
    right: Spacing.lg,
  },
  newBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  term: { textAlign: 'center', fontSize: 40, marginTop: Spacing.xl },
  actions: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  grades: { flexDirection: 'row', gap: Spacing.sm },
  gradeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: 1,
  },
  finished: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
  },
});
