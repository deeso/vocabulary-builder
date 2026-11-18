import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { LangTag, T } from '@/components/ui';
import { LangColors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { LANG_CODES, LangCode, LANGUAGES, Word, WORDS } from '@/content';
import { useTheme } from '@/hooks/use-theme';
import { useProgress } from '@/state/progress';
import { isLearning, State } from '@/state/srs';

/** Strip accents so "deja" finds "déjà" and "companero" finds "compañero". */
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function WordsScreen() {
  const c = useTheme();
  const { cards } = useProgress();
  const [query, setQuery] = useState('');
  const [lang, setLang] = useState<LangCode | 'all'>('all');

  const list = useMemo(() => {
    const q = fold(query.trim());
    return WORDS.filter((w) => lang === 'all' || w.lang === lang)
      .filter((w) => !q || fold(w.term).includes(q) || fold(w.gloss).includes(q))
      .sort((a, b) => fold(a.term).localeCompare(fold(b.term)));
  }, [query, lang]);

  const statusColor = (w: Word) => {
    const card = cards[w.id];
    if (!card) return c.border;
    if (card.state === State.Review) return c.good;
    return isLearning(card) ? c.hard : c.border;
  };

  return (
    <FlatList
      style={{ backgroundColor: c.background }}
      contentContainerStyle={styles.content}
      data={list}
      keyExtractor={(w) => w.id}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={{ gap: Spacing.md, paddingBottom: Spacing.md }}>
          <View style={[styles.search, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Ionicons name="search" size={18} color={c.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search words or meanings"
              placeholderTextColor={c.textSecondary}
              style={[styles.input, { color: c.text }]}
              autoCorrect={false}
              autoCapitalize="none"
              clearButtonMode="while-editing"
              accessibilityLabel="Search words"
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip label="All" active={lang === 'all'} onPress={() => setLang('all')} />
            {LANG_CODES.map((l) => (
              <Chip
                key={l}
                label={LANGUAGES[l].name}
                color={LangColors[l]}
                active={lang === l}
                onPress={() => setLang(l)}
              />
            ))}
          </ScrollView>
          <T variant="small">
            {list.length} {list.length === 1 ? 'word' : 'words'}
          </T>
        </View>
      }
      ListEmptyComponent={
        <T variant="secondary" style={{ textAlign: 'center', marginTop: Spacing.xl }}>
          No words match “{query}”.
        </T>
      }
      renderItem={({ item: w, index }) => (
        <Pressable
          accessibilityRole="link"
          onPress={() => router.push({ pathname: '/word/[id]', params: { id: w.id } })}
          style={({ pressed }) => [
            styles.row,
            { backgroundColor: c.surface, borderColor: c.border },
            index === 0 && styles.first,
            index === list.length - 1 && styles.last,
            index > 0 && { borderTopWidth: 0 },
            pressed && { opacity: 0.6 },
          ]}>
          <View style={[styles.dot, { backgroundColor: statusColor(w) }]} />
          <View style={{ flex: 1, gap: 2 }}>
            <T variant="body" style={{ fontWeight: '600', fontSize: 17 }}>
              {w.term}
            </T>
            <T variant="small" numberOfLines={1}>
              {w.gloss}
            </T>
          </View>
          <LangTag lang={w.lang} size="sm" />
          <Ionicons name="chevron-forward" size={16} color={c.textSecondary} />
        </Pressable>
      )}
    />
  );
}

function Chip({
  label,
  active,
  color,
  onPress,
}: {
  label: string;
  active: boolean;
  color?: string;
  onPress: () => void;
}) {
  const c = useTheme();
  const tint = color ?? c.accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: active ? tint : c.border, backgroundColor: active ? tint + '22' : c.surface },
      ]}>
      <T variant="small" style={{ color: active ? tint : c.text, fontWeight: '600' }}>
        {label}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    minHeight: 46,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: 10, outlineStyle: 'none' as any },
  chips: { gap: Spacing.sm },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  first: { borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg },
  last: { borderBottomLeftRadius: Radius.lg, borderBottomRightRadius: Radius.lg },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
