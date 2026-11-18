import '@/global.css';

import { Platform } from 'react-native';

import type { LangCode } from '@/content';

export const Colors = {
  light: {
    text: '#1C1A17',
    textSecondary: '#6E685F',
    background: '#F6F3EE',
    surface: '#FFFFFF',
    surfaceAlt: '#EEE9E1',
    border: '#E2DCD2',
    accent: '#3346C8',
    accentText: '#FFFFFF',
    accentSoft: '#E4E7FA',
    again: '#C7372F',
    hard: '#B86E00',
    good: '#23824A',
    easy: '#2F6FD0',
  },
  dark: {
    text: '#F3F0EA',
    textSecondary: '#A39D93',
    background: '#121212',
    surface: '#1D1C1A',
    surfaceAlt: '#272623',
    border: '#33312D',
    accent: '#8D9BFF',
    accentText: '#0E1235',
    accentSoft: '#262B4D',
    again: '#FF7A70',
    hard: '#F0A63A',
    good: '#5FCB88',
    easy: '#77A9FF',
  },
} as const;

export type ThemeColors = (typeof Colors)['light'] | (typeof Colors)['dark'];

/** One hue per study language, tuned to read on both light and dark surfaces. */
export const LangColors: Record<LangCode, string> = {
  en: '#7B61FF',
  es: '#E8590C',
  fr: '#1C7ED6',
  de: '#2F9E44',
  it: '#E03E7A',
};

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif', mono: 'ui-monospace' },
  web: { sans: 'var(--font-display)', serif: 'var(--font-serif)', mono: 'var(--font-mono)' },
  default: { sans: 'normal', serif: 'serif', mono: 'monospace' },
});

export const Spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const Radius = { sm: 8, md: 14, lg: 20, pill: 999 } as const;
export const MaxContentWidth = 640;
