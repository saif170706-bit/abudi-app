'use client';

import React, { useState, useEffect } from 'react';
import { WifiOff, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage, type Language } from '@/context/LanguageContext';

const translations: Record<string, Record<Language, string>> = {
  label: { 
    da: 'Offline • Viser gemt data', 
    en: 'Offline • Showing cached data', 
    ar: 'غير متصل • عرض البيانات المحفوظة', 
    so: 'Offline • Tusaya xogta kaydsan' 
  }
};

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const { language } = useLanguage();

  useEffect(() => {
    // Initial check
    setIsOffline(!navigator.onLine);

    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const t = translations.label[language] || translations.label.en;

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-4 left-0 right-0 z-[9999] flex justify-center pointer-events-none px-4"
        >
          <div className="bg-primary text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-3 backdrop-blur-md bg-opacity-95 border border-white/10 pointer-events-auto select-none">
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 bg-white/20 rounded-full animate-ping scale-150" />
              <div className="relative bg-white/10 p-1 rounded-full">
                <WifiOff className="h-3.5 w-3.5 text-white/90" />
              </div>
            </div>
            <span className="text-[11px] font-black uppercase tracking-[0.15em] whitespace-nowrap">
              {t}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
