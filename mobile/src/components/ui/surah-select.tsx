import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, Modal, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Input } from './input';
import { surahs, type Surah } from '@/shared/surahs';
import { useLanguagePreference } from '@/context/language-context';

interface SurahSelectProps {
  value: string | null | undefined; // surah number as string
  onChange: (value: string | null) => void;
  placeholder?: string;
}

export function SurahSelect({ value, onChange, placeholder }: SurahSelectProps) {
  const { tGlobal } = useLanguagePreference();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const resolvedPlaceholder = placeholder ?? tGlobal('Vælg surah…');

  const selected = useMemo(() => surahs.find((s) => String(s.number) === value) ?? null, [value]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return surahs;
    return surahs.filter(
      (s) => s.englishName.toLowerCase().includes(term) || s.name.includes(term) || String(s.number).includes(term)
    );
  }, [search]);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center justify-between rounded-xl border border-border bg-background px-4 py-3"
      >
        <Text className={selected ? 'text-base text-foreground' : 'text-base text-muted-foreground'}>
          {selected ? `${selected.number}. ${selected.englishName}` : resolvedPlaceholder}
        </Text>
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView className="flex-1 bg-background">
          <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
            <Text className="text-lg font-semibold text-foreground">{tGlobal('Vælg surah')}</Text>
            <Pressable onPress={() => setOpen(false)} className="px-2 py-1">
              <Text className="text-muted-foreground">{tGlobal('Luk')}</Text>
            </Pressable>
          </View>
          <View className="p-4">
            <Input placeholder={tGlobal('Søg...')} value={search} onChangeText={setSearch} autoFocus />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(s) => String(s.number)}
            renderItem={({ item }) => (
              <SurahRow
                surah={item}
                selected={item.number === selected?.number}
                onPress={() => {
                  onChange(String(item.number));
                  setOpen(false);
                  setSearch('');
                }}
              />
            )}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}

function SurahRow({ surah, selected, onPress }: { surah: Surah; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center justify-between border-b border-border px-4 py-3 ${selected ? 'bg-accent/10' : ''}`}
    >
      <Text className="text-base text-foreground">
        {surah.number}. {surah.englishName}
      </Text>
      <Text style={{ fontFamily: undefined }} className="text-base text-muted-foreground">
        {surah.name}
      </Text>
    </Pressable>
  );
}
