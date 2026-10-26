import type { ReactNode } from 'react';

// Types for LanguageContext.js (plain JS), so TypeScript screens can use `t`.
export type Lang = 'en' | 'fr';

export function LanguageProvider(props: { children: ReactNode }): JSX.Element | null;

export function useLanguage(): {
  lang: Lang;
  setLang: (value: Lang) => void;
  toggleLang: () => void;
  /** Translation strings for the current language. */
  t: Record<string, string>;
};
