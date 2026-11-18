import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, Screen, T } from '@/components/ui';
import { WordHeader } from '@/components/word-detail';
import { Spacing } from '@/constants/theme';
import { WORDS, wordOfTheDay } from '@/content';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { computeStreak, useProgress } from '@/state/progress';
import { formatInterval, State } from '@/state/srs';

export default function TodayScreen() {
  const c = useTheme();
  const { ready, cards, log, settings, buildQueue } = useProgress();
  // Refreshed whenever the tab regains focus, so due counts stay current.
  const now = useNow();

  if (!ready) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator color={c.accent} />
      </View>
    );
  }

  const { due, fresh } = buildQueue(now);
  const total = due.length + fresh.length;
  const streak = computeStreak(log, now);
  const known = Object.values(cards).filter((x) => x.state === State.Review).length;
  const studying = WORDS.filter((w) => settings.languages.includes(w.lang)).length;
  const nextDue = Object.values(cards)
    .map((x) => x.dueAt.getTime())
    .filter((t) => t > now.getTime())
    .sort((a, b) => a - b)[0];
  const wotd = wordOfTheDay(now);

  return (
    <Screen topInset>
      <View style={styles.top}>
        <View style={{ flex: 1 }}>
          <T variant="label">{now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</T>
          <T variant="title">Today</T>
        </View>
        <View style={[styles.streak, { backgroundColor: c.surfaceAlt }]} accessibilityLabel={`${streak} day streak`}>
          <Ionicons name="flame" size={18} color={streak > 0 ? c.hard : c.textSecondary} />
          <T variant="body" style={{ fontWeight: '700' }}>
            {streak}
          </T>
        </View>
      </View>

      <Card style={{ gap: Spacing.lg }}>
        <View style={styles.stats}>
          <Stat value={due.length} label="To review" color={c.easy} />
          <Stat value={fresh.length} label="New words" color={c.good} />
          <Stat value={known} label={`Known of ${studying}`} color={c.text} />
        </View>
        {total > 0 ? (
          <Button title={`Start session · ${total}`} icon="play" onPress={() => router.push('/study')} />
        ) : (
          <View style={{ gap: Spacing.xs, alignItems: 'center', paddingVertical: Spacing.xs }}>
            <T variant="heading">All caught up</T>
            <T variant="secondary" style={{ textAlign: 'center' }}>
              {nextDue
                ? `Next review in ${formatInterval(nextDue - now.getTime())}. New words unlock tomorrow.`
                : 'Come back tomorrow for new words.'}
            </T>
          </View>
        )}
      </Card>

      <Pressable
        accessibilityRole="link"
        onPress={() => router.navigate('/challenge')}
        style={({ pressed }) => pressed && { opacity: 0.85 }}>
        <Card style={styles.challenge}>
          <View style={[styles.challengeIcon, { backgroundColor: c.accentSoft }]}>
            <Ionicons name="extension-puzzle" size={22} color={c.accent} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="heading">Synonym & antonym challenge</T>
            <T variant="secondary">Find every match for a word — with definitions to learn from.</T>
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.textSecondary} />
        </Card>
      </Pressable>

      <Pressable
        accessibilityRole="link"
        onPress={() => router.push({ pathname: '/word/[id]', params: { id: wotd.id } })}
        style={({ pressed }) => pressed && { opacity: 0.85 }}>
        <Card style={{ gap: Spacing.md }}>
          <T variant="label" style={{ color: c.accent }}>
            Word of the day
          </T>
          <WordHeader word={wotd} big={false} />
          <T variant="heading">{wotd.gloss}</T>
          {wotd.fact && (
            <T variant="secondary" numberOfLines={3}>
              {wotd.fact}
            </T>
          )}
          <View style={styles.more}>
            <T variant="small" style={{ color: c.accent, fontWeight: '600' }}>
              Etymology & related words
            </T>
            <Ionicons name="arrow-forward" size={14} color={c.accent} />
          </View>
        </Card>
      </Pressable>
    </Screen>
  );
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <T style={{ fontSize: 30, fontWeight: '700', color }}>{value}</T>
      <T variant="small" style={{ textAlign: 'center' }}>
        {label}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  top: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.md },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 4,
  },
  stats: { flexDirection: 'row' },
  more: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  challenge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  challengeIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
