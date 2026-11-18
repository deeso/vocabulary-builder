import { Scheme, useThemePref } from '@/state/theme';

/** The app's effective colour scheme: the user's choice, or the system setting when set to "System". */
export function useColorScheme(): Scheme {
  return useThemePref().scheme;
}
