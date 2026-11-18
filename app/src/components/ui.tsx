import Ionicons from '@expo/vector-icons/Ionicons';
import * as Speech from 'expo-speech';
import { ComponentProps, ReactNode } from 'react';
import {
  Pressable,
  PressableProps,
  ScrollView,
  ScrollViewProps,
  StyleProp,
  StyleSheet,
  Text,
  TextProps,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fonts, LangColors, MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { LangCode, LANGUAGES } from '@/content';
import { useTheme } from '@/hooks/use-theme';

type Variant = 'title' | 'heading' | 'word' | 'body' | 'secondary' | 'label' | 'small';

export function T({ variant = 'body', style, ...rest }: TextProps & { variant?: Variant }) {
  const c = useTheme();
  const color = variant === 'secondary' || variant === 'label' || variant === 'small' ? c.textSecondary : c.text;
  return <Text {...rest} style={[styles[variant], { color }, style]} />;
}

/** Scrollable screen body, centred with a max width so it reads well on tablets/desktop too. */
export function Screen({
  children,
  contentStyle,
  topInset = false,
  ...rest
}: ScrollViewProps & { children: ReactNode; contentStyle?: StyleProp<ViewStyle>; topInset?: boolean }) {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={[
        styles.screen,
        { paddingTop: (topInset ? insets.top : 0) + Spacing.lg, paddingBottom: insets.bottom + Spacing.xxl },
        contentStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      {...rest}>
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useTheme();
  return <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, style]}>{children}</View>;
}

export function LangTag({ lang, size = 'md' }: { lang: LangCode; size?: 'sm' | 'md' }) {
  const color = LangColors[lang];
  return (
    <View
      style={[styles.tag, size === 'sm' && styles.tagSm, { backgroundColor: color + '1F', borderColor: color + '55' }]}
      accessibilityLabel={LANGUAGES[lang].name}>
      <Text style={[styles.tagText, size === 'sm' && styles.tagTextSm, { color }]}>{lang.toUpperCase()}</Text>
    </View>
  );
}

export function Button({
  title,
  icon,
  kind = 'primary',
  style,
  ...rest
}: PressableProps & {
  title: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  kind?: 'primary' | 'secondary' | 'danger';
  style?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  const bg = kind === 'primary' ? c.accent : kind === 'danger' ? 'transparent' : c.surfaceAlt;
  const fg = kind === 'primary' ? c.accentText : kind === 'danger' ? c.again : c.text;
  return (
    <Pressable
      accessibilityRole="button"
      {...rest}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: rest.disabled ? 0.45 : pressed ? 0.8 : 1 },
        kind === 'danger' && { borderWidth: 1, borderColor: c.again },
        style,
      ]}>
      {icon && <Ionicons name={icon} size={18} color={fg} />}
      <Text style={[styles.buttonText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function SpeakButton({ text, lang, size = 22 }: { text: string; lang: LangCode; size?: number }) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Pronounce ${text}`}
      hitSlop={10}
      onPress={(e) => {
        e.stopPropagation?.();
        Speech.stop();
        Speech.speak(text, { language: LANGUAGES[lang].speech, rate: 0.9 });
      }}
      style={({ pressed }) => [styles.speak, { backgroundColor: c.accentSoft, opacity: pressed ? 0.7 : 1 }]}>
      <Ionicons name="volume-high" size={size} color={c.accent} />
    </Pressable>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: Spacing.sm }}>
      <T variant="label">{title}</T>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.5, fontFamily: Fonts.sans },
  heading: { fontSize: 19, fontWeight: '600', fontFamily: Fonts.sans },
  word: { fontSize: 34, fontWeight: '600', fontFamily: Fonts.serif, letterSpacing: -0.3 },
  body: { fontSize: 16, lineHeight: 23, fontFamily: Fonts.sans },
  secondary: { fontSize: 15, lineHeight: 21, fontFamily: Fonts.sans },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontFamily: Fonts.sans,
  },
  small: { fontSize: 13, lineHeight: 18, fontFamily: Fonts.sans },
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  tag: {
    borderRadius: Radius.sm,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  tagSm: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 6 },
  tagText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6 },
  tagTextSm: { fontSize: 10 },
  button: {
    minHeight: 50,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
  speak: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

/** react-native-web's Switch ignores thumbColor and uses its own teal unless told otherwise. */
export const webSwitchProps = { activeThumbColor: '#fff' } as object;
