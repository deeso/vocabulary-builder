import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

/**
 * A render-safe "current time": captured once, then refreshed whenever the
 * screen regains focus (e.g. returning from a study session).
 */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useFocusEffect(useCallback(() => setNow(new Date()), []));
  return now;
}
