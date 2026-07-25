'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, BookOpen, FileText, Star, CheckCircle2, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuranData } from '@/context/QuranDataContext';
import MushafPage from '@/components/quran/MushafPage';
import { surahs as allSurahs } from '@/app/lib/surahs';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AssignmentPart {
  surahName: string;   // Arabic surah name e.g. "البقرة"
  fromAyah: number;
  toAyah: number;
  endSurahName?: string | null;
}

interface Assignment {
  id: string;
  hifz: AssignmentPart;
  murajara: AssignmentPart;
  gradeHifz?: string | null;
  gradeMurajara?: string | null;
}

interface NewAssignmentResult {
  hifz?: { surahName: string; fromAyah: number; toAyah: number } | null;
  murajara?: { surahName: string; fromAyah: number; toAyah: number } | null;
  gradeHifz?: string | null;
  gradeMurajara?: string | null;
  notes?: string | null;
  // If a student stopped early inside the current assignment, update current assignment's toAyah
  updateCurrentHifzToAyah?: number | null;
  updateCurrentMurajaraToAyah?: number | null;
}

interface TeacherQuranPanelProps {
  assignment: Assignment | null;
  initialMode: 'hifz' | 'murajara';
  onBack: () => void;
  onComplete: (result: NewAssignmentResult) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TOTAL_PAGES = 604;
const NEIGHBOR_COUNT = 1;

function getVisiblePages(pageIndex: number): number[] {
  const start = Math.max(0, pageIndex - NEIGHBOR_COUNT);
  const end = Math.min(TOTAL_PAGES - 1, pageIndex + NEIGHBOR_COUNT);
  const result: number[] = [];
  for (let i = start; i <= end; i++) result.push(i + 1);
  return result;
}

function getSurahNumber(arabicName: string): number {
  return allSurahs.find(s => s.name === arabicName)?.number ?? 1;
}

const GRADE_OPTIONS = ['Perfekt', 'Meget godt', 'Godt', 'Ikke læst'];

// ── Component ─────────────────────────────────────────────────────────────────

export default function TeacherQuranPanel({
  assignment,
  initialMode,
  onBack,
  onComplete,
}: TeacherQuranPanelProps) {
  const { quranData, isLoading } = useQuranData();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Current mode (hifz / murajara) ──────────────────────────────────────────
  const [mode, setMode] = useState<'hifz' | 'murajara'>(initialMode);

  // ── Grades (separate per type, accumulated throughout session) ───────────────
  const [gradeHifz, setGradeHifz] = useState<string | null>(assignment?.gradeHifz ?? null);
  const [gradeMurajara, setGradeMurajara] = useState<string | null>(assignment?.gradeMurajara ?? null);

  // ── New assignments staged from ayah-selection ───────────────────────────────
  const [newHifz, setNewHifz] = useState<{ surahName: string; fromAyah: number; toAyah: number } | null>(null);
  const [newMurajara, setNewMurajara] = useState<{ surahName: string; fromAyah: number; toAyah: number } | null>(null);

  // ── Ayah selection mode ───────────────────────────────────────────────────────
  type SelectionPhase = 'idle' | 'pick-from' | 'pick-to' | 'change-start' | 'change-end' | 'confirming';
  const [selectionPhase, setSelectionPhase] = useState<SelectionPhase>('idle');
  const [selectionFrom, setSelectionFrom] = useState<{ surahNumber: number; ayah: number } | null>(null);
  const [selectionTo, setSelectionTo] = useState<{ surahNumber: number; ayah: number } | null>(null);
  const [fadePrompt, setFadePrompt] = useState<string | null>(null);
  const [showEditOptions, setShowEditOptions] = useState(false);

  // Track highlighted ayahs for visual feedback during selection
  const [highlightedKeys, setHighlightedKeys] = useState<Set<string>>(new Set());

  // ── Note / end dialog ─────────────────────────────────────────────────────────
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [note, setNote] = useState('');

  // ── Grade picker visibility ────────────────────────────────────────────────────
  const [showGradePicker, setShowGradePicker] = useState(false);

  // ── UI visibility (header/footer toggle on tap) ────────────────────────────────
  const [isUiVisible, setIsUiVisible] = useState(false);

  // ── Page navigation ────────────────────────────────────────────────────────────
  const getStartPage = useCallback((m: 'hifz' | 'murajara') => {
    if (!quranData?.versePageMap || !assignment) return null;
    const part = m === 'hifz' ? assignment.hifz : assignment.murajara;
    if (!part?.surahName || !part?.fromAyah) return null;
    const surahNum = getSurahNumber(part.surahName);
    const key = `${surahNum}:${part.fromAyah}`;
    return quranData.versePageMap.get(key) ?? null;
  }, [quranData, assignment]);


  const [currentPageIndex, setCurrentPageIndex] = useState(0); // start at 0, navigate once loaded
  const [visiblePages, setVisiblePages] = useState(() => getVisiblePages(0));

  const [emblaRef, emblaApi] = useEmblaCarousel({
    startIndex: 0,
    direction: 'rtl',
    loop: false,
  });

  const currentPage = currentPageIndex + 1;

  // Navigate to the correct page once quranData is ready, and whenever mode changes.
  // Using a ref to track the last mode we navigated to avoids double-scrolls.
  const lastNavigatedMode = React.useRef<string | null>(null);
  const lastNavigatedPage = React.useRef<number | null>(null);

  useEffect(() => {
    if (!emblaApi || !quranData?.versePageMap) return;
    const targetPage = getStartPage(mode);
    if (targetPage == null) return; // data not ready
    // Only navigate if the mode changed or this is the first navigation
    if (lastNavigatedMode.current === mode && lastNavigatedPage.current === targetPage) return;
    lastNavigatedMode.current = mode;
    lastNavigatedPage.current = targetPage;
    emblaApi.scrollTo(targetPage - 1, true); // true = instant (no animation)
    setCurrentPageIndex(targetPage - 1);
    setVisiblePages(getVisiblePages(targetPage - 1));
  }, [emblaApi, quranData, getStartPage, mode]);


  const onSelect = useCallback((api: NonNullable<ReturnType<typeof useEmblaCarousel>[1]>) => {
    const newIndex = api.selectedScrollSnap();
    setCurrentPageIndex(newIndex);
    setVisiblePages(getVisiblePages(newIndex));
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi, onSelect]);

  // Handle fading prompt timers
  useEffect(() => {
    if (fadePrompt) {
      const timer = setTimeout(() => {
        setFadePrompt(null);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [fadePrompt]);

  // ── Page info (surah / juz) ────────────────────────────────────────────────────
  const pageInfo = useMemo(() => {
    if (!quranData?.ayahsByKey || !quranData.allSurahs || !quranData.allLines) {
      return { surahName: '...', juz: '' };
    }
    const startKey = (quranData.allLines as any[]).find(
      l => l.page_number === currentPage && l.line_type === 'ayah' && l.first_word_id
    )?.first_word_id;
    const firstVerseKey = startKey ? quranData.wordVerseKeys.get(startKey) : null;
    if (!firstVerseKey) return { surahName: `Side ${currentPage}`, juz: '' };
    const ayahData = quranData.ayahsByKey.get(firstVerseKey);
    if (!ayahData) return { surahName: `Side ${currentPage}`, juz: '' };
    const surahInfo = quranData.allSurahs.find((s: any) => s.number === ayahData.surah_number);
    const j = Math.min(30, Math.max(1, Math.floor((currentPage - 2) / 20) + 1));
    return {
      surahName: surahInfo?.englishName || `Surah ${ayahData.surah_number}`,
      juz: `Juz ${j}`,
    };
  }, [quranData, currentPage]);

  // Header Title shows student's assignment range
  const headerTitle = useMemo(() => {
    const label = mode === 'hifz' ? 'Hifz' : 'Murajara';
    const part = mode === 'hifz' ? assignment?.hifz : assignment?.murajara;
    if (!part || !part.surahName) return `${label}: Ingen lektie`;
    const surah = allSurahs.find(s => s.name === part.surahName);
    const surahNameDisplay = surah ? surah.englishName : part.surahName;
    const hasEndSurah = part.endSurahName && part.endSurahName !== part.surahName;
    if (hasEndSurah) {
      const endSurah = allSurahs.find(s => s.name === part.endSurahName);
      const endSurahNameDisplay = endSurah ? endSurah.englishName : part.endSurahName;
      return `${label}: ${surahNameDisplay} ${part.fromAyah} - ${endSurahNameDisplay} ${part.toAyah}`;
    }
    return `${label}: ${surahNameDisplay} (${part.fromAyah}–${part.toAyah})`;
  }, [mode, assignment]);

  // ── Ayah-selection logic ────────────────────────────────────────────────────────

  const handlePageClick = () => {
    if (selectionPhase !== 'idle') return; // handled by ayah clicks during selection
    setIsUiVisible(prev => !prev);
    setShowGradePicker(false);
  };

  /**
   * Called when an ayah is tapped in the Mushaf.
   * In selection mode, this advances the selection state machine.
   */
  const handleAyahTap = useCallback((verseKey: string, e: React.MouseEvent | React.TouchEvent) => {
    if (selectionPhase === 'idle' || selectionPhase === 'confirming') return;

    e.stopPropagation();
    const [surahNum, ayahNum] = verseKey.split(':').map(Number);

    if (selectionPhase === 'pick-from') {
      setSelectionFrom({ surahNumber: surahNum, ayah: ayahNum });
      setHighlightedKeys(new Set([verseKey]));
      setSelectionPhase('pick-to');
      setFadePrompt('Vælg slut-ayah');
    } else if (selectionPhase === 'pick-to') {
      const from = selectionFrom!;
      let finalFrom = from;
      let finalTo = { surahNumber: surahNum, ayah: ayahNum };
      
      if (from.surahNumber === surahNum && ayahNum < from.ayah) {
        finalFrom = { surahNumber: surahNum, ayah: ayahNum };
        finalTo = from;
      }

      setSelectionTo(finalTo);
      setSelectionPhase('confirming');

      // Highlight the entire range
      if (finalFrom.surahNumber === finalTo.surahNumber) {
        const keys = new Set<string>();
        for (let a = finalFrom.ayah; a <= finalTo.ayah; a++) {
          keys.add(`${finalFrom.surahNumber}:${a}`);
        }
        setHighlightedKeys(keys);
      }

      // Visual confirmation delay of 600ms before applying the new range
      setTimeout(() => {
        confirmNewAssignment(finalFrom, finalTo);
      }, 600);
    } else if (selectionPhase === 'change-start') {
      const currentStaged = mode === 'hifz' ? newHifz : newMurajara;
      if (!currentStaged) return;
      const currentSurahNum = getSurahNumber(currentStaged.surahName);

      let finalFrom = ayahNum;
      let finalTo = currentStaged.toAyah;
      if (finalFrom > finalTo) {
        finalFrom = currentStaged.toAyah;
        finalTo = ayahNum;
      }

      setSelectionPhase('confirming');

      const keys = new Set<string>();
      for (let a = finalFrom; a <= finalTo; a++) {
        keys.add(`${currentSurahNum}:${a}`);
      }
      setHighlightedKeys(keys);

      setTimeout(() => {
        confirmNewAssignment(
          { surahNumber: currentSurahNum, ayah: finalFrom },
          { surahNumber: currentSurahNum, ayah: finalTo }
        );
      }, 600);
    } else if (selectionPhase === 'change-end') {
      const currentStaged = mode === 'hifz' ? newHifz : newMurajara;
      if (!currentStaged) return;
      const currentSurahNum = getSurahNumber(currentStaged.surahName);

      let finalFrom = currentStaged.fromAyah;
      let finalTo = ayahNum;
      if (finalTo < finalFrom) {
        finalFrom = ayahNum;
        finalTo = currentStaged.fromAyah;
      }

      setSelectionPhase('confirming');

      const keys = new Set<string>();
      for (let a = finalFrom; a <= finalTo; a++) {
        keys.add(`${currentSurahNum}:${a}`);
      }
      setHighlightedKeys(keys);

      setTimeout(() => {
        confirmNewAssignment(
          { surahNumber: currentSurahNum, ayah: finalFrom },
          { surahNumber: currentSurahNum, ayah: finalTo }
        );
      }, 600);
    }
  }, [selectionPhase, selectionFrom, mode, newHifz, newMurajara]);

  const confirmNewAssignment = (
    from: { surahNumber: number; ayah: number },
    to: { surahNumber: number; ayah: number }
  ) => {
    const fromSurah = allSurahs.find(s => s.number === from.surahNumber);
    if (!fromSurah) return;

    const newPart = {
      surahName: fromSurah.name,
      fromAyah: from.ayah,
      toAyah: to.ayah,
    };

    if (mode === 'hifz') setNewHifz(newPart);
    else setNewMurajara(newPart);

    // Reset selection state
    setSelectionPhase('idle');
    setSelectionFrom(null);
    setSelectionTo(null);
    setHighlightedKeys(new Set());
    setIsUiVisible(true);
  };

  const startSelection = () => {
    setSelectionPhase('pick-from');
    setHighlightedKeys(new Set());
    setSelectionFrom(null);
    setSelectionTo(null);
    setIsUiVisible(false); // Hide the header immediately
    setFadePrompt('Vælg start-ayah');
  };

  const cancelSelection = () => {
    setSelectionPhase('idle');
    setSelectionFrom(null);
    setSelectionTo(null);
    setHighlightedKeys(new Set());
    setIsUiVisible(true);
  };

  // ── "Student stopped early / read extra" detection ───────────────────────────
  const checkStudentStoppedEarly = (): { hifzTo: number | null; murajaraTo: number | null } => {
    let hifzTo: number | null = null;
    let murajaraTo: number | null = null;

    if (newHifz && assignment?.hifz) {
      const curFrom = assignment.hifz.fromAyah;
      const curTo = assignment.hifz.toAyah;
      const newFrom = newHifz.fromAyah;
      
      // If same surah and the new start ayah is after current start, update the current end
      if (newHifz.surahName === assignment.hifz.surahName && newFrom > curFrom) {
        hifzTo = newFrom - 1; // current assignment ends just before the new one starts
      }
    }

    if (newMurajara && assignment?.murajara) {
      const curFrom = assignment.murajara.fromAyah;
      const curTo = assignment.murajara.toAyah;
      const newFrom = newMurajara.fromAyah;
      
      if (newMurajara.surahName === assignment.murajara.surahName && newFrom > curFrom) {
        murajaraTo = newFrom - 1;
      }
    }

    return { hifzTo, murajaraTo };
  };

  // ── End session ────────────────────────────────────────────────────────────────
  const handleEndSession = () => {
    setShowGradePicker(false);
    setShowNoteDialog(true);
  };

  const handleCompleteWithNote = (skipNote: boolean) => {
    setIsSubmitting(true);
    const { hifzTo, murajaraTo } = checkStudentStoppedEarly();

    const result: NewAssignmentResult = {
      gradeHifz: gradeHifz || null,
      gradeMurajara: gradeMurajara || null,
      hifz: newHifz || null,
      murajara: newMurajara || null,
      notes: skipNote ? null : (note.trim() || null),
      updateCurrentHifzToAyah: hifzTo,
      updateCurrentMurajaraToAyah: murajaraTo,
    };

    setShowNoteDialog(false);
    onComplete(result);
  };

  // ── Selection overlay prompt ───────────────────────────────────────────────────
  const selectionPromptText = null; // Fading text overlay handles this now

  // ── Current mode labels ────────────────────────────────────────────────────────
  const currentGrade = mode === 'hifz' ? gradeHifz : gradeMurajara;
  const setCurrentGrade = mode === 'hifz' ? setGradeHifz : setGradeMurajara;
  const hasNewAssignment = mode === 'hifz' ? !!newHifz : !!newMurajara;
  const otherMode: 'hifz' | 'murajara' = mode === 'hifz' ? 'murajara' : 'hifz';

  const getModeLabel = (m: 'hifz' | 'murajara') => m === 'hifz' ? 'Hifz' : 'Murajara';

  const getNewAssignmentSummary = (part: { surahName: string; fromAyah: number; toAyah: number } | null) => {
    if (!part) return null;
    const surah = allSurahs.find(s => s.name === part.surahName);
    return `${surah?.englishName ?? part.surahName} (${part.fromAyah}–${part.toAyah})`;
  };

  if (isLoading || isSubmitting) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col pointer-events-auto">
      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isUiVisible && (
          <motion.header
            key="header"
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="absolute top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-md border-b border-border"
          >
            {/* Row 1: Back + Assignment Info + Toggle */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2 gap-3">
              {/* Back button */}
              <button
                onClick={onBack}
                className="h-10 w-10 flex items-center justify-center rounded-2xl bg-primary/5 text-primary shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              {/* Center: assignment info */}
              <div className="flex-1 text-center min-w-0">
                <p className="text-sm font-bold text-primary truncate">{headerTitle}</p>
              </div>

              {/* Toggle Hifz/Murajara */}
              <button
                onClick={() => setMode(otherMode)}
                className={cn(
                  'h-10 px-3 flex items-center gap-1.5 rounded-2xl text-[10px] font-black uppercase tracking-wider shrink-0 transition-all',
                  otherMode === 'hifz'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                )}
              >
                {otherMode === 'hifz' ? <BookOpen className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
                <span className="hidden xs:inline">Gå til</span> {getModeLabel(otherMode)}
              </button>
            </div>

            {/* Row 2: Action buttons (Cleaned to exactly 3 evenly-spaced buttons) */}
            <div className="flex items-center gap-2 px-4 pb-3 justify-between w-full">
              {/* New assignment button */}
              {selectionPhase === 'idle' ? (
                <button
                  onClick={hasNewAssignment ? () => setShowEditOptions(true) : startSelection}
                  className={cn(
                    'flex-1 h-10 px-3 flex items-center justify-center gap-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all',
                    hasNewAssignment
                      ? 'bg-accent/15 text-accent border border-accent/30 animate-pulse'
                      : 'bg-primary/5 text-primary border border-primary/10'
                  )}
                >
                  {hasNewAssignment ? '✓ Ny lektie sat' : '+ Giv ny lektie'}
                </button>
              ) : (
                <button
                  onClick={cancelSelection}
                  className="flex-1 h-10 px-3 flex items-center justify-center gap-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-red-50 text-red-600 border border-red-200"
                >
                  <X className="h-3.5 w-3.5" /> Annuller
                </button>
              )}

              {/* Grade button */}
              <button
                onClick={() => { setShowGradePicker(p => !p); setIsUiVisible(true); }}
                className={cn(
                  'flex-1 h-10 px-3 flex items-center justify-center gap-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all',
                  currentGrade
                    ? 'bg-accent/15 text-accent border border-accent/30'
                    : 'bg-primary/5 text-primary border border-primary/10'
                )}
              >
                <Star className="h-3.5 w-3.5" />
                {currentGrade ?? 'Bedøm'}
              </button>

              {/* End session */}
              <button
                onClick={handleEndSession}
                className="flex-1 h-10 px-3 flex items-center justify-center gap-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider bg-primary text-white shadow-[0_4px_12px_rgba(25,118,112,0.2)]"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Afslut & Gem
              </button>
            </div>

            {/* Grade picker panel */}
            <AnimatePresence>
              {showGradePicker && (
                <motion.div
                  key="grade-picker"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-border bg-background/95"
                >
                  <div className="flex items-center gap-2 px-4 py-3 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary/40 shrink-0">
                      Karakter {getModeLabel(mode)}:
                    </span>
                    {GRADE_OPTIONS.map(g => (
                      <button
                        key={g}
                        onClick={() => { setCurrentGrade(g); setShowGradePicker(false); }}
                        className={cn(
                          'h-8 px-3 rounded-xl text-[11px] font-bold border transition-all',
                          currentGrade === g
                            ? 'bg-accent text-white border-accent shadow-md'
                            : 'bg-card text-primary/70 border-border'
                        )}
                      >
                        {g}
                      </button>
                    ))}
                    {currentGrade && (
                      <button
                        onClick={() => { setCurrentGrade(null); setShowGradePicker(false); }}
                        className="h-8 px-3 rounded-xl text-[11px] font-bold border border-red-200 text-red-600 bg-red-50"
                      >
                        Slet
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.header>
        )}
      </AnimatePresence>

      {/* ── FADING PROMPT OVERLAY ────────────────────────────────────────────── */}
      <AnimatePresence>
        {fadePrompt && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center px-4"
          >
            <div className="bg-black/75 backdrop-blur-md text-white text-xs font-bold uppercase tracking-[0.2em] px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-3 border border-white/10">
              <span className="h-2.5 w-2.5 rounded-full bg-accent animate-pulse" />
              {fadePrompt}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── HIGHLIGHTED SELECTION INDICATOR ────────────────────────────────────── */}
      {highlightedKeys.size > 0 && selectionPhase === 'idle' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute bottom-24 inset-x-4 z-30 bg-accent/95 text-white rounded-[24px] p-4 text-center shadow-2xl"
        >
          <p className="text-[11px] font-black uppercase tracking-widest text-white/70">Ny lektie valgt</p>
          <p className="text-sm font-bold mt-1">
            {getNewAssignmentSummary(mode === 'hifz' ? newHifz : newMurajara)}
          </p>
        </motion.div>
      )}

      {/* ── QURAN PAGES ────────────────────────────────────────────────────────── */}
      <div
        className="flex-grow overflow-hidden"
        ref={emblaRef}
        onClick={handlePageClick}
      >
        <div className="flex h-full" style={{ direction: 'rtl' }}>
          {Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1).map(pageNumber => {
            const isVisible = visiblePages.includes(pageNumber);
            return (
              <div
                key={pageNumber}
                className={cn(
                  'relative flex-[0_0_100%] h-full overflow-y-auto p-4 md:p-6',
                  `quran-page-${pageNumber}`
                )}
              >
                {isVisible ? (
                  <MushafPage
                    pageNumber={pageNumber}
                    onAyahClick={selectionPhase !== 'idle' ? handleAyahTap : handlePageClick}
                    isAyahSelected={(key) => highlightedKeys.has(key)}
                    onSelectionStart={() => {}}
                    onSelectionMove={() => {}}
                    onSelectionEnd={() => {}}
                    nowPlayingKey={null}
                    activeWord={null}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── FOOTER ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {isUiVisible && (
          <motion.footer
            key="footer"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            className="absolute bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-md border-t border-border py-4 px-4 text-center pb-safe"
          >
            <p className="text-sm font-bold text-primary">
              Surah {pageInfo.surahName} · {pageInfo.juz} · Side {currentPage}
            </p>
          </motion.footer>
        )}
      </AnimatePresence>


      {/* ── NOTE DIALOG ────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showNoteDialog && (
          <motion.div
            key="note-dialog"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end"
            onClick={(e) => { if (e.target === e.currentTarget) setShowNoteDialog(false); }}
          >
            <motion.div
              initial={{ y: 200 }}
              animate={{ y: 0 }}
              exit={{ y: 200 }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="w-full bg-card rounded-t-[40px] p-8 pb-12 shadow-2xl space-y-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-display text-primary">Tilføj note</h2>
                <button
                  onClick={() => setShowNoteDialog(false)}
                  className="h-10 w-10 rounded-2xl bg-primary/5 flex items-center justify-center text-primary"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Summary of what was set */}
              <div className="space-y-2 p-4 rounded-2xl bg-primary/5">
                {gradeHifz && (
                  <div className="flex items-center gap-2 text-sm">
                    <BookOpen className="h-4 w-4 text-primary/40" />
                    <span className="text-primary/60 font-medium">Hifz karakter:</span>
                    <span className="font-bold text-primary">{gradeHifz}</span>
                  </div>
                )}
                {gradeMurajara && (
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-primary/40" />
                    <span className="text-primary/60 font-medium">Murajara karakter:</span>
                    <span className="font-bold text-primary">{gradeMurajara}</span>
                  </div>
                )}
                {newHifz && (
                  <div className="flex items-center gap-2 text-sm">
                    <BookOpen className="h-4 w-4 text-accent" />
                    <span className="text-primary/60 font-medium">Ny Hifz lektie:</span>
                    <span className="font-bold text-accent">{getNewAssignmentSummary(newHifz)}</span>
                  </div>
                )}
                {newMurajara && (
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-accent" />
                    <span className="text-primary/60 font-medium">Ny Murajara lektie:</span>
                    <span className="font-bold text-accent">{getNewAssignmentSummary(newMurajara)}</span>
                  </div>
                )}
              </div>

              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Skriv feedback til eleven (valgfrit)..."
                className="w-full min-h-[120px] rounded-2xl border border-border bg-background p-4 text-base font-medium text-foreground placeholder:text-primary/30 resize-none outline-none focus:ring-2 focus:ring-primary/20"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => handleCompleteWithNote(true)}
                  className="flex-1 h-14 rounded-[24px] border border-border text-primary font-black uppercase text-[11px] tracking-widest"
                >
                  Spring over
                </button>
                <button
                  onClick={() => handleCompleteWithNote(false)}
                  className="flex-[2] h-14 rounded-[24px] bg-primary text-white font-black uppercase text-[11px] tracking-widest shadow-xl"
                >
                  Gem & Afslut session
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── EDIT OPTIONS BOTTOM SHEET ────────────────────────────────────────── */}
      <AnimatePresence>
        {showEditOptions && (
          <motion.div
            key="edit-options"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end"
            onClick={() => setShowEditOptions(false)}
          >
            <motion.div
              initial={{ y: 200 }}
              animate={{ y: 0 }}
              exit={{ y: 200 }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="w-full bg-card rounded-t-[40px] p-8 pb-12 shadow-2xl space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="text-center pb-2 border-b border-border">
                <h3 className="text-lg font-bold text-primary">Rediger ny lektie</h3>
                <p className="text-xs text-accent font-bold mt-1.5 uppercase tracking-wider">
                  Valgt: {getNewAssignmentSummary(mode === 'hifz' ? newHifz : newMurajara)}
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <button
                  onClick={() => {
                    setShowEditOptions(false);
                    setSelectionPhase('change-start');
                    setIsUiVisible(false);
                    setFadePrompt('Vælg ny start-ayah');
                  }}
                  className="w-full h-14 rounded-2xl bg-primary/5 text-primary text-sm font-bold active:scale-[0.98] transition-transform"
                >
                  Ændre start-ayah
                </button>
                
                <button
                  onClick={() => {
                    setShowEditOptions(false);
                    setSelectionPhase('change-end');
                    setIsUiVisible(false);
                    setFadePrompt('Vælg ny slut-ayah');
                  }}
                  className="w-full h-14 rounded-2xl bg-primary/5 text-primary text-sm font-bold active:scale-[0.98] transition-transform"
                >
                  Ændre slut-ayah
                </button>
                
                <button
                  onClick={() => {
                    if (mode === 'hifz') setNewHifz(null);
                    else setNewMurajara(null);
                    setShowEditOptions(false);
                  }}
                  className="w-full h-14 rounded-2xl bg-red-50 text-red-600 text-sm font-bold active:scale-[0.98] transition-transform"
                >
                  Slet lektie
                </button>

                <button
                  onClick={() => setShowEditOptions(false)}
                  className="w-full h-14 rounded-2xl border border-border text-primary/60 text-sm font-bold active:scale-[0.98] transition-transform"
                >
                  Annuller
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
