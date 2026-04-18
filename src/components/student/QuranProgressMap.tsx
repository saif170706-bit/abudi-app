'use client';

import React, { useState, useMemo } from 'react';
import { TOTAL_PAGES, TOTAL_JUZ, getJuzPageRange } from '@/lib/student-logic';
import { cn } from '@/lib/utils';
import { LayoutGrid, BookOpen, Map } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { surahs } from '@/app/lib/surahs';
import { useGlobalTranslation } from '@/hooks/useGlobalTranslation';

interface QuranProgressMapProps {
  completedPages: Set<number>;
  completedSurahs?: Set<number>;
  completedJuz?: Set<number>;
  className?: string;
}

// ── Mini circular progress ring ──────────────────────────────────────────
function Ring({ pct, size = 36 }: { pct: number; size?: number }) {
  const r = (size - 4) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-primary/10" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ - dash}
        className={pct === 100 ? 'text-accent' : 'text-primary'}
        style={{ transition: 'stroke-dashoffset 1s ease-out' }}
      />
    </svg>
  );
}

type MapView = 'pages' | 'juz' | 'surahs';

export default function QuranProgressMap({
  completedPages,
  completedSurahs = new Set(),
  completedJuz = new Set(),
  className,
}: QuranProgressMapProps) {
  const [mapView, setMapView] = useState<MapView>('pages');
  const [selectedSurah, setSelectedSurah] = useState<number | null>(null);

  const surahProgress = useMemo(() => {
    // Build surah → page range lookup from the surahs list
    return surahs.map(s => {
      const done = completedSurahs.has(s.number);
      return { ...s, done };
    });
  }, [completedSurahs]);

  const { tGlobal } = useGlobalTranslation();
  const overallPct = Math.round((completedPages.size / TOTAL_PAGES) * 100);

  const tabs: { key: MapView; label: string }[] = [
    { key: 'pages', label: tGlobal('Sider') },
    { key: 'juz', label: tGlobal('Juz') },
    { key: 'surahs', label: tGlobal('Suraher') },
  ];

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={cn('glass-card overflow-visible animate-glass-border', className)}
    >
      <div className="glass-card-inner !p-6 sm:!p-8">
        {/* Arabic pattern bg */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none overflow-hidden rounded-[inherit]">
          <div className="absolute inset-0 bg-[url('https://i.postimg.cc/xC74tT1V/flat-arabic-pattern-background-79603-1826.avif')] bg-cover" />
        </div>

        {/* Header */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/5 dark:bg-white/5 flex items-center justify-center border border-primary/5">
              <Map className="h-6 w-6 text-accent" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-primary dark:text-white/90">
                {tGlobal('Quran kortet')}
              </h3>
              <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-accent mt-0.5">
                {overallPct}% {tGlobal('af Quranen fuldført')}
              </p>
            </div>
          </div>

          {/* View switcher */}
          <div className="flex bg-primary/5 dark:bg-white/5 p-1 rounded-2xl w-fit self-start sm:self-center border border-primary/5">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setMapView(tab.key)}
                className={cn(
                  'px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                  mapView === tab.key
                    ? 'bg-primary text-white shadow-lg'
                    : 'text-primary/40 dark:text-white/30'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Views ── */}
        <div className="relative z-10">
          <AnimatePresence mode="wait">

            {/* Pages heatmap */}
            {mapView === 'pages' && (
              <motion.div
                key="pages"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-[repeat(auto-fill,minmax(13px,1fr))] gap-[3px]">
                  {Array.from({ length: TOTAL_PAGES }).map((_, i) => {
                    const pageNum = i + 1;
                    const isCompleted = completedPages.has(pageNum);
                    return (
                      <div
                        key={pageNum}
                        className={cn(
                          'aspect-square rounded-[2px] transition-all duration-500',
                          isCompleted
                            ? 'bg-gradient-to-br from-primary to-[#00695C] shadow-sm ring-1 ring-white/10'
                            : 'bg-primary/5 dark:bg-white/5 border border-primary/5 dark:border-white/5'
                        )}
                        title={`${tGlobal('Side')} ${pageNum}`}
                      />
                    );
                  })}
                </div>

                <div className="flex items-center gap-8 pt-4 border-t border-primary/5 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-sm bg-gradient-to-br from-primary to-[#00695C]" />
                    <span className="text-[10px] uppercase font-black tracking-widest text-primary/40 dark:text-white/30">{tGlobal('Færdig')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-sm bg-primary/5 border border-primary/5" />
                    <span className="text-[10px] uppercase font-black tracking-widest text-primary/40 dark:text-white/30">{tGlobal('Mangler')}</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Juz progress bars */}
            {mapView === 'juz' && (
              <motion.div
                key="juz"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="grid grid-cols-2 sm:grid-cols-3 gap-3"
              >
                {Array.from({ length: TOTAL_JUZ }).map((_, i) => {
                  const juzNum = i + 1;
                  const [start, end] = getJuzPageRange(juzNum);
                  const pagesInJuz = end - start + 1;
                  
                  const completedInJuz = Array.from(completedPages)
                    .filter(p => p >= start && p <= end).length;
                  
                  const progress = (completedInJuz / pagesInJuz) * 100;
                  const isDone = completedJuz.has(juzNum) || progress === 100;

                  return (
                    <div
                      key={juzNum}
                      className={cn(
                        'p-4 rounded-[24px] border overflow-hidden relative transition-all',
                        isDone
                          ? 'bg-gradient-to-br from-accent/10 to-accent/5 border-accent/30'
                          : 'bg-white/40 dark:bg-white/5 border-white dark:border-white/10'
                      )}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary/40 dark:text-white/30">
                          {tGlobal('Juz')} {juzNum}
                        </span>
                        <span className={cn('text-sm font-display', isDone ? 'text-accent' : 'text-primary dark:text-white/80')}>
                          {Math.round(progress)}%
                        </span>
                      </div>
                      <div className="h-2 w-full bg-primary/5 dark:bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 1.2, delay: i * 0.025, ease: 'circOut' }}
                          className={cn(
                            'h-full rounded-full',
                            isDone
                              ? 'bg-gradient-to-r from-accent to-[#F5C842]'
                              : 'bg-gradient-to-r from-primary to-[#00695C]'
                          )}
                        />
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}

            {/* Surahs grid — the "Quran Court" */}
            {mapView === 'surahs' && (
              <motion.div
                key="surahs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-[repeat(auto-fill,minmax(56px,1fr))] gap-2">
                  {surahProgress.map(s => {
                    const isActive = selectedSurah === s.number;
                    return (
                      <motion.button
                        key={s.number}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => setSelectedSurah(isActive ? null : s.number)}
                        className={cn(
                          'flex flex-col items-center justify-center gap-1 p-2 rounded-2xl border transition-all text-center',
                          s.done
                            ? 'bg-gradient-to-br from-accent/15 to-accent/5 border-accent/40 shadow-sm'
                            : 'bg-white/30 dark:bg-white/5 border-white/50 dark:border-white/10',
                          isActive && 'ring-2 ring-accent ring-offset-1'
                        )}
                      >
                        <span className={cn(
                          'text-[9px] font-black leading-none',
                          s.done ? 'text-accent' : 'text-primary/30 dark:text-white/30'
                        )}>
                          {s.number}
                        </span>
                        <span className={cn(
                          'text-[11px] font-quran leading-none',
                          s.done ? 'text-primary dark:text-white' : 'text-primary/40 dark:text-white/20'
                        )}>
                          {s.name}
                        </span>
                        {s.done && (
                          <span className="text-[8px] text-accent font-black">✓</span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Surah detail tooltip */}
                <AnimatePresence>
                  {selectedSurah && (() => {
                    const s = surahProgress.find(x => x.number === selectedSurah);
                    if (!s) return null;
                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="p-4 rounded-2xl bg-primary/5 dark:bg-white/5 border border-primary/10 dark:border-white/10 flex items-center gap-4"
                      >
                        <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shrink-0">
                          <span className="text-white text-xs font-black">{s.number}</span>
                        </div>
                        <div>
                          <p className="font-black text-primary dark:text-white/90">{s.name}</p>
                          <p className="text-[11px] text-primary/40 dark:text-white/30">{s.englishName} · {s.numberOfAyahs} ayah</p>
                          <p className={cn('text-[10px] font-black uppercase tracking-widest mt-1',
                            s.done ? 'text-accent' : 'text-primary/20 dark:text-white/20'
                          )}>
                            {s.done ? `✓ ${tGlobal('Memoreret')}` : tGlobal('Ikke memoreret')}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })()}
                </AnimatePresence>

                {/* Summary */}
                <div className="flex items-center gap-6 pt-4 border-t border-primary/5 dark:border-white/5">
                  <div>
                    <span className="text-2xl font-display text-accent">{completedSurahs.size}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary/30 dark:text-white/20 ml-2">/ 114 {tGlobal('suraher')}</span>
                  </div>
                  <div className="flex-1 h-2 bg-primary/5 dark:bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(completedSurahs.size / 114) * 100}%` }}
                      transition={{ duration: 1.5, ease: 'circOut' }}
                      className="h-full bg-gradient-to-r from-accent to-[#F5C842] rounded-full"
                    />
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
