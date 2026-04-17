'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';

export type Language = 'da' | 'en' | 'ar' | 'so';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('da'); // Default to Danish

  useEffect(() => {
    const storedLang = localStorage.getItem('app-language') as Language;
    if (storedLang && ['da', 'en', 'ar', 'so'].includes(storedLang)) {
      setLanguageState(storedLang);
      document.documentElement.lang = storedLang;
    } else {
        document.documentElement.lang = 'da';
    }
  }, []);

  const setLanguage = (lang: Language) => {
    localStorage.setItem('app-language', lang);
    setLanguageState(lang);
    document.documentElement.lang = lang;
  };
  
  const value = useMemo(() => ({ language, setLanguage }), [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
