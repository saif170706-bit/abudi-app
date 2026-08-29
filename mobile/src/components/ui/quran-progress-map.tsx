import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TOTAL_PAGES, TOTAL_JUZ, getJuzPageRange } from '@/lib/student-logic';
import { surahs } from '@/shared/surahs';

type MapView = 'pages' | 'juz' | 'surahs';

export function QuranProgressMap({
  completedPages,
  completedSurahs = new Set<number>(),
  completedJuz = new Set<number>(),
}: {
  completedPages: Set<number>;
  completedSurahs?: Set<number>;
  completedJuz?: Set<number>;
}) {
  const [mapView, setMapView] = useState<MapView>('pages');
  const overallPct = Math.round((completedPages.size / TOTAL_PAGES) * 100);

  const tabs: { key: MapView; label: string }[] = [
    { key: 'pages', label: 'Sider' },
    { key: 'juz', label: 'Juz' },
    { key: 'surahs', label: 'Suraher' },
  ];

  return (
    <View className="rounded-[32px] border border-accent/30 bg-card p-6">
      <View className="mb-6 flex-row items-center justify-between gap-4">
        <View className="flex-row items-center gap-4">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary/5">
            <Ionicons name="map-outline" size={24} color="#b8860b" />
          </View>
          <View>
            <Text className="text-xl font-black tracking-tight text-primary">Quran kortet</Text>
            <Text className="mt-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-accent">
              {overallPct}% af Quranen fuldført
            </Text>
          </View>
        </View>
      </View>

      <View className="mb-6 flex-row self-start rounded-2xl border border-primary/5 bg-primary/5 p-1">
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setMapView(tab.key)}
            className={`rounded-xl px-4 py-2 ${mapView === tab.key ? 'bg-foreground' : ''}`}
          >
            <Text
              className={`text-[10px] font-black uppercase tracking-widest ${
                mapView === tab.key ? 'text-background' : 'text-primary/40'
              }`}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {mapView === 'pages' && (
        <View className="gap-4">
          <View className="flex-row flex-wrap gap-[3px]">
            {Array.from({ length: TOTAL_PAGES }).map((_, i) => {
              const pageNum = i + 1;
              const isCompleted = completedPages.has(pageNum);
              return (
                <View
                  key={pageNum}
                  style={{ width: 13, height: 13 }}
                  className={`rounded-[2px] ${isCompleted ? 'bg-primary' : 'border border-primary/5 bg-primary/5'}`}
                />
              );
            })}
          </View>
          <View className="flex-row gap-6 border-t border-primary/5 pt-4">
            <View className="flex-row items-center gap-2">
              <View className="h-3 w-3 rounded-sm bg-primary" />
              <Text className="text-[10px] font-black uppercase tracking-widest text-primary/40">Færdig</Text>
            </View>
            <View className="flex-row items-center gap-2">
              <View className="h-3 w-3 rounded-sm border border-primary/5 bg-primary/5" />
              <Text className="text-[10px] font-black uppercase tracking-widest text-primary/40">Mangler</Text>
            </View>
          </View>
        </View>
      )}

      {mapView === 'juz' && (
        <View className="flex-row flex-wrap gap-3">
          {Array.from({ length: TOTAL_JUZ }).map((_, i) => {
            const juzNum = i + 1;
            const [start, end] = getJuzPageRange(juzNum);
            const pagesInJuz = end - start + 1;
            let completedInJuz = 0;
            completedPages.forEach((p) => {
              if (p >= start && p <= end) completedInJuz++;
            });
            const progress = (completedInJuz / pagesInJuz) * 100;
            const isDone = completedJuz.has(juzNum) || progress === 100;

            return (
              <View
                key={juzNum}
                style={{ width: '31%' }}
                className={`rounded-2xl border p-3 ${isDone ? 'border-accent/30 bg-accent/5' : 'border-border bg-card'}`}
              >
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-[9px] font-black uppercase tracking-widest text-primary/40">Juz {juzNum}</Text>
                  <Text className={`text-xs font-bold ${isDone ? 'text-accent' : 'text-primary'}`}>
                    {Math.round(progress)}%
                  </Text>
                </View>
                <View className="h-2 w-full overflow-hidden rounded-full bg-primary/5">
                  <View
                    style={{ width: `${progress}%` }}
                    className={`h-full rounded-full ${isDone ? 'bg-accent' : 'bg-primary'}`}
                  />
                </View>
              </View>
            );
          })}
        </View>
      )}

      {mapView === 'surahs' && (
        <View className="gap-4">
          <View className="flex-row flex-wrap gap-2">
            {surahs.map((s) => {
              const done = completedSurahs.has(s.number);
              return (
                <View
                  key={s.number}
                  style={{ width: 56 }}
                  className={`items-center gap-1 rounded-2xl border p-2 ${
                    done ? 'border-accent/40 bg-accent/10' : 'border-border bg-card'
                  }`}
                >
                  <Text className={`text-[9px] font-black ${done ? 'text-accent' : 'text-primary/30'}`}>{s.number}</Text>
                  <Text numberOfLines={1} className={`text-[11px] ${done ? 'text-primary' : 'text-primary/40'}`}>
                    {s.name}
                  </Text>
                  {done && <Text className="text-[8px] font-black text-accent">✓</Text>}
                </View>
              );
            })}
          </View>
          <View className="flex-row items-center gap-4 border-t border-primary/5 pt-4">
            <Text className="text-2xl font-bold text-accent">{completedSurahs.size}</Text>
            <Text className="text-[10px] font-black uppercase tracking-widest text-primary/30">/ 114 suraher</Text>
          </View>
        </View>
      )}
    </View>
  );
}
