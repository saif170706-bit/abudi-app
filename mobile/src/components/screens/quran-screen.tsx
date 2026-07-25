import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, useWindowDimensions, type ViewToken } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useQuranPage } from '@/hooks/use-quran-page';
import { useQuranProgress, getQuranProgress } from '@/hooks/use-quran-progress';
import { useRecentQuranVisits } from '@/hooks/use-recent-quran-visits';
import { useQuranAudioPlayer } from '@/hooks/use-quran-audio-player';
import { fontFamilyForPage, type QuranPageWord } from '@/lib/quran-asset-cache';

const TOTAL_PAGES = 604;
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
  selected,
  onSelectAyah,
}: {
  pageNumber: number;
  width: number;
  selected: SelectedAyah;
  onSelectAyah: (surah: number, ayah: number) => void;
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
        <Text className="text-center text-muted-foreground">Kunne ikke indlæse side {pageNumber}.</Text>
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
              const isSelected = selected?.surah === run.surah && selected?.ayah === run.ayah;
              return (
                <Text
                  key={runIdx}
                  onPress={() => onSelectAyah(run.surah, run.ayah)}
                  className={isSelected ? 'bg-accent/30' : undefined}
                >
                  {run.words.map((w) => w.text).join(' ')}
                  {runIdx < runs.length - 1 ? ' ' : ''}
                </Text>
              );
            })}
          </Text>
        );
      })}
      <Text className="mt-6 text-center text-xs text-muted-foreground">Side {pageNumber}</Text>
    </View>
  );
}

function SelectionBar({
  selected,
  playing,
  isLoading,
  onPlay,
  onTogglePlayPause,
  onDismiss,
}: {
  selected: NonNullable<SelectedAyah>;
  playing: boolean;
  isLoading: boolean;
  onPlay: () => void;
  onTogglePlayPause: () => void;
  onDismiss: () => void;
}) {
  return (
    <View className="flex-row items-center justify-between border-t border-border bg-card px-4 py-3">
      <Text className="text-sm text-card-foreground">
        Vers {selected.surah}:{selected.ayah}
      </Text>
      <View className="flex-row items-center gap-3">
        <Pressable
          disabled={isLoading}
          onPress={playing ? onTogglePlayPause : onPlay}
          className="rounded-full bg-primary px-4 py-2"
        >
          <Text className="text-sm font-medium text-primary-foreground">
            {isLoading ? '…' : playing ? 'Pause' : 'Afspil'}
          </Text>
        </Pressable>
        <Pressable onPress={onDismiss} className="px-2 py-2">
          <Text className="text-muted-foreground">✕</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function QuranScreen({ initialPageOverride }: { initialPageOverride?: number } = {}) {
  const { width } = useWindowDimensions();
  const { firestore } = useFirebase();
  const { user } = useAuth();
  const { saveProgress } = useQuranProgress();
  const { addVisit } = useRecentQuranVisits();

  const [initialPage, setInitialPage] = useState<number | null>(null);
  const [selected, setSelected] = useState<SelectedAyah>(null);
  const listRef = useRef<FlatList<number>>(null);

  const audio = useQuranAudioPlayer(selected?.surah ?? 1);

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

  const onSelectAyah = useCallback((surah: number, ayah: number) => {
    setSelected((prev) => (prev?.surah === surah && prev?.ayah === ayah ? null : { surah, ayah }));
  }, []);

  const onPlaySelected = useCallback(() => {
    if (selected) audio.playFromAyah(selected.ayah);
  }, [selected, audio]);

  const onDismiss = useCallback(() => {
    audio.pause();
    setSelected(null);
  }, [audio]);

  if (initialPage === null) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
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
          <QuranPageView pageNumber={item} width={width} selected={selected} onSelectAyah={onSelectAyah} />
        )}
      />
      {selected && (
        <SelectionBar
          selected={selected}
          playing={audio.playing}
          isLoading={audio.isLoading}
          onPlay={onPlaySelected}
          onTogglePlayPause={audio.togglePlayPause}
          onDismiss={onDismiss}
        />
      )}
    </SafeAreaView>
  );
}
