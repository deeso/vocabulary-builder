import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ChallengeProvider } from '@/state/challenge';
import { ProgressProvider } from '@/state/progress';
import { ThemePrefProvider } from '@/state/theme';

// Deep links (e.g. a shared /word/... URL) still get the tabs underneath, so Back works.
export const unstable_settings = { initialRouteName: '(tabs)' };

export default function RootLayout() {
  return (
    <ThemePrefProvider>
      <ThemedApp />
    </ThemePrefProvider>
  );
}

function ThemedApp() {
  const scheme = useColorScheme();
  const c = Colors[scheme];
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: c.accent,
      background: c.background,
      card: c.surface,
      text: c.text,
      border: c.border,
    },
  };

  return (
    <SafeAreaProvider>
      <ThemeProvider value={navTheme}>
        <ProgressProvider>
          <ChallengeProvider>
            <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
            <Stack screenOptions={{ headerShadowVisible: false, headerBackButtonDisplayMode: 'minimal' }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false, title: 'Vocabulary' }} />
              <Stack.Screen name="word/[id]" options={{ title: '' }} />
              <Stack.Screen name="study" options={{ presentation: 'fullScreenModal', headerShown: false }} />
            </Stack>
          </ChallengeProvider>
        </ProgressProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
