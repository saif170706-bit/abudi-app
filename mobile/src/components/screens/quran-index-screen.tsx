import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, FlatList, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { surahs, type Surah } from '@/shared/surahs';
import { findPageForVerse } from '@/lib/quran-page-lookup';
import { useRecentQuranVisits } from '@/hooks/use-recent-quran-visits';

function firstPageOf(surahNumber: number): number {
  return findPageForVerse(surahNumber, 1) ?? 1;
}

export function QuranIndexScreen() {
  const [tab, setTab] = useState<'surah' | 'page'>('surah');
  const [searchTerm, setSearchTerm] = useState('');
  const [pageInput, setPageInput] = useState('');
  const { visits } = useRecentQuranVisits();

  const navigateToPage = (page: number) => router.push(`/(student)/quran?page=${page}` as any);

  const filteredSurahs = useMemo(() => {
    if (!searchTerm) return surahs;
    const term = searchTerm.toLowerCase().replace(/-/g, ' ');
    return surahs.filter(
      (s: Surah) =>
        s.englishName.toLowerCase().replace(/-/g, ' ').includes(term) ||
        s.name.toLowerCase().includes(term) ||
        String(s.number).includes(term)
    );
  }, [searchTerm]);

  const handlePageSearch = () => {
    const pageNum = parseInt(pageInput, 10);
    if (isNaN(pageNum) || pageNum < 1 || pageNum > 604) {
      Alert.alert('Ugyldig side', 'Vælg venligst en side mellem 1 og 604.');
      return;
    }
    navigateToPage(pageNum);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-start justify-between px-4 pt-4">
        <View>
          <Text className="text-4xl font-bold tracking-tight text-foreground">Koran</Text>
          <Text className="mt-2 text-[10px] font-black uppercase tracking-[0.25em] text-accent">
            Udforsk de hellige skrifter
          </Text>
        </View>
        <Pressable
          onPress={() => navigateToPage(1)}
          className="h-14 w-14 items-center justify-center rounded-2xl border border-border bg-primary/5"
        >
          <Ionicons name="book-outline" size={26} color="#197670" />
        </Pressable>
      </View>

      <View className="mx-4 mt-6 flex-row rounded-2xl bg-primary/5 p-1">
        <Pressable
          onPress={() => setTab('surah')}
          className={`flex-1 items-center rounded-xl py-3 ${tab === 'surah' ? 'bg-card shadow-sm' : ''}`}
        >
          <Text className="text-[10px] font-black uppercase tracking-widest text-foreground">Surah</Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('page')}
          className={`flex-1 items-center rounded-xl py-3 ${tab === 'page' ? 'bg-card shadow-sm' : ''}`}
        >
          <Text className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Side</Text>
        </Pressable>
      </View>

      {tab === 'page' ? (
        <View className="flex-1 items-center px-6 pt-16">
          <View className="mb-6 h-24 w-24 items-center justify-center rounded-[40px] bg-accent/10">
            <Ionicons name="book" size={44} color="#b8860b" />
          </View>
          <Text className="text-2xl font-bold text-foreground">Gå til side</Text>
          <Text className="mt-2 text-[10px] font-black uppercase tracking-widest text-primary/30">
            Vælg en side mellem 1 og 604
          </Text>
          <TextInput
            value={pageInput}
            onChangeText={setPageInput}
            keyboardType="number-pad"
            placeholder="1 - 604"
            className="mt-8 h-20 w-full rounded-[32px] border border-border bg-card text-center text-4xl font-bold text-foreground"
          />
          <Pressable onPress={handlePageSearch} className="mt-6 h-16 w-full items-center justify-center rounded-[32px] bg-primary">
            <Text className="text-lg font-black uppercase tracking-[0.2em] text-primary-foreground">Gå</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredSurahs}
          keyExtractor={(s) => String(s.number)}
          contentContainerClassName="gap-3 p-4"
          ListHeaderComponent={
            <View className="mb-4 gap-6">
              <View className="relative">
                <Ionicons name="search" size={18} color="#9ca3af" style={{ position: 'absolute', left: 16, top: 17, zIndex: 1 }} />
                <TextInput
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  placeholder="Find din surah..."
                  className="h-14 rounded-[24px] bg-primary/5 pl-12 pr-4 text-base font-bold text-foreground"
                />
              </View>

              {visits.length > 0 && !searchTerm && (
                <View className="gap-3">
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="time-outline" size={12} color="#9ca3af" />
                    <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                      Nyligt besøgt
                    </Text>
                  </View>
                  <View className="flex-row gap-3">
                    {visits.slice(0, 2).map((v) => (
                      <Pressable
                        key={v.page}
                        onPress={() => navigateToPage(v.page)}
                        className="flex-1 items-center rounded-2xl border border-border bg-card p-4"
                      >
                        <Text numberOfLines={1} className="text-sm font-bold text-foreground">
                          {v.surahName ?? `Side ${v.page}`}
                        </Text>
                        <Text className="mt-1 text-[10px] font-black uppercase tracking-widest text-accent">
                          Side {v.page}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => navigateToPage(firstPageOf(item.number))}
              className="flex-row items-center gap-5 rounded-[28px] border border-border bg-card px-6 py-5"
            >
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-primary/5">
                <Text className="text-lg font-bold text-primary">{item.number}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-[17px] font-bold text-foreground">{item.englishName}</Text>
                <Text className="mt-1 text-[10px] font-black uppercase tracking-widest text-primary/30">
                  {item.revelationType === 'Meccan' ? 'Makki' : 'Madani'} • {item.numberOfAyahs} vers
                </Text>
              </View>
              <Text className="text-3xl text-primary">{item.name}</Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <View className="items-center py-20">
              <Ionicons name="search" size={32} color="#d1d5db" />
              <Text className="mt-4 font-bold text-primary/40">Ingen resultater for "{searchTerm}"</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
