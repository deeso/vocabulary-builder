import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { LangColors, Radius, Spacing } from '@/constants/theme';
import { langName, RELATION_LABEL, relatedFor, Word, WORDS_BY_ID } from '@/content';
import { useTheme } from '@/hooks/use-theme';

import { Card, LangTag, Section, SpeakButton, T } from './ui';

export function WordHeader({ word, big = true }: { word: Word; big?: boolean }) {
  return (
    <View style={{ gap: Spacing.xs }}>
      <View style={styles.headerRow}>
        <LangTag lang={word.lang} />
        <T variant="small">{word.pos}</T>
      </View>
      <View style={styles.termRow}>
        <T variant="word" style={[{ flexShrink: 1 }, !big && { fontSize: 28 }]}>
          {word.term}
        </T>
        <SpeakButton text={word.term} lang={word.lang} />
      </View>
      <T variant="secondary" style={{ fontFamily: undefined }}>
        {word.ipa}
      </T>
    </View>
  );
}

/** Everything below the header: meaning, example, etymology, fact, relations. */
export function WordBody({ word, linkRelated = true }: { word: Word; linkRelated?: boolean }) {
  const c = useTheme();
  const related = relatedFor(word.id);
  return (
    <View style={{ gap: Spacing.lg }}>
      <Section title="Meaning">
        <T variant="heading">{word.gloss}</T>
        {word.definition !== word.gloss && word.definition.length > word.gloss.length + 2 && (
          <T variant="body">{word.definition}</T>
        )}
      </Section>

      <Section title="Example">
        <View style={[styles.quote, { borderLeftColor: LangColors[word.lang] }]}>
          <T variant="body" style={{ fontStyle: 'italic' }}>
            {word.example}
          </T>
          {word.exampleTranslation && <T variant="secondary">{word.exampleTranslation}</T>}
        </View>
      </Section>

      <Section title="Etymology">
        <T variant="body">{word.etymology}</T>
      </Section>

      {word.fact && (
        <Card style={{ backgroundColor: c.accentSoft, borderColor: 'transparent' }}>
          <View style={styles.factHead}>
            <Ionicons name="sparkles" size={16} color={c.accent} />
            <T variant="label" style={{ color: c.accent }}>
              Did you know?
            </T>
          </View>
          <T variant="body">{word.fact}</T>
        </Card>
      )}

      {related.length > 0 && (
        <Section title="Across languages">
          <Card style={{ padding: 0, gap: 0 }}>
            {related.map((r, i) => {
              const target = r.id ? WORDS_BY_ID[r.id] : undefined;
              const canOpen = linkRelated && !!target;
              const body = (
                <View
                  style={[
                    styles.relRow,
                    i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
                  ]}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <View style={styles.relTop}>
                      <T variant="body" style={{ fontWeight: '600' }}>
                        {r.term}
                      </T>
                      <T variant="small">{langName(r.lang)}</T>
                    </View>
                    <T variant="small">
                      <T
                        variant="small"
                        style={{ color: r.kind === 'false-friend' ? c.again : c.textSecondary, fontWeight: '600' }}>
                        {RELATION_LABEL[r.kind]}
                      </T>
                      {r.note ? ` · ${r.note}` : ''}
                    </T>
                  </View>
                  {canOpen && <Ionicons name="chevron-forward" size={18} color={c.textSecondary} />}
                </View>
              );
              return canOpen ? (
                <Pressable
                  key={`${r.lang}-${r.term}`}
                  accessibilityRole="link"
                  onPress={() => router.push({ pathname: '/word/[id]', params: { id: r.id! } })}
                  style={({ pressed }) => pressed && { opacity: 0.6 }}>
                  {body}
                </Pressable>
              ) : (
                <View key={`${r.lang}-${r.term}`}>{body}</View>
              );
            })}
          </Card>
        </Section>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  termRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, justifyContent: 'space-between' },
  quote: { borderLeftWidth: 3, paddingLeft: Spacing.md, gap: Spacing.xs, borderRadius: Radius.sm / 4 },
  factHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  relRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md },
  relTop: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm, flexWrap: 'wrap' },
});
