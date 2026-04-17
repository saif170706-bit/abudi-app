'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";

import MushafPage from "./MushafPage";
import { cn } from "@/lib/utils";
import { useQuranData } from "@/context/QuranDataContext";
import { useLanguage } from "@/context/LanguageContext";
import { useSelection } from "@/hooks/use-selection";
import { SelectionToolbar } from "./SelectionToolbar";
import AudioPlayer, { AudioPlayerHandle } from "./AudioPlayer";
import { getStartKeyFromLayout, buildOrderedKeys, sortKeysByOrder } from "@/lib/quran-recitation-maps";
import { Loader2 } from "lucide-react";
import { useRecentQuranVisits } from "@/hooks/use-recent-quran-visits";
import { useQuranProgress } from "@/hooks/use-quran-progress";
import { useQuranFontPrefetch, notifySwPageView } from "@/hooks/use-quran-font-prefetch";


export interface LayoutLine {
  page_number: number;
  line_number: number;
  line_type: "surah_name" | "ayah" | "basmallah";
  is_centered: 1 | 0;
  first_word_id: number | "";
  last_word_id: number | "";
  surah_number: number | "";
  text?: string;
}

interface QuranReaderProps {
  initialPage: number;
  BackButton: React.ComponentType;
}

const TOTAL_PAGES = 604;
const quranPages = Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1);

// --- VIRTUALIZATION ---
const NEIGHBOR_COUNT = 1;
function getVisiblePages(pageIndex: number): number[] {
  const start = Math.max(0, pageIndex - NEIGHBOR_COUNT);
  const end = Math.min(TOTAL_PAGES - 1, pageIndex + NEIGHBOR_COUNT);
  const result: number[] = [];
  for (let i = start; i <= end; i++) result.push(i + 1);
  return result;
}

function QuranReaderComponent({ initialPage, BackButton }: QuranReaderProps) {
  const { quranData, isLoading, error: quranError } = useQuranData();
  const { language } = useLanguage();
  const audioPlayerRef = useRef<AudioPlayerHandle>(null);
  const autoNavRef = useRef(false);
  const { addVisit } = useRecentQuranVisits();
  const { saveProgress } = useQuranProgress();


  const [nowPlayingKey, setNowPlayingKey] = useState<string | null>(null);
  const [activeWord, setActiveWord] = useState<number | null>(null);

  const {
    selectedKeys,
    isAnythingSelected,
    isSelecting,
    isAyahSelected,
    handleAyahClick,
    clearSelection,
    handleSelectionStart,
    handleSelectionMove,
    handleSelectionEnd,
  } = useSelection(quranData?.ayahsByKey, quranData?.versePageMap);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    startIndex: initialPage - 1,
    direction: "rtl",
    loop: false,
    watchDrag: () => !isSelecting,
  });

  const [currentPageIndex, setCurrentPageIndex] = useState(initialPage - 1);
  const [visiblePages, setVisiblePages] = useState<number[]>(getVisiblePages(initialPage - 1));
  const [isUiVisible, setIsUiVisible] = useState(true);

  const currentPage = useMemo(() => currentPageIndex + 1, [currentPageIndex]);

  // Task 20: Prefetch adjacent page fonts into the service worker cache
  useQuranFontPrefetch(currentPage, 2);
  // Notify SW to trim cache every 50 page views
  useEffect(() => { notifySwPageView(); }, [currentPage]);

  const orderedKeys = useMemo(() => {
    return buildOrderedKeys(quranData?.ayahsByKey);
  }, [quranData]);


  const goToPage = useCallback(
    (page: number) => {
      if (emblaApi && page >= 1 && page <= TOTAL_PAGES) {
        emblaApi.scrollTo(page - 1);
      }
    },
    [emblaApi]
  );

  const getPageInfo = useCallback((pageNumber: number) => {
    // Static Juz mapping as requested
    const getStaticJuz = (p: number) => {
      let j = 1;
      if (p <= 21) j = 1;
      else if (p >= 582) j = 30;
      else j = Math.floor((p - 2) / 20) + 1;
      
      return language === 'ar' ? `الجزء ${j}` : `Juz ${j}`;
    };

    const juzTitle = getStaticJuz(pageNumber);

    if (!quranData?.ayahsByKey || !quranData.allSurahs || !quranData.verseOrderMap) {
      return { surahName: "...", juz: juzTitle, surahNumber: 0 };
    }
    
    // Find first verse key on the page from the pre-generated map.
    const startKey = (quranData.allLines as any[]).find(line => line.page_number === pageNumber && line.line_type === 'ayah' && line.first_word_id)?.first_word_id;
    const firstVerseKey = startKey ? quranData.wordVerseKeys.get(startKey) : null;
    
    if (!firstVerseKey) return { surahName: `Side ${pageNumber}`, juz: juzTitle, surahNumber: 0 };
    
    const ayahData = quranData.ayahsByKey.get(firstVerseKey);
    if (!ayahData) return { surahName: `Side ${pageNumber}`, juz: juzTitle, surahNumber: 0 };

    const surahInfo = quranData.allSurahs.find((s: any) => s.number === ayahData.surah_number);
    
    return {
      surahName: surahInfo?.englishName || `Surah ${ayahData.surah_number}`,
      juz: juzTitle,
      surahNumber: surahInfo?.number || 0,
    };
  }, [quranData, language]);


  // Auto navigate når lyd skifter vers
  useEffect(() => {
    if (!nowPlayingKey) return;

    let targetPage: number | null = null;

    const vpm: any = (quranData as any)?.versePageMap;
    if (vpm && typeof vpm.get === "function") {
      const p = vpm.get(nowPlayingKey);
      if (typeof p === "number") targetPage = p;
    }

    if (targetPage == null && quranData?.ayahsByKey) {
      const meta = quranData.ayahsByKey.get(nowPlayingKey);
      if (meta?.page_number) targetPage = meta.page_number;
      else if (meta?.pageNumber) targetPage = meta.pageNumber;
    }

    if (targetPage && targetPage !== currentPage) {
      autoNavRef.current = true;
      goToPage(targetPage);
    }
  }, [nowPlayingKey, quranData, currentPage, goToPage]);

  const handleTimeUpdate = (timeSeconds: number, verseKey: string) => {
    if (!quranData?.ayahsByKey) return;
    const verseData = quranData.ayahsByKey.get(verseKey);
    if (!verseData || !verseData.segments) return;

    const timeMs = timeSeconds * 1000;
    const fromMs = verseData.timestamp_from;

    const activeSegment = verseData.segments.find((seg: number[]) => {
      const segmentStart = fromMs + seg[1];
      const segmentEnd = fromMs + seg[2];
      return timeMs >= segmentStart && timeMs < segmentEnd;
    });

    setActiveWord(activeSegment ? activeSegment[0] : null);
  };
  
  const { surahName } = getPageInfo(currentPage);

  useEffect(() => {
    // kun når side + surahName er klar
    if (!surahName || surahName === '...') return;
    addVisit(currentPage, surahName);
  }, [currentPage, surahName, addVisit]);


  const onSelect = useCallback(
    (api: NonNullable<ReturnType<typeof useEmblaCarousel>[1]>) => {
      const newIndex = api.selectedScrollSnap();

      const wasAuto = autoNavRef.current;
      autoNavRef.current = false;

      setCurrentPageIndex(newIndex);
      setVisiblePages(getVisiblePages(newIndex));
      clearSelection();

      if (!wasAuto) {
        audioPlayerRef.current?.stop();
        setNowPlayingKey(null);
        // Save progress bookmark when user manually turns page
        saveProgress(newIndex + 1);
      }
    },
    [clearSelection, saveProgress]
  );
  
  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);

    if (emblaApi.selectedScrollSnap() !== initialPage - 1) {
      emblaApi.scrollTo(initialPage - 1, true);
      setCurrentPageIndex(initialPage - 1);
      setVisiblePages(getVisiblePages(initialPage - 1));
      clearSelection();
    }

    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect, initialPage, clearSelection]);

  const onPopupPlay = () => {
    if (selectedKeys.length === 0) return;

    const ordered = sortKeysByOrder(selectedKeys, orderedKeys);
    clearSelection();

    if (ordered.length === 1) audioPlayerRef.current?.playFromVerseKey(ordered[0]);
    else audioPlayerRef.current?.playSelectionOnce(ordered);
  };

  const onPopupRepeat = () => {
    if (selectedKeys.length === 0) return;

    const ordered = sortKeysByOrder(selectedKeys, orderedKeys);
    clearSelection();
    audioPlayerRef.current?.playSelectionLoop(ordered);
  };

  const { juz } = getPageInfo(currentPageIndex + 1);

  const handlePageClick = () => {
    if (isAnythingSelected) clearSelection();
    else setIsUiVisible((prev) => !prev);
  };

  if (quranError) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center">
        <p className="text-destructive font-bold">{quranError}</p>
        <BackButton />
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center">
        {/* This loading state is hit while the main Quran data is processing. */}
        {/* We keep it clean and simple. */}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      <header
        className={cn(
          "absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-background/80 backdrop-blur-sm border-b transition-transform duration-300 ease-in-out",
          isUiVisible ? "translate-y-0" : "-translate-y-full"
        )}
      >
        <BackButton />
        <div className="text-center">
          <h2 className="font-semibold">{surahName}</h2>
          <p className="text-sm text-muted-foreground">{juz}</p>
        </div>
        <div className="w-16" />
      </header>

      {isAnythingSelected && <SelectionToolbar onPlay={onPopupPlay} onRepeat={onPopupRepeat} />}

      <div className="flex-grow overflow-hidden" ref={emblaRef} onClick={handlePageClick}>
        <div className="flex h-full" style={{ direction: "rtl" }}>
          {quranPages.map((pageNumber) => {
            const isVisible = visiblePages.includes(pageNumber);
            return (
              <div
                key={pageNumber}
                className={cn("relative flex-[0_0_100%] h-full overflow-y-auto p-4 md:p-6", `quran-page-${pageNumber}`)}
              >
                {isVisible ? (
                  <MushafPage
                    pageNumber={pageNumber}
                    onAyahClick={handleAyahClick}
                    isAyahSelected={isAyahSelected}
                    onSelectionStart={handleSelectionStart}
                    onSelectionMove={handleSelectionMove}
                    onSelectionEnd={handleSelectionEnd}
                    nowPlayingKey={nowPlayingKey}
                    activeWord={activeWord}
                  />
                ) : null }
              </div>
            );
          })}
        </div>
      </div>

      <footer
        className={cn(
          "absolute bottom-0 left-0 right-0 z-20 flex justify-center items-center p-2 pb-4 bg-background/80 backdrop-blur-sm border-t transition-transform duration-300 ease-in-out",
          isUiVisible ? "translate-y-0" : "translate-y-full"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <AudioPlayer
          ref={audioPlayerRef}
          orderedKeys={orderedKeys}
          onVersePlay={setNowPlayingKey}
          onTimeUpdate={handleTimeUpdate}
          currentPageNumber={currentPage}
        />
      </footer>
    </div>
  );
}

const MemoizedQuranReaderComponent = React.memo(QuranReaderComponent);

export default function QuranReader(props: QuranReaderProps) {
  return <MemoizedQuranReaderComponent {...props} />;
}
