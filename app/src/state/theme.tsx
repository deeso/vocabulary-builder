import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform, useColorScheme as useSystemScheme } from 'react-native';

export type ThemePref = 'system' | 'light' | 'dark';
export type Scheme = 'light' | 'dark';

/** Also read by the inline script injected into index.html (scripts/postexport.mjs). */
export const THEME_KEY = 'vocab-builder/theme';

const isPref = (v: unknown): v is ThemePref => v === 'system' || v === 'light' || v === 'dark';

/** On web, AsyncStorage is plain localStorage, so read it synchronously to avoid a flash. */
function readInitial(): ThemePref {
  if (Platform.OS !== 'web') return 'system';
  try {
    const v = window.localStorage.getItem(THEME_KEY);
    return isPref(v) ? v : 'system';
  } catch {
    return 'system';
  }
}

type ThemeValue = { pref: ThemePref; scheme: Scheme; setPref: (p: ThemePref) => void };

const Ctx = createContext<ThemeValue | null>(null);

export function ThemePrefProvider({ children }: { children: ReactNode }) {
  const system = useSystemScheme();
  const [pref, setPrefState] = useState<ThemePref>(readInitial);

  // Native: load the stored preference asynchronously.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    AsyncStorage.getItem(THEME_KEY)
      .then((v) => isPref(v) && setPrefState(v))
      .catch(() => {});
  }, []);

  const setPref = useCallback((p: ThemePref) => {
    setPrefState(p);
    AsyncStorage.setItem(THEME_KEY, p).catch((e) => console.warn('Could not save theme.', e));
  }, []);

  const scheme: Scheme = pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;

  // Web: keep <html> in sync so the page background and native controls match the theme.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const root = document.documentElement;
    root.dataset.theme = scheme;
    root.style.colorScheme = scheme;
  }, [scheme]);

  const value = useMemo(() => ({ pref, scheme, setPref }), [pref, scheme, setPref]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useThemePref(): ThemeValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useThemePref must be used inside <ThemePrefProvider>');
  return v;
}
