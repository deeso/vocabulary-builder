import Ionicons from '@expo/vector-icons/Ionicons';
import { ComponentProps, ComponentRef, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, SpeakButton, T, webSwitchProps } from '@/components/ui';
import { MaxContentWidth, Radius, Spacing, ThemeColors } from '@/constants/theme';
import { buildRound, POINTS, RoundOption, RoundScore, scoreRound } from '@/content/challenge';
import { useTheme } from '@/hooks/use-theme';
import { ModeSetting, useChallenge } from '@/state/challenge';

const MODES: { key: ModeSetting; label: string }[] = [
  { key: 'synonyms', label: 'Synonyms' },
  { key: 'antonyms', label: 'Antonyms' },
  { key: 'mixed', label: 'Mixed' },
];

const GROUP_LABEL = { synonym: 'Synonym', antonym: 'Antonym', unrelated: 'Not related' } as const;

type Status = 'idle' | 'selected' | 'found' | 'missed' | 'wrong' | 'neutral';

export default function ChallengeScreen() {
  const c = useTheme();
  const { ready } = useChallenge();
  if (!ready) {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }
  return <Game />;
}

function Game() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);
  const { mode, setMode, pickNext, record, points, played, perfect, streak } = useChallenge();

  const [current, setCurrent] = useState(() => pickNext());
  const [picked, setPicked] = useState<Set<string>>(() => new Set());
  const [result, setResult] = useState<RoundScore | null>(null);
  const [hints, setHints] = useState(false);
  const round = useMemo(() => buildRound(current.id, current.mode), [current]);
  const checked = result !== null;
  const isSyn = round.mode === 'synonyms';
  const modeColor = isSyn ? c.good : c.again;

  const startRound = (next: { id: string; mode: typeof current.mode }) => {
    setCurrent(next);
    setPicked(new Set());
    setResult(null);
    scroller.current?.scrollTo({ y: 0, animated: false });
  };

  const changeMode = (m: ModeSetting) => {
    if (m === mode) return;
    setMode(m);
    // Switch immediately unless the round in progress already fits the new mode.
    if (checked || (m !== 'mixed' && m !== current.mode)) startRound(pickNext(round.key));
  };

  const toggle = (word: string) => {
    if (checked) return;
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(word)) next.delete(word);
      else next.add(word);
      return next;
    });
  };

  const check = () => {
    const score = scoreRound(round, picked, hints);
    record(round.key, score);
    setResult(score);
  };

  const statusOf = (o: RoundOption): Status => {
    const on = picked.has(o.word);
    if (!checked) return on ? 'selected' : 'idle';
    if (o.isTarget) return on ? 'found' : 'missed';
    return on ? 'wrong' : 'neutral';
  };

  const showList = hints || checked;

  return (
    <View style={[styles.fill, { backgroundColor: c.background }]}>
      <ScrollView
        ref={scroller}
        style={styles.fill}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.lg }]}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <T variant="label">Word challenge</T>
            <T variant="title">Find them all</T>
          </View>
          <View style={[styles.pill, { backgroundColor: c.surfaceAlt }]} accessibilityLabel={`${points} points`}>
            <Ionicons name="star" size={16} color={c.hard} />
            <T variant="body" style={{ fontWeight: '700' }}>
              {points}
            </T>
          </View>
        </View>

        <T variant="small">
          {played} round{played === 1 ? '' : 's'} · {perfect} perfect · streak {streak}
        </T>

        <View style={[styles.segment, { backgroundColor: c.surfaceAlt }]}>
          {MODES.map((m) => {
            const active = mode === m.key;
            return (
              <Pressable
                key={m.key}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => changeMode(m.key)}
                style={[styles.segItem, active && { backgroundColor: c.surface }]}>
                <T variant="small" style={{ color: active ? c.text : c.textSecondary, fontWeight: '700' }}>
                  {m.label}
                </T>
              </Pressable>
            );
          })}
        </View>

        <Card style={{ gap: Spacing.sm }}>
          <View style={styles.promptRow}>
            <Ionicons name={isSyn ? 'git-merge-outline' : 'swap-horizontal'} size={16} color={modeColor} />
            <T variant="label" style={{ color: modeColor }}>
              Find all {round.targetCount} {isSyn ? 'synonyms' : 'antonyms'} of
            </T>
          </View>
          <View style={styles.wordRow}>
            <T variant="word" style={{ flexShrink: 1 }}>
              {round.entry.word}
            </T>
            <SpeakButton text={round.entry.word} lang="en" />
          </View>
          <T variant="secondary" style={{ fontStyle: 'italic' }}>
            {round.entry.pos}
          </T>
          <T variant="body">{round.entry.definition}</T>
          <T variant="secondary">“{round.entry.example}”</T>
        </Card>

        {!checked && (
          <View style={styles.hintRow}>
            <View style={{ flex: 1 }}>
              <T variant="body" style={{ fontWeight: '600' }}>
                Show definitions
              </T>
              <T variant="small">Learn as you play · no perfect-round bonus</T>
            </View>
            <Switch
              value={hints}
              onValueChange={setHints}
              trackColor={{ true: c.accent, false: c.border }}
              thumbColor="#fff"
              {...webSwitchProps}
              accessibilityLabel="Show definitions for each option"
            />
          </View>
        )}

        {showList ? (
          <Card style={{ padding: 0, gap: 0 }}>
            {round.options.map((o, i) => (
              <OptionRow
                key={o.word}
                option={o}
                status={statusOf(o)}
                checked={checked}
                first={i === 0}
                onPress={() => toggle(o.word)}
                c={c}
              />
            ))}
          </Card>
        ) : (
          <View style={styles.chips}>
            {round.options.map((o) => {
              const on = picked.has(o.word);
              return (
                <Pressable
                  key={o.word}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  onPress={() => toggle(o.word)}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      backgroundColor: on ? c.accent : c.surface,
                      borderColor: on ? c.accent : c.border,
                      opacity: pressed ? 0.75 : 1,
                    },
                  ]}>
                  <T variant="body" style={{ color: on ? c.accentText : c.text, fontWeight: '600' }}>
                    {o.word}
                  </T>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <View style={[styles.bar, { borderTopColor: c.border, backgroundColor: c.background }]}>
        {result ? (
          <View style={{ gap: Spacing.md }}>
            <ResultLine result={result} total={round.targetCount} usedHints={hints} c={c} />
            <Button title="Next word" icon="arrow-forward" onPress={() => startRound(pickNext(round.key))} />
          </View>
        ) : (
          <Button
            title={picked.size ? `Check · ${picked.size} selected` : `Pick the ${isSyn ? 'synonyms' : 'antonyms'}`}
            icon={picked.size ? 'checkmark' : undefined}
            disabled={picked.size === 0}
            onPress={check}
          />
        )}
      </View>
    </View>
  );
}

function ResultLine({
  result,
  total,
  usedHints,
  c,
}: {
  result: RoundScore;
  total: number;
  usedHints: boolean;
  c: ThemeColors;
}) {
  const parts = [`${result.found} of ${total} found`];
  if (result.wrong) parts.push(`${result.wrong} wrong`);
  return (
    <View style={styles.resultRow}>
      <Ionicons
        name={result.perfect ? 'trophy' : result.found ? 'checkmark-done' : 'refresh'}
        size={22}
        color={result.perfect ? c.hard : result.found ? c.good : c.textSecondary}
      />
      <View style={{ flex: 1 }}>
        <T variant="body" style={{ fontWeight: '700' }}>
          {result.perfect ? 'Perfect!' : result.found === total ? 'All found — watch the extras' : 'Keep going'}
        </T>
        <T variant="small">
          {parts.join(' · ')}
          {result.perfect && !usedHints ? ` · +${POINTS.perfectBonus} bonus` : ''}
        </T>
      </View>
      <T variant="heading" style={{ color: c.hard }}>
        +{result.points}
      </T>
    </View>
  );
}

const STATUS_META: Record<
  Status,
  { icon: ComponentProps<typeof Ionicons>['name']; color: (c: ThemeColors) => string; label?: string }
> = {
  idle: { icon: 'square-outline', color: (c) => c.textSecondary },
  selected: { icon: 'checkbox', color: (c) => c.accent },
  found: { icon: 'checkmark-circle', color: (c) => c.good, label: 'Found' },
  missed: { icon: 'alert-circle', color: (c) => c.hard, label: 'Missed' },
  wrong: { icon: 'close-circle', color: (c) => c.again, label: 'Wrong pick' },
  neutral: { icon: 'remove-circle-outline', color: (c) => c.textSecondary },
};

function OptionRow({
  option,
  status,
  checked,
  first,
  onPress,
  c,
}: {
  option: RoundOption;
  status: Status;
  checked: boolean;
  first: boolean;
  onPress: () => void;
  c: ThemeColors;
}) {
  const meta = STATUS_META[status];
  const color = meta.color(c);
  const groupColor = option.group === 'synonym' ? c.good : option.group === 'antonym' ? c.again : c.textSecondary;
  // Explain the trap whenever it matters: always for decoys, and for any wrong pick.
  const showNote = checked && !!option.note && (status === 'wrong' || option.group === 'unrelated');
  return (
    <Pressable
      disabled={checked}
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: status === 'selected', disabled: checked }}
      style={({ pressed }) => [
        styles.optRow,
        !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
        (status === 'found' || status === 'missed' || status === 'wrong') && { backgroundColor: color + '14' },
        pressed && { opacity: 0.7 },
      ]}>
      <Ionicons name={meta.icon} size={22} color={color} style={{ marginTop: 1 }} />
      <View style={{ flex: 1, gap: 3 }}>
        <View style={styles.optTop}>
          <T variant="body" style={{ fontWeight: '700', fontSize: 17 }}>
            {option.word}
          </T>
          {checked && (
            <T variant="small" style={{ color: groupColor, fontWeight: '700' }}>
              {GROUP_LABEL[option.group]}
            </T>
          )}
          {meta.label && (
            <T variant="small" style={{ color, fontWeight: '700', marginLeft: 'auto' }}>
              {meta.label}
            </T>
          )}
        </View>
        <T variant="secondary">{option.definition}</T>
        {showNote && (
          <T variant="small" style={{ color: c.text }}>
            <T variant="small" style={{ fontWeight: '700', color: c.text }}>
              Why not?{' '}
            </T>
            {option.note}
          </T>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.md },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 4,
  },
  segment: { flexDirection: 'row', borderRadius: Radius.md, padding: 3 },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: Radius.md - 3 },
  promptRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  wordRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 10 },
  optRow: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  optTop: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm, flexWrap: 'wrap' },
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
});
