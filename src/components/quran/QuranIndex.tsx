'use client';

import React, { useState, useEffect, useMemo, FormEvent } from 'react';
import { Loader2, Search, History, BookOpen, ChevronRight, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useQuranData } from '@/context/QuranDataContext';
import { surahs } from '@/app/lib/surahs';
import { useRecentQuranVisits } from '@/hooks/use-recent-quran-visits';
import { useLanguage, type Language } from '@/context/LanguageContext';
import IslamicDivider from '@/components/ui/IslamicDivider';
import { motion, AnimatePresence } from 'framer-motion';

interface SurahData {
  number: number;
  name: string;
  englishName: string;
  arabicName: string;
  revelationPlace: 'Meccan' | 'Medinan';
  versesCount: number;
  page: number;
}

interface QuranIndexProps {
  onNavigate: (page: number) => void;
  BackButton: React.ComponentType;
}

import { useGlobalTranslation } from '@/hooks/useGlobalTranslation';

// ... (types same) ...

export default function QuranIndex({ onNavigate, BackButton }: QuranIndexProps) {
  const { quranData, isLoading: isContextLoading, error: quranError } = useQuranData();
  const { visits: recentVisits } = useRecentQuranVisits();
  const [allSurahs, setAllSurahs] = useState<SurahData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pageNumberInput, setPageNumberInput] = useState('');
  const { toast } = useToast();
  const { language } = useLanguage();
  const { tGlobal } = useGlobalTranslation();

  useEffect(() => {
    if (isContextLoading || quranError || !quranData?.versePageMap) return;

    const surahsWithPage: SurahData[] = surahs.map(surahMeta => {
        const firstVerseKey = `${surahMeta.number}:1`;
        const page = quranData.versePageMap.get(firstVerseKey) || 1;
        return {
            number: surahMeta.number,
            name: surahMeta.englishName,
            englishName: surahMeta.englishName,
            arabicName: surahMeta.name,
            revelationPlace: surahMeta.revelationType,
            versesCount: surahMeta.numberOfAyahs,
            page: page,
        };
    });
    setAllSurahs(surahsWithPage);
  }, [isContextLoading, quranData, quranError]);
  
  const handlePageSearch = (e: FormEvent) => {
    e.preventDefault();
    const pageNum = parseInt(pageNumberInput, 10);
    if (isNaN(pageNum) || pageNum < 1 || pageNum > 604) {
      toast({ variant: 'destructive', title: tGlobal('Ugyldig side'), description: tGlobal('Vælg venligst en side mellem 1 og 604.') });
      return;
    }
    onNavigate(pageNum);
  };

  const filteredSurahs = useMemo(() => {
    if (!searchTerm) return allSurahs;
    const term = searchTerm.toLowerCase().replace(/-/g, ' ');
    return allSurahs.filter(s => 
        s.englishName.toLowerCase().replace(/-/g, ' ').includes(term) ||
        s.arabicName.toLowerCase().includes(term) ||
        String(s.number).includes(term)
      );
  }, [searchTerm, allSurahs]);
  
  if (isContextLoading) {
    return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen pt-12 pb-32 px-6 w-full max-w-lg mx-auto space-y-10">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex items-center justify-between">
          <div>
              <h1 className="text-5xl font-display text-primary tracking-tight">{tGlobal('quran')}</h1>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-accent mt-2">{tGlobal('Udforsk de hellige skrifter')}</p>
          </div>
          <div className="h-16 w-16 rounded-[24px] bg-primary/5 flex items-center justify-center border border-primary/10">
              <BookOpen className="h-8 w-8 text-primary" />
          </div>
      </motion.div>

      <Tabs defaultValue="surah" className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-16 bg-primary/5 p-2 rounded-[28px] border border-primary/5">
          <TabsTrigger value="surah" className="rounded-2xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg active:scale-95 transition-all">
            {tGlobal('surah')}
          </TabsTrigger>
          <TabsTrigger value="page" className="rounded-2xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-lg active:scale-95 transition-all">
            {tGlobal('Side')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="surah" className="mt-8 space-y-8 outline-none">
          <div className="relative group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-primary/20 group-focus-within:text-primary transition-colors" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={tGlobal('Find din surah...')}
              className="h-16 rounded-[28px] pl-16 pr-6 text-base font-bold bg-primary/5 border-white/40 focus:bg-white focus:shadow-xl transition-all"
            />
          </div>

          {recentVisits.length > 0 && !searchTerm && (
            <div className="space-y-4">
              <div className="section-label flex items-center gap-2">
                  <History className="h-3 w-3" />
                  {tGlobal('Nyligt besøgt')}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {recentVisits.slice(0, 2).map(visit => (
                  <motion.div
                    key={visit.page}
                    whileHover={{ y: -5 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onNavigate(visit.page)}
                    className="glass-card shadow-sm cursor-pointer"
                  >
                    <div className="glass-card-inner !p-4 text-center">
                        <p className="font-bold text-primary truncate text-sm">{visit.surahName}</p>
                        <p className="text-[10px] text-accent font-black uppercase tracking-widest mt-1">{tGlobal('Side')} {visit.page}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          <IslamicDivider />

          <div className="grid grid-cols-1 gap-4">
            {filteredSurahs.length > 0 ? (
              filteredSurahs.map((surah, idx) => (
                <motion.div
                  key={surah.number}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx < 10 ? idx * 0.05 : 0 }}
                  whileHover={{ x: 5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onNavigate(surah.page)}
                  className="glass-card group cursor-pointer"
                >
                  <div className="glass-card-inner !py-5 !px-6 flex items-center gap-5">
                    <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center font-display text-lg text-primary group-hover:bg-accent group-hover:text-white transition-all">
                      {surah.number}
                    </div>
                    <div className="flex-grow">
                      <h3 className="font-bold text-[17px] text-primary">{surah.englishName}</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest text-primary/30 mt-1">
                        {surah.revelationPlace === 'Meccan' ? tGlobal('Makki') : tGlobal('Madani')} • {surah.versesCount} {tGlobal('vers')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-quran text-3xl text-primary group-hover:text-accent transition-colors">{surah.arabicName}</p>
                    </div>
                  </div>
                </motion.div>
              ))
            ) : searchTerm && (
              <div className="py-20 text-center space-y-4">
                <div className="h-16 w-16 bg-primary/5 rounded-full flex items-center justify-center mx-auto">
                    <Search className="h-8 w-8 text-primary/20" />
                </div>
                <p className="text-primary/40 font-bold">{tGlobal('noResults').replace('{searchTerm}', searchTerm)}</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="page" className="mt-12 outline-none">
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="max-w-xs mx-auto text-center space-y-10">
            <div className="space-y-4">
              <div className="h-24 w-24 bg-accent/10 rounded-[40px] flex items-center justify-center mx-auto shadow-inner">
                <BookOpen className="h-12 w-12 text-accent" />
              </div>
              <h3 className="text-3xl font-display text-primary">{tGlobal('goToPage')}</h3>
              <p className="text-[10px] font-black uppercase tracking-widest text-primary/30">{tGlobal('Vælg en side mellem 1 og 604')}</p>
            </div>
            
            <form onSubmit={handlePageSearch} className="space-y-6">
              <Input
                type="number"
                inputMode="numeric"
                value={pageNumberInput}
                onChange={(e) => setPageNumberInput(e.target.value)}
                placeholder="1 - 604"
                className="h-20 text-center text-4xl font-display rounded-[32px] border-white focus:shadow-2xl bg-white/60 backdrop-blur-md transition-all"
              />
              <Button type="submit" className="w-full h-20 rounded-[32px] text-lg font-black uppercase tracking-[0.2em] bg-primary text-white shadow-2xl active:scale-95 transition-all">
                {tGlobal('go')}
              </Button>
            </form>
          </motion.div>
        </TabsContent>
      </Tabs>
      <IslamicDivider />
    </div>
  );
}
