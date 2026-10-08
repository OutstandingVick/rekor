import { useEffect, useState } from "react";

/** A per-viewer UI preference in localStorage. Falls back silently when storage is unavailable. */
export function usePref<T>(key: string, initial: T) {
  const [v, setV] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(`rekor.pref.${key}`);
      return raw ? ({ ...initial, ...JSON.parse(raw) } as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(`rekor.pref.${key}`, JSON.stringify(v));
    } catch {
      // preference only
    }
  }, [key, v]);
  return [v, setV] as const;
}
