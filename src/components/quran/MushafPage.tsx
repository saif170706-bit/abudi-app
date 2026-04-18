'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';
import type { LayoutLine } from './QuranReader';
import { useQuranData } from '@/context/QuranDataContext';
import { Ayah } from './Ayah';
import { Loader2 } from 'lucide-react';
import { useTheme } from 'next-themes';

interface MushafPageProps {
  pageNumber: number;
  onAyahClick: (verseKey: string, e: React.MouseEvent | React.TouchEvent) => void;
  isAyahSelected: (verseKey: string) => boolean;
  onSelectionStart: (verseKey: string, e: React.MouseEvent | React.TouchEvent) => void;
  onSelectionMove: (verseKey: string) => void;
  onSelectionEnd: () => void;
  nowPlayingKey: string | null;
  activeWord: number | null;
}

export default function MushafPage({ 
    pageNumber, 
    onAyahClick, 
    isAyahSelected, 
    onSelectionStart, 
    onSelectionMove, 
    onSelectionEnd,
    nowPlayingKey,
    activeWord
}: MushafPageProps) {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const { quranData, isLoading, error } = useQuranData();
    const fontName = `QuranPage${pageNumber}`;
    const pageRef = useRef<HTMLDivElement>(null);
    const [isFontLoaded, setIsFontLoaded] = useState(false);
    
    // Explicit hex colors to bypass any CSS variable/inheritance bugs on iPhone
    const forcedColor = resolvedTheme === 'dark' ? '#ffffff' : '#000000';
    
    useEffect(() => {
        setMounted(true);
    }, []);
    
    const pageContent = useMemo(() => {
        if (!quranData) return [];
    
        const { allLines, allWords, surahLigatures, wordVerseKeys } = quranData;
        const linesForPage = allLines.filter(l => l.page_number === pageNumber);
    
        const content: { line: LayoutLine; elements: { type: 'word' | 'surah' | 'bismillah'; content: string; verseKey?: string; wordId?: number }[][] }[] = [];
    
        for (const line of linesForPage) {
          const lineElements: { type: 'word' | 'surah' | 'bismillah'; content: string; verseKey?: string; wordId?: number }[][] = [];
    
          if (line.line_type === 'surah_name' && typeof line.surah_number === 'number') {
            const key = `surah-${line.surah_number}`;
            lineElements.push([{ type: 'surah', content: surahLigatures[key] || '' }]);
          } else if (line.line_type === 'basmallah') {
            lineElements.push([{ type: 'bismillah', content: '﷽' }]);
          } else if (line.line_type === 'ayah' && typeof line.first_word_id === 'number' && typeof line.last_word_id === 'number') {
            let currentAyahWords: { type: 'word', content: string, verseKey?: string, wordId?: number }[] = [];
            let currentAyahVerseKey: string | undefined = undefined;
    
            for (let i = line.first_word_id; i <= line.last_word_id; i++) {
              const verseKey = wordVerseKeys.get(i);
              const wordText = allWords.get(i);
    
              if (wordText) {
                if (verseKey !== currentAyahVerseKey) {
                  if (currentAyahWords.length > 0) {
                    lineElements.push(currentAyahWords);
                  }
                  currentAyahWords = [];
                  currentAyahVerseKey = verseKey;
                }
                currentAyahWords.push({ type: 'word', content: wordText, verseKey, wordId: i });
              }
            }
            if (currentAyahWords.length > 0) {
              lineElements.push(currentAyahWords);
            }
          }
          content.push({ line, elements: lineElements });
        }
        return content;
      }, [pageNumber, quranData]);
    
    const pageHasBismillah = useMemo(() => pageContent.some(
      ({ line }) => line.line_type === 'basmallah'
    ), [pageContent]);
  
  useEffect(() => {
    let isCancelled = false;
    setIsFontLoaded(false);
    
    const fontsToLoad = [`1em ${fontName}`];
    
    Promise.all(fontsToLoad.map(font => document.fonts.load(font)))
      .then(() => {
        if (!isCancelled) {
          setIsFontLoaded(true);
        }
      })
      .catch((err) => {
        console.error('Failed to load Quran fonts:', err);
        if (!isCancelled) {
          setIsFontLoaded(true);
        }
      });
      
    return () => { isCancelled = true };
  }, [fontName, pageHasBismillah]);


  useEffect(() => {
    const pageElement = pageRef.current;
    if (pageElement) {
      const preventContextMenu = (e: Event) => e.preventDefault();
      pageElement.addEventListener('contextmenu', preventContextMenu);
      return () => {
        pageElement.removeEventListener('contextmenu', preventContextMenu);
      };
    }
  }, []);

  const handleTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    if (element) {
        const targetVerseKey = element.closest('[data-verse-key]')?.getAttribute('data-verse-key');
        if (targetVerseKey) {
            onSelectionMove(targetVerseKey);
        }
    }
  };


  if (error) return <div className="p-8 text-center text-destructive">{error}</div>;

  // Wait until everything is fully loaded and mounted before showing the page
  if (!mounted || !quranData) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center py-8">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // Double safeguard: Even if mounted, if font is not loaded, show spinner
  if (!isFontLoaded) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center py-8 space-y-4">
        <div className="relative">
          <Loader2 className="h-12 w-12 animate-spin text-accent" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-accent rounded-full animate-pulse" />
          </div>
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/30">Indlæser Mushaf...</p>
      </div>
    );
  }
  
  return (
    <div className="w-full min-h-full h-auto flex flex-col items-center justify-center py-4">
      <div 
        ref={pageRef}
        dir="rtl"
        className={cn(
          "quran-page-container w-full max-w-3xl mx-auto min-h-full flex flex-col justify-center bg-background border border-border/50 rounded-xl shadow-sm p-4 sm:p-6 md:p-8 font-quran text-foreground transition-opacity duration-300",
          `quran-page-${pageNumber}`,
          !isFontLoaded ? "opacity-0" : "opacity-100"
        )}
        style={{ 
          fontFamily: fontName, 
          fontSize: 'clamp(1.1rem, 4vw + 0.5rem, 1.8rem)',
          lineHeight: '1.8',
          textRendering: 'optimizeLegibility', 
          WebkitFontSmoothing: 'antialiased',
          color: forcedColor,
          WebkitTextFillColor: forcedColor,
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitTouchCallout: 'none',
          touchAction: 'none',
        }}
        onMouseUp={onSelectionEnd}
        onTouchEnd={onSelectionEnd}
        onMouseLeave={onSelectionEnd}
        onTouchMove={handleTouchMove}
      >
        <div className="flex-grow flex flex-col justify-center">
            {pageContent.map(({ line, elements }) => (
                <div
                    key={line.line_number}
                    className={cn(
                        "flex w-full text-foreground items-center justify-center whitespace-nowrap", 
                        line.line_type === 'surah_name' && 'surah-name',
                        line.line_type === 'basmallah' && 'bismillah'
                    )}
                    style={{ 
                        color: forcedColor,
                        WebkitTextFillColor: forcedColor
                    }}
                >
                    {elements.map((ayahGroup, groupIndex) => {
                        if (ayahGroup[0].type === 'surah') {
                            const surahNumber = line.surah_number as number;
                            return (
                                <img
                                    key={`surah-${surahNumber}`}
                                    src={`/Surah-headers/${surahNumber}.png`}
                                    alt={`Surah ${surahNumber}`}
                                    className="block mx-auto w-full max-w-[700px] h-auto select-none pointer-events-none"
                                    draggable={false}
                                />
                            );
                        }
                        if (ayahGroup[0].type === 'word') {
                            const verseKey = ayahGroup[0].verseKey!;
                            const isPlaying = verseKey === nowPlayingKey;
                            const isSelected = isAyahSelected(verseKey);
                            
                            return (
                                <Ayah
                                    key={`${verseKey}-${groupIndex}`}
                                    verseKey={verseKey}
                                    words={ayahGroup.map(w => ({ content: w.content, wordId: w.wordId }))}
                                    isSelected={isSelected}
                                    isPlaying={isPlaying}
                                    activeWordId={activeWord}
                                    onClick={onAyahClick}
                                    onSelectionStart={onSelectionStart}
                                    onSelectionMove={onSelectionMove}
                                    onSelectionEnd={onSelectionEnd}
                                />
                            )
                        }
                        return (
                          <span 
                            key={`non-ayah-${groupIndex}`} 
                            className="text-inherit"
                            style={{ 
                              color: forcedColor,
                              WebkitTextFillColor: forcedColor
                            }}
                          >
                            {ayahGroup[0].content}
                          </span>
                        )
                    })}
                </div>
            ))}
        </div>
        
        <div className="text-center text-sm font-sans text-muted-foreground -mb-2" style={{ fontFamily: 'var(--font-sans)' }}>
            {pageNumber}
        </div>
      </div>
    </div>
  );
}
