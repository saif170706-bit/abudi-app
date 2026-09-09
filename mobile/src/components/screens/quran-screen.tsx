import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, Modal, useWindowDimensions, type ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useQuranPage } from '@/hooks/use-quran-page';
import { useQuranProgress, getQuranProgress } from '@/hooks/use-quran-progress';
import { useRecentQuranVisits } from '@/hooks/use-recent-quran-visits';
import { useQuranAudioPlayer } from '@/hooks/use-quran-audio-player';
import { useSelectedReciter } from '@/hooks/use-selected-reciter';
import { fontFamilyForPage, type QuranPageWord } from '@/lib/quran-asset-cache';
import { SURAH_AYAH_COUNTS } from '@/lib/quran-audio-data';
import { findPageForVerse } from '@/lib/quran-page-lookup';
import { reciters } from '@/lib/reciters';
import { useLanguagePreference } from '@/context/language-context';

const TOTAL_PAGES = 604;
const TOTAL_SURAHS = 114;
const PAGES = Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1);

type SelectedAyah = { surah: number; ayah: number } | null;

/** Splits a line's words into consecutive runs sharing the same ayah, so each run is independently tappable. */
function groupWordsByAyah(words: QuranPageWord[]) {
  const runs: { surah: number; ayah: number; words: QuranPageWord[] }[] = [];
  for (const word of words) {
    const [surahStr, ayahStr] = word.location.split(':');
    const surah = Number(surahStr);
    const ayah = Number(ayahStr);
    const last = runs[runs.length - 1];
    if (last && last.surah === surah && last.ayah === ayah) {
      last.words.push(word);
    } else {
      runs.push({ surah, ayah, words: [word] });
    }
  }
  return runs;
}

function QuranPageView({
  pageNumber,
  width,
  highlighted,
  onSelectAyah,
  tGlobal,
}: {
  pageNumber: number;
  width: number;
  highlighted: SelectedAyah;
  onSelectAyah: (surah: number, ayah: number) => void;
  tGlobal: (text: string) => string;
}) {
  const { data, isLoading, error } = useQuranPage(pageNumber);

  if (isLoading || !data) {
    return (
      <View style={{ width }} className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ width }} className="flex-1 items-center justify-center px-6">
        <Text className="text-center text-muted-foreground">{tGlobal('Kunne ikke indlæse side')} {pageNumber}.</Text>
      </View>
    );
  }

  return (
    <View style={{ width }} className="flex-1 justify-center px-6">
      {data.lines.map((line, idx) => {
        if (line.lineType === 'surah_name') {
          return (
            <Text key={idx} className="mb-4 text-center text-xl font-semibold text-primary">
              سورة {line.surahNumber}
            </Text>
          );
        }
        const runs = groupWordsByAyah(line.words);
        return (
          <Text
            key={idx}
            style={{ fontFamily: fontFamilyForPage(pageNumber), writingDirection: 'rtl' }}
            className="text-center text-2xl leading-[3rem] text-foreground"
          >
            {runs.map((run, runIdx) => {
              const isSelected = highlighted?.surah === run.surah && highlighted?.ayah === run.ayah;
              return (
                <Text
                  key={runIdx}
                  onPress={() => onSelectAyah(run.surah, run.ayah)}
                  style={isSelected ? { backgroundColor: 'rgba(184,134,11,0.3)' } : undefined}
                >
                  {run.words.map((w) => w.text).join(' ')}
                  {runIdx < runs.length - 1 ? ' ' : ''}
                </Text>
              );
            })}
          </Text>
        );
      })}
      <Text className="mt-6 text-center text-xs text-muted-foreground">{tGlobal('side')} {pageNumber}</Text>
    </View>
  );
}

function SelectionBar({
  selected,
  playing,
  isLoading,
  canPrev,
  canNext,
  onPlay,
  onTogglePlayPause,
  onPrev,
  onNext,
  onOpenReciter,
  reciterName,
  onDismiss,
  tGlobal,
}: {
  selected: NonNullable<SelectedAyah>;
  playing: boolean;
  isLoading: boolean;
  canPrev: boolean;
  canNext: boolean;
  onPlay: () => void;
  onTogglePlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onOpenReciter: () => void;
  reciterName: string;
  onDismiss: () => void;
  tGlobal: (text: string) => string;
}) {
  return (
    <View className="border-t border-border bg-card px-4 py-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-sm font-bold text-card-foreground">
            {tGlobal('verseLabel')} {selected.surah}:{selected.ayah}
          </Text>
          <Pressable onPress={onOpenReciter} className="mt-0.5 flex-row items-center gap-1">
            <Ionicons name="person-circle-outline" size={13} color="#9ca3af" />
            <Text className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground" numberOfLines={1}>
              {reciterName}
            </Text>
          </Pressable>
        </View>
        <View className="flex-row items-center gap-2">
          <Pressable
            disabled={isLoading || !canPrev}
            onPress={onPrev}
            style={{ opacity: canPrev ? 1 : 0.3 }}
            className="h-9 w-9 items-center justify-center rounded-full bg-muted"
          >
            <Ionicons name="play-skip-back" size={16} color="#374151" />
          </Pressable>
          <Pressable
            disabled={isLoading}
            onPress={playing ? onTogglePlayPause : onPlay}
            className="h-11 w-11 items-center justify-center rounded-full bg-primary"
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name={playing ? 'pause' : 'play'} size={18} color="#fff" />
            )}
          </Pressable>
          <Pressable
            disabled={isLoading || !canNext}
            onPress={onNext}
            style={{ opacity: canNext ? 1 : 0.3 }}
            className="h-9 w-9 items-center justify-center rounded-full bg-muted"
          >
            <Ionicons name="play-skip-forward" size={16} color="#374151" />
          </Pressable>
          <Pressable onPress={onDismiss} className="px-1 py-2">
            <Text className="text-muted-foreground">✕</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function ReciterPickerModal({
  visible,
  currentId,
  onSelect,
  onClose,
  tGlobal,
}: {
  visible: boolean;
  currentId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  tGlobal: (text: string) => string;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
          <Text className="text-lg font-semibold text-foreground">{tGlobal('Vælg oplæser')}</Text>
          <Pressable onPress={onClose} className="px-2 py-1">
            <Text className="text-muted-foreground">{tGlobal('Luk')}</Text>
          </Pressable>
        </View>
        <FlatList
          data={reciters}
          keyExtractor={(r) => r.id}
          contentContainerClassName="p-2"
          renderItem={({ item }) => {
            const isActive = item.id === currentId;
            return (
              <Pressable
                onPress={() => {
                  onSelect(item.id);
                  onClose();
                }}
                style={{ backgroundColor: isActive ? 'rgba(25,118,112,0.1)' : undefined }}
                className="flex-row items-center justify-between rounded-2xl px-4 py-3"
              >
                <Text className={`text-base ${isActive ? 'font-bold text-primary' : 'text-foreground'}`}>
                  {item.name}
                  {item.style ? ` (${item.style})` : ''}
                </Text>
                {isActive && <Ionicons name="checkmark" size={20} color="#197670" />}
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

export function QuranScreen({
  initialPageOverride,
  backHref,
}: { initialPageOverride?: number; backHref?: string } = {}) {
  const { width } = useWindowDimensions();
  const { firestore } = useFirebase();
  const { user } = useAuth();
  const { saveProgress } = useQuranProgress();
  const { addVisit } = useRecentQuranVisits();
  const { tGlobal } = useLanguagePreference();
  const { reciterId, reciter, setReciterId } = useSelectedReciter();

  const [initialPage, setInitialPage] = useState<number | null>(null);
  const [selected, setSelected] = useState<SelectedAyah>(null);
  const [reciterPickerOpen, setReciterPickerOpen] = useState(false);
  const listRef = useRef<FlatList<number>>(null);
  const pendingAutoplayAyahRef = useRef<number | null>(null);

  const audio = useQuranAudioPlayer(selected?.surah ?? 1, Number(reciterId));

  useEffect(() => {
    if (initialPageOverride && initialPageOverride >= 1 && initialPageOverride <= TOTAL_PAGES) {
      setInitialPage(initialPageOverride);
      return;
    }
    let cancelled = false;
    (async () => {
      const saved = user ? await getQuranProgress(firestore, user.uid) : null;
      if (!cancelled) setInitialPage(saved && saved >= 1 && saved <= TOTAL_PAGES ? saved : 1);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, initialPageOverride]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const page = viewableItems[0]?.item as number | undefined;
      if (!page) return;
      saveProgress(page);
      addVisit(page);
    },
    [saveProgress, addVisit]
  );

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const scrollToVerse = useCallback((surah: number, ayah: number) => {
    const page = findPageForVerse(surah, ayah);
    if (page) listRef.current?.scrollToIndex({ index: page - 1, animated: true });
  }, []);

  const onSelectAyah = useCallback(
    (surah: number, ayah: number) => {
      setSelected((prev) => (prev?.surah === surah && prev?.ayah === ayah ? null : { surah, ayah }));
    },
    []
  );

  const onPlaySelected = useCallback(() => {
    if (selected) audio.playFromAyah(selected.ayah);
  }, [selected, audio]);

  const onDismiss = useCallback(() => {
    audio.pause();
    setSelected(null);
  }, [audio]);

  // Once loading a newly-selected surah (from crossing a surah boundary via
  // next/prev/auto-continue) finishes, resume playback at the ayah that
  // triggered the crossing — playFromAyah can't be called synchronously
  // right after changing surah since the new surah's timings haven't loaded yet.
  useEffect(() => {
    if (!audio.isLoading && pendingAutoplayAyahRef.current != null) {
      const ayah = pendingAutoplayAyahRef.current;
      pendingAutoplayAyahRef.current = null;
      audio.playFromAyah(ayah);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audio.isLoading]);

  const goToNextSurah = useCallback(() => {
    if (!selected) return;
    const nextSurah = selected.surah + 1;
    if (nextSurah > TOTAL_SURAHS) return;
    pendingAutoplayAyahRef.current = 1;
    setSelected({ surah: nextSurah, ayah: 1 });
    scrollToVerse(nextSurah, 1);
  }, [selected, scrollToVerse]);

  // Continuous "read aloud": once a surah's last ayah finishes on its own, keep going into the next surah.
  useEffect(() => {
    audio.setOnSurahEnd(goToNextSurah);
    return () => audio.setOnSurahEnd(null);
  }, [audio, goToNextSurah]);

  const onNext = useCallback(() => {
    if (!selected) return;
    if (audio.isLastAyah) {
      goToNextSurah();
    } else {
      audio.nextAyah();
      const nextAyahNum = (selected.ayah ?? 0) + 1;
      setSelected({ surah: selected.surah, ayah: nextAyahNum });
      scrollToVerse(selected.surah, nextAyahNum);
    }
  }, [selected, audio, goToNextSurah, scrollToVerse]);

  const onPrev = useCallback(() => {
    if (!selected) return;
    if (audio.isFirstAyah) {
      const prevSurah = selected.surah - 1;
      if (prevSurah < 1) return;
      const lastAyah = SURAH_AYAH_COUNTS[prevSurah];
      pendingAutoplayAyahRef.current = lastAyah;
      setSelected({ surah: prevSurah, ayah: lastAyah });
      scrollToVerse(prevSurah, lastAyah);
    } else {
      audio.prevAyah();
      const prevAyahNum = (selected.ayah ?? 2) - 1;
      setSelected({ surah: selected.surah, ayah: prevAyahNum });
      scrollToVerse(selected.surah, prevAyahNum);
    }
  }, [selected, audio, scrollToVerse]);

  // The highlighted/displayed ayah tracks actual playback progress once a
  // session has started (so it moves forward automatically during continuous
  // reading), falling back to whatever was tapped before playback began.
  const highlighted = useMemo<SelectedAyah>(() => {
    if (!selected) return null;
    if (audio.activeAyah != null) return { surah: selected.surah, ayah: audio.activeAyah };
    return selected;
  }, [selected, audio.activeAyah]);

  const reciterLabel = reciter ? `${reciter.name}${reciter.style ? ` (${reciter.style})` : ''}` : '';

  if (initialPage === null) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {backHref && (
        <Pressable
          onPress={() => router.replace(backHref as any)}
          className="absolute left-4 top-4 z-10 h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card/90 shadow-sm"
        >
          <Ionicons name="arrow-back" size={20} color="#374151" />
        </Pressable>
      )}
      <FlatList
        ref={listRef}
        data={PAGES}
        keyExtractor={(p) => String(p)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={initialPage - 1}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        windowSize={3}
        maxToRenderPerBatch={2}
        initialNumToRender={1}
        renderItem={({ item }) => (
          <QuranPageView pageNumber={item} width={width} highlighted={highlighted} onSelectAyah={onSelectAyah} tGlobal={tGlobal} />
        )}
      />
      {selected && (
        <SelectionBar
          selected={selected}
          playing={audio.playing}
          isLoading={audio.isLoading}
          canPrev={!(audio.isFirstAyah && selected.surah <= 1)}
          canNext={!(audio.isLastAyah && selected.surah >= TOTAL_SURAHS)}
          onPlay={onPlaySelected}
          onTogglePlayPause={audio.togglePlayPause}
          onPrev={onPrev}
          onNext={onNext}
          onOpenReciter={() => setReciterPickerOpen(true)}
          reciterName={reciterLabel}
          onDismiss={onDismiss}
          tGlobal={tGlobal}
        />
      )}
      <ReciterPickerModal
        visible={reciterPickerOpen}
        currentId={reciterId}
        onSelect={setReciterId}
        onClose={() => setReciterPickerOpen(false)}
        tGlobal={tGlobal}
      />
    </SafeAreaView>
  );
}
