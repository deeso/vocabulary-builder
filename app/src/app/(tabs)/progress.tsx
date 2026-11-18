import Ionicons from '@expo/vector-icons/Ionicons';
import { Alert, Platform, Pressable, StyleSheet, Switch, View } from 'react-native';

import { Button, Card, Screen, Section, T, webSwitchProps } from '@/components/ui';
import { LangColors, Radius, Spacing } from '@/constants/theme';
import { LANG_CODES, LANGUAGES, WORDS, WORDS_BY_ID } from '@/content';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { dayKey, useProgress } from '@/state/progress';
import { isLearning, Rating, State } from '@/state/srs';

const NEW_PER_DAY_OPTIONS = [5, 10, 15, 20, 30];

export default function ProgressScreen() {
  const c = useTheme();
  const { cards, log, settings, updateSettings, resetAll } = useProgress();
  const now = useNow();

  const all = Object.entries(cards);
  const known = all.filter(([, x]) => x.state === State.Review).length;
  const learning = all.filter(([, x]) => isLearning(x)).length;
  const unseen = WORDS.length - all.length;

  // Reviews per day for the last 7 days (oldest first).
  const days = [...Array(7)].map((_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (6 - i));
    return { key: dayKey(d), label: d.toLocaleDateString(undefined, { weekday: 'narrow' }), n: 0 };
  });
  const byKey = Object.fromEntries(days.map((d) => [d.key, d]));
  for (const e of log) {
    const k = dayKey(e.at);
    if (byKey[k]) byKey[k].n++;
  }
  const maxDay = Math.max(1, ...days.map((d) => d.n));

  const monthAgo = now.getTime() - 30 * 86400000;
  const recent = log.filter((e) => e.at >= monthAgo);
  const accuracy = recent.length
    ? Math.round((100 * recent.filter((e) => e.grade !== Rating.Again).length) / recent.length)
    : null;

  const toggleLang = (l: (typeof LANG_CODES)[number], on: boolean) => {
    const next = on ? [...settings.languages, l] : settings.languages.filter((x) => x !== l);
    if (next.length === 0) return; // keep at least one language
    updateSettings({ languages: LANG_CODES.filter((x) => next.includes(x)) });
  };

  const confirmReset = () => {
    const msg = 'This clears every review and starts all words from scratch. Settings are kept.';
    if (Platform.OS === 'web') {
      if (window.confirm(`Reset all progress?\n\n${msg}`)) resetAll();
    } else {
      Alert.alert('Reset all progress?', msg, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => resetAll() },
      ]);
    }
  };

  return (
    <Screen>
      <View style={styles.row3}>
        <Summary value={known} label="Known" color={c.good} />
        <Summary value={learning} label="Learning" color={c.hard} />
        <Summary value={unseen} label="Not started" color={c.textSecondary} />
      </View>

      <Section title="Last 7 days">
        <Card>
          <View style={styles.chart}>
            {days.map((d) => (
              <View key={d.key} style={styles.barCol}>
                <T variant="small" style={{ fontSize: 11, opacity: d.n ? 1 : 0 }}>
                  {d.n}
                </T>
                <View style={[styles.barTrack]}>
                  <View
                    style={{
                      height: `${(d.n / maxDay) * 100}%`,
                      minHeight: d.n ? 4 : 0,
                      backgroundColor: c.accent,
                      borderRadius: 4,
                    }}
                  />
                </View>
                <T variant="small">{d.label}</T>
              </View>
            ))}
          </View>
          <T variant="small">
            {recent.length} reviews in the last 30 days
            {accuracy !== null ? ` · ${accuracy}% recalled` : ''}
          </T>
        </Card>
      </Section>

      <Section title="By language">
        <Card style={{ gap: Spacing.md }}>
          {LANG_CODES.map((l) => {
            const total = WORDS.filter((w) => w.lang === l).length;
            const k = all.filter(([id, x]) => WORDS_BY_ID[id].lang === l && x.state === State.Review).length;
            return (
              <View key={l} style={{ gap: 6 }}>
                <View style={styles.langRow}>
                  <T variant="body" style={{ fontWeight: '600' }}>
                    {LANGUAGES[l].name}
                  </T>
                  <T variant="small">
                    {k} / {total}
                  </T>
                </View>
                <View style={[styles.track, { backgroundColor: c.surfaceAlt }]}>
                  <View style={[styles.fill, { width: `${(k / total) * 100}%`, backgroundColor: LangColors[l] }]} />
                </View>
              </View>
            );
          })}
        </Card>
      </Section>

      <Section title="Study settings">
        <Card style={{ gap: Spacing.lg }}>
          <View style={{ gap: Spacing.sm }}>
            <T variant="body" style={{ fontWeight: '600' }}>
              New words per day
            </T>
            <View style={styles.segment}>
              {NEW_PER_DAY_OPTIONS.map((n) => {
                const active = settings.newPerDay === n;
                return (
                  <Pressable
                    key={n}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => updateSettings({ newPerDay: n })}
                    style={[styles.segItem, { backgroundColor: active ? c.accent : c.surfaceAlt }]}>
                    <T variant="body" style={{ color: active ? c.accentText : c.text, fontWeight: '600' }}>
                      {n}
                    </T>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ gap: Spacing.xs }}>
            <T variant="body" style={{ fontWeight: '600' }}>
              Languages to study
            </T>
            {LANG_CODES.map((l) => {
              const on = settings.languages.includes(l);
              return (
                <View key={l} style={styles.switchRow}>
                  <View style={[styles.langDot, { backgroundColor: LangColors[l] }]} />
                  <T variant="body" style={{ flex: 1 }}>
                    {LANGUAGES[l].name} <T variant="secondary">· {LANGUAGES[l].native}</T>
                  </T>
                  <Switch
                    value={on}
                    onValueChange={(v) => toggleLang(l, v)}
                    disabled={on && settings.languages.length === 1}
                    trackColor={{ true: c.accent, false: c.border }}
                    thumbColor="#fff"
                    {...webSwitchProps}
                    accessibilityLabel={`Study ${LANGUAGES[l].name}`}
                  />
                </View>
              );
            })}
          </View>
        </Card>
      </Section>

      <View style={styles.note}>
        <Ionicons name="lock-closed-outline" size={14} color={c.textSecondary} />
        <T variant="small" style={{ flex: 1 }}>
          Progress is stored only on this device. Scheduling uses the FSRS spaced-repetition algorithm.
        </T>
      </View>
      <Button title="Reset progress" kind="danger" icon="refresh" onPress={confirmReset} />
    </Screen>
  );
}

function Summary({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <Card style={{ flex: 1, alignItems: 'center', paddingVertical: Spacing.md, gap: 2 }}>
      <T style={{ fontSize: 26, fontWeight: '700', color }}>{value}</T>
      <T variant="small">{label}</T>
    </Card>
  );
}

const styles = StyleSheet.create({
  row3: { flexDirection: 'row', gap: Spacing.sm },
  chart: { flexDirection: 'row', height: 130, gap: Spacing.sm, alignItems: 'flex-end' },
  barCol: { flex: 1, alignItems: 'center', gap: 4, height: '100%' },
  barTrack: { flex: 1, width: '70%', maxWidth: 28, justifyContent: 'flex-end' },
  langRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  segment: { flexDirection: 'row', gap: Spacing.sm },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: Radius.sm },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: 6 },
  langDot: { width: 10, height: 10, borderRadius: 5 },
  note: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start', paddingHorizontal: Spacing.xs },
});
