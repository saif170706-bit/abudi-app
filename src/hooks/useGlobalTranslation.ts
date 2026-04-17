import { useLanguage } from '@/context/LanguageContext';
import { globalTranslations } from '@/lib/globalTranslations';

export function useGlobalTranslation() {
  const { language } = useLanguage();
  return {
    tGlobal: (textContent: string) => {
      // Return translated string if exists, else return the English/original
      return globalTranslations[textContent]?.[language] || textContent;
    },
    language
  };
}
