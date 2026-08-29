import React, { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { globalTranslations } from '@/lib/global-translations';

export type LanguageCode = 'da' | 'en' | 'ar' | 'so';

export const LANGUAGES: { code: LanguageCode; label: string }[] = [
  { code: 'da', label: 'Dansk' },
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
  { code: 'so', label: 'Soomaali' },
];

const STORAGE_KEY = 'language_preference_v1';

interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => void;
  /** Looks up `textContent` (a Danish string, matching the dictionary's keys) in the
   * translation table and returns it in the current language, falling back to the
   * original text when no translation exists for that key yet. */
  tGlobal: (textContent: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>('da');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored) setLanguageState(stored as LanguageCode);
    });
  }, []);

  const setLanguage = useCallback((code: LanguageCode) => {
    setLanguageState(code);
    AsyncStorage.setItem(STORAGE_KEY, code).catch(() => {});
  }, []);

  const tGlobal = useCallback(
    (textContent: string) => globalTranslations[textContent]?.[language] || textContent,
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, tGlobal }}>{children}</LanguageContext.Provider>
  );
}

/** Shared app-wide language state + translation lookup. Replaces the earlier
 * per-component AsyncStorage hook so changing language in one screen (e.g. Mere)
 * is reflected everywhere else immediately, without a reload. */
export function useLanguagePreference() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguagePreference must be used within a LanguageProvider.');
  return ctx;
}
