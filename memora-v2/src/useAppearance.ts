import { useEffect, useState } from 'react';

export type Appearance = 'light' | 'dark';

const storageKey = 'memora-v2.appearance';

function initialAppearance(): Appearance {
  try {
    const saved = window.localStorage.getItem(storageKey);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* La apariencia sigue disponible sin almacenamiento. */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useAppearance() {
  const [appearance, setAppearance] = useState<Appearance>(initialAppearance);

  useEffect(() => {
    document.documentElement.dataset.appearance = appearance;
    document.documentElement.style.colorScheme = appearance;
    document.querySelector?.('meta[name="theme-color"]')?.setAttribute('content', appearance === 'dark' ? '#131923' : '#f3f5f8');
    try { window.localStorage.setItem(storageKey, appearance); } catch { /* Preferencia temporal. */ }
  }, [appearance]);

  return {
    appearance,
    toggleAppearance: () => setAppearance((current) => current === 'light' ? 'dark' : 'light'),
  };
}
