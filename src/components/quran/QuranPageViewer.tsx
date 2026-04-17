'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, ArrowRight, X } from 'lucide-react';
import MushafPage from './MushafPage';
import { useQuranData } from '@/context/QuranDataContext';
import { useLanguage } from '@/context/LanguageContext';


interface QuranPageViewerProps {
  initialPageNumber: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function QuranPageViewer({
  initialPageNumber,
  open,
  onOpenChange,
}: QuranPageViewerProps) {
  const { quranData, isLoading: isQuranDataLoading } = useQuranData();
  const { language } = useLanguage();
  const [currentPage, setCurrentPage] = useState(initialPageNumber);

  // Reset to initial page when the dialog is reopened with a new initial page
  useEffect(() => {
      if (open) {
          setCurrentPage(initialPageNumber);
      }
  }, [initialPageNumber, open])


  const handleNextPage = () => {
    if (currentPage < 604) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const getPageHeaderInfo = () => {
    // Static Juz mapping
    const getStaticJuz = (p: number) => {
      let j = 1;
      if (p <= 21) j = 1;
      else if (p >= 582) j = 30;
      else j = Math.floor((p - 2) / 20) + 1;
      
      return language === 'ar' ? `الجزء ${j}` : `Juz ${j}`;
    };

    const juzTitle = getStaticJuz(currentPage);

    if (!quranData?.versePageMap || !quranData.allSurahs) return { surah: '...', juz: juzTitle };
    
    // Find the first ayah on the page to determine Surah
     for (const [key, page] of quranData.versePageMap.entries()) {
        if (page === currentPage) {
            const ayahData = quranData.ayahsByKey.get(key);
            if(ayahData) {
               const surahInfo = quranData.allSurahs.find(s => s.number === ayahData.surah_number);
               return {
                  surah: surahInfo?.englishName || `Surah ${ayahData.surah_number}`,
                  juz: juzTitle
               }
            }
        }
    }
    return { surah: `Side ${currentPage}`, juz: juzTitle };
  };

  const { surah, juz } = getPageHeaderInfo();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-screen w-screen max-w-full flex flex-col p-0 sm:p-0 md:p-0 lg:p-0">
        <DialogHeader className="flex flex-row items-center justify-between p-4 border-b bg-background sticky top-0 z-10">
          <div className="flex items-baseline gap-4">
            <DialogTitle className="text-xl font-bold font-headline">{surah}</DialogTitle>
            <DialogDescription>{juz}</DialogDescription>
          </div>
          <DialogClose asChild>
            <Button variant="ghost" size="icon">
              <X className="h-5 w-5" />
            </Button>
          </DialogClose>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto p-4 md:p-6" dir="rtl">
          {isQuranDataLoading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-12 w-12 animate-spin" />
            </div>
          ) : quranData ? (
             <MushafPage
                pageNumber={currentPage}
                onAyahClick={() => {}}
                isAyahSelected={() => false}
                onSelectionStart={() => {}}
                onSelectionMove={() => {}}
                onSelectionEnd={() => {}}
                nowPlayingKey={null}
                activeWord={null}
              />
          ) : (
             <div className="flex justify-center items-center h-full text-destructive">
              Kunne ikke indlæse Koranen data.
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t bg-background sticky bottom-0 z-10 flex-row justify-between items-center">
          <Button
            variant="outline"
            onClick={handlePrevPage}
            disabled={currentPage === 1 || isQuranDataLoading}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Forrige Side
          </Button>
          <p className="text-sm font-medium text-muted-foreground">
            Side {currentPage}
          </p>
          <Button
            variant="outline"
            onClick={handleNextPage}
            disabled={currentPage === 604 || isQuranDataLoading}
          >
            Næste Side
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
