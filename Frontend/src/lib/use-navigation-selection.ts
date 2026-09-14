"use client";

import { useCallback, useSyncExternalStore } from 'react';

const navigationEvent = 'marc-navigation-change';

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange);
  window.addEventListener(navigationEvent, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(navigationEvent, onChange);
  };
}

// Keep navigation in the URL so reloads and separate browser tabs retain their own view.
export function useNavigationSelection<T extends string>(
  parameter: string,
  fallback: T,
  choices: readonly T[],
): [T, (value: string) => void] {
  const allowedValues = JSON.stringify(choices);
  const getSnapshot = useCallback(() => {
    const value = new URLSearchParams(window.location.search).get(parameter);
    return value && (JSON.parse(allowedValues) as string[]).includes(value) ? value as T : fallback;
  }, [parameter, fallback, allowedValues]);
  const value = useSyncExternalStore(subscribe, getSnapshot, () => fallback);
  const select = useCallback((next: string) => {
    if (!(JSON.parse(allowedValues) as string[]).includes(next)) return;
    const url = new URL(window.location.href);
    url.searchParams.set(parameter, next);
    window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    window.dispatchEvent(new Event(navigationEvent));
  }, [parameter, allowedValues]);
  return [value, select];
}
