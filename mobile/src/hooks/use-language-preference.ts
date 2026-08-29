import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type LanguageCode = 'da' | 'en' | 'ar' | 'so';

export const LANGUAGES: { code: LanguageCode; label: string }[] = [
  { code: 'da', label: 'Dansk' },
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية' },
  { code: 'so', label: 'Soomaali' },
];

const STORAGE_KEY = 'language_preference_v1';

/**
 * Stores the user's language preference. Note: this only persists the
 * choice for now — actual UI translation (like the web app's
 * useGlobalTranslation/LanguageContext) hasn't been ported yet, that's a
 * much larger follow-up task touching every screen's copy.
 */
export function useLanguagePreference() {
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

  return { language, setLanguage };
}
