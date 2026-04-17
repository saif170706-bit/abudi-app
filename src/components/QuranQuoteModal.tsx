'use client';

import React, { useEffect, useState } from 'react';
import { quranQuotes, type Quote } from '@/lib/quran-quotes';
import { useLanguage } from '@/context/LanguageContext';
import { Dialog, DialogContent, DialogOverlay, DialogTitle } from '@/components/ui/dialog';
import { DoilyModalFrame } from './DoilyModalFrame';

interface QuranQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const translations = {
  quranReminder: { da: 'Koranpåmindelse', en: 'Quran Reminder', ar: 'تذكير بالقرآن' , so: "Xusuusiyaha Qur'aanka"},
};

export function QuranQuoteModal({ isOpen, onClose }: QuranQuoteModalProps) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const { language } = useLanguage();
  const t = (key: keyof typeof translations) => translations[key][language] || translations[key].en;

  useEffect(() => {
    if (isOpen) {
      const randomIndex = Math.floor(Math.random() * quranQuotes.length);
      setQuote(quranQuotes[randomIndex]);
    }
  }, [isOpen]);

  if (!quote) return null;

  const quoteText = quote[language] || quote.en;
  const quoteArabic = quote.ar;
  const sourceText = quote.source;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
       <DialogTitle className="sr-only">{t('quranReminder')}</DialogTitle>
      <DialogOverlay className="bg-black/75 backdrop-blur-lg" />
      <DialogContent className="bg-transparent border-none shadow-none p-0 flex items-center justify-center min-h-screen" hideCloseButton>
        <DoilyModalFrame
          bgImageUrl="https://i.postimg.cc/85Bh4kQK/Chat-GPT-Image-31-jan-2026-22-56-35.png"
          size={520}
        >
          <div className="w-full h-full flex items-center justify-center">
            {/* Safe zone inside the cloud */}
            <div className="w-[64%] h-[72%] translate-y-[14%] flex flex-col items-center text-center">
              {/* TEXT (smaller + lower) */}
              <div className="w-full overflow-hidden mt-[3.375rem]">
                {language === "ar" ? (
                  <p
                    dir="rtl"
                    className="
                      font-quran text-slate-900 leading-relaxed
                      drop-shadow-[0_2px_10px_rgba(255,255,255,0.75)]
                      text-[clamp(16px,3.4vw,21px)]
                      break-words
                      max-w-[24ch] mx-auto
                      line-clamp-4
                    "
                  >
                    {quoteArabic}
                  </p>
                ) : (
                  <p
                    dir="ltr"
                    className="
                      font-semibold text-slate-900 leading-snug
                      drop-shadow-[0_2px_10px_rgba(255,255,255,0.75)]
                      text-[clamp(12px,2.2vw,15px)]
                      break-words
                      max-w-[24ch] mx-auto
                      line-clamp-5
                    "
                  >
                    “{quoteText}”
                  </p>
                )}
                <p className="mt-2 text-[clamp(10px,2.0vw,12px)] text-slate-800 max-w-[28ch] mx-auto">
                  — {sourceText}
                </p>
              </div>

              {/* This pushes the button down */}
              <div className="mt-auto" />

              {/* BUTTON (small + lower) */}
              <button
                onClick={onClose}
                className="
                  mb-[3.75rem]
                  rounded-full
                  border border-amber-200
                  bg-amber-50
                  px-6 py-2
                  text-[clamp(12px,2.2vw,14px)]
                  font-semibold text-amber-900
                  shadow-[0_8px_18px_rgba(0,0,0,0.10)]
                  outline-none
                  focus:outline-none
                  focus-visible:ring-0
                "
              >
                OK
              </button>
            </div>
          </div>
        </DoilyModalFrame>
      </DialogContent>
    </Dialog>
  );
}
