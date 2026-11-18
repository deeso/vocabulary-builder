import { Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Screen, T } from '@/components/ui';
import { WordBody, WordHeader } from '@/components/word-detail';
import { Spacing } from '@/constants/theme';
import { LANGUAGES, WORDS_BY_ID } from '@/content';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { useProgress } from '@/state/progress';
import { formatInterval, State } from '@/state/srs';

export default function WordScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useTheme();
  const { cards } = useProgress();
  const now = useNow();
  const word = id ? WORDS_BY_ID[id] : undefined;

  if (!word) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Not found' }} />
        <T variant="heading">That word isn’t in the dictionary yet.</T>
      </Screen>
    );
  }

  const card = cards[word.id];
  let status = 'Not studied yet';
  if (card) {
    const ms = card.dueAt.getTime() - now.getTime();
    const when = ms <= 0 ? 'due now' : `next review in ${formatInterval(ms)}`;
    status = `${card.state === State.Review ? 'Known' : 'Learning'} · ${when} · ${card.reps} review${card.reps === 1 ? '' : 's'}`;
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: LANGUAGES[word.lang].name }} />
      <WordHeader word={word} />
      <View
        style={{
          backgroundColor: c.surfaceAlt,
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 6,
          alignSelf: 'flex-start',
        }}>
        <T variant="small">{status}</T>
      </View>
      <View style={{ height: Spacing.xs }} />
      <WordBody word={word} />
    </Screen>
  );
}
