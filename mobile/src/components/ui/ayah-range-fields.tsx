import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Input } from './input';
import { SurahSelect } from './surah-select';
import { surahs, type Surah } from '@/shared/surahs';
import { useLanguagePreference } from '@/context/language-context';

export function clamp(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

interface AyahRangeFieldsProps {
  surahName: string | null | undefined;
  endSurahName?: string | null | undefined;
  value: { from: number | null; to: number | null };
  onChange: (next: { from: number | null; to: number | null }) => void;
  onEndSurahChange: (nextSurahNumber: string | null) => void;
  label?: string;
}

function findByName(name: string | null | undefined): Surah | null {
  return name ? surahs.find((s) => s.name === name || s.englishName === name) ?? null : null;
}

export function AyahRangeFields({
  surahName,
  endSurahName,
  value,
  onChange,
  onEndSurahChange,
  label = 'Ayah-interval',
}: AyahRangeFieldsProps) {
  const { tGlobal } = useLanguagePreference();
  const selectedStart = useMemo(() => findByName(surahName), [surahName]);
  const selectedEnd = useMemo(
    () => (endSurahName ? surahs.find((s) => String(s.number) === endSurahName) ?? null : null),
    [endSurahName]
  );

  const maxAyahStart = selectedStart?.numberOfAyahs ?? null;
  const maxAyahEnd = selectedEnd?.numberOfAyahs ?? maxAyahStart;

  const [isCrossSurah, setIsCrossSurah] = useState(!!endSurahName);

  useEffect(() => {
    setIsCrossSurah(!!endSurahName);
  }, [endSurahName]);

  const disabled = maxAyahStart === null;

  const handleFromChange = (text: string) => {
    if (text === '') {
      onChange({ from: null, to: value.to });
      return;
    }
    const num = clamp(parseInt(text, 10) || 0, 0, maxAyahStart ?? 1);
    onChange({ from: num === 0 ? null : num, to: value.to });
  };

  const handleToChange = (text: string) => {
    if (text === '') {
      onChange({ from: value.from, to: null });
      return;
    }
    const activeMax = isCrossSurah ? maxAyahEnd : maxAyahStart;
    const num = activeMax ? clamp(parseInt(text, 10) || 0, 0, activeMax) : parseInt(text, 10) || 0;
    onChange({ from: value.from, to: num === 0 ? null : num });
  };

  const toggleCrossSurah = () => {
    const next = !isCrossSurah;
    setIsCrossSurah(next);
    if (!next) {
      onEndSurahChange(null);
      if (maxAyahStart && value.to && value.to > maxAyahStart) {
        onChange({ from: value.from, to: maxAyahStart });
      }
    }
  };

  return (
    <View className="gap-4">
      <View className="flex-row gap-3">
        <View className="flex-1 gap-1.5">
          <Text className="ml-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {tGlobal('Fra Ayah')}
          </Text>
          <Input
            keyboardType="number-pad"
            editable={!disabled}
            value={value.from ? String(value.from) : ''}
            onChangeText={handleFromChange}
          />
        </View>
        <View className="flex-1 gap-1.5">
          <View className="flex-row items-center justify-between">
            <Text className="ml-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {tGlobal('Til Ayah')}
            </Text>
            <Pressable
              onPress={toggleCrossSurah}
              style={{ backgroundColor: isCrossSurah ? undefined : 'rgba(25,118,112,0.1)' }}
              className={`h-6 w-6 items-center justify-center rounded-full ${isCrossSurah ? 'bg-primary' : ''}`}
            >
              <Text className={isCrossSurah ? 'text-primary-foreground' : 'text-primary'}>
                {isCrossSurah ? '✕' : '+'}
              </Text>
            </Pressable>
          </View>
          <Input
            keyboardType="number-pad"
            editable={!disabled}
            value={value.to ? String(value.to) : ''}
            onChangeText={handleToChange}
          />
        </View>
      </View>

      {isCrossSurah && (
        <View className="gap-1.5 rounded-2xl border border-primary/10 bg-primary/5 p-4">
          <Text className="ml-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {tGlobal('Vælg slut-surah')}
          </Text>
          <SurahSelect value={endSurahName ?? null} onChange={onEndSurahChange} placeholder={tGlobal('Vælg til surah...')} />
        </View>
      )}
    </View>
  );
}
