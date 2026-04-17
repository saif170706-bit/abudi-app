import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SurahSelect } from '@/components/ui/searchable-select';
import type { Surah } from '@/app/lib/surahs';

export function clamp(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

export function AyahRangeFields({
  surahs,
  surahName,
  endSurahName,
  value,
  onChange,
  onEndSurahChange,
  label = 'Ayah-interval',
}: {
  surahs: Surah[];
  surahName: string | null | undefined;
  endSurahName?: string | null | undefined;
  value: { from: number | null; to: number | null };
  onChange: (next: { from: number | null; to: number | null }) => void;
  onEndSurahChange: (nextSurah: string | null) => void;
  label?: string;
}) {
  const selectedStart = useMemo(
    () => (surahName ? surahs.find((s) => s.name === surahName) ?? null : null),
    [surahName, surahs]
  );

  const selectedEnd = useMemo(
    () => (endSurahName ? surahs.find((s) => String(s.number) === endSurahName) ?? null : null),
    [endSurahName, surahs]
  );

  const maxAyahStart = selectedStart?.numberOfAyahs ?? null;
  const maxAyahEnd = selectedEnd?.numberOfAyahs ?? (selectedStart?.numberOfAyahs ?? null);

  const [internalFrom, setInternalFrom] = useState(value.from);
  const [internalTo, setInternalTo] = useState(value.to);
  const [isCrossSurah, setIsCrossSurah] = useState(!!endSurahName);

  useEffect(() => {
    setInternalFrom(value.from);
    setInternalTo(value.to);
  }, [value.from, value.to]);

  useEffect(() => {
    setIsCrossSurah(!!endSurahName);
  }, [endSurahName]);

  const handleFromBlur = () => {
    if (maxAyahStart === null) return;
    if (internalFrom === null) {
      onChange({ from: null, to: internalTo });
      return;
    }
    const newFrom = clamp(internalFrom, 1, maxAyahStart);
    // If NOT cross surah, Clamp 'to' to be at least 'from'
    let newTo = internalTo;
    if (!isCrossSurah && internalTo !== null) {
      newTo = clamp(internalTo, newFrom, maxAyahStart);
    }
    onChange({ from: newFrom, to: newTo });
  };

  const handleToBlur = () => {
    const activeMax = isCrossSurah ? maxAyahEnd : maxAyahStart;
    if (activeMax === null) return;
    if (internalTo === null) {
      onChange({ from: internalFrom, to: null });
      return;
    }
    const minVal = isCrossSurah ? 1 : (internalFrom ?? 1);
    const newTo = clamp(internalTo, minVal, activeMax);
    onChange({ from: internalFrom, to: newTo });
  };

  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      setInternalFrom(null);
      onChange({ from: null, to: internalTo });
    } else {
      let num = parseInt(raw, 10);
      if (Number.isNaN(num)) num = 1;
      
      const activeMax = maxAyahStart ?? 1;
      const clamped = clamp(num, 0, activeMax); // Allow 0 while typing
      
      setInternalFrom(clamped === 0 ? null : clamped);
      onChange({ from: clamped === 0 ? null : clamped, to: internalTo });
    }
  };

  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') {
      setInternalTo(null);
      onChange({ from: internalFrom, to: null });
    } else {
      let num = parseInt(raw, 10);
      if (Number.isNaN(num)) num = 1;

      const activeMax = isCrossSurah ? maxAyahEnd : maxAyahStart;
      if (activeMax) {
        num = clamp(num, 0, activeMax);
      }
      
      setInternalTo(num === 0 ? null : num);
      onChange({ from: internalFrom, to: num === 0 ? null : num });
    }
  };

  const toggleCrossSurah = () => {
    const next = !isCrossSurah;
    setIsCrossSurah(next);
    if (!next) {
      onEndSurahChange(null);
      // Reset To-Ayah if it was over the start surah's limit
      if (maxAyahStart && internalTo && internalTo > maxAyahStart) {
        setInternalTo(maxAyahStart);
        onChange({ from: internalFrom, to: maxAyahStart });
      }
    }
  };

  const surahSelectItems = useMemo(
    () =>
      surahs.map((s) => ({
        id: String(s.number),
        number: s.number,
        english: s.englishName,
        arabic: s.name,
      })),
    [surahs]
  );

  const disabled = maxAyahStart === null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 items-end">
        <div className="space-y-1.5">
          <Label
            htmlFor={`ayah-from-${label}`}
            className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
          >
            Fra Ayah
          </Label>
          <Input
            id={`ayah-from-${label}`}
            type="number"
            inputMode="numeric"
            min={1}
            max={maxAyahStart ?? undefined}
            disabled={disabled}
            value={internalFrom ?? ''}
            onChange={handleFromChange}
            onBlur={handleFromBlur}
            className="h-14 rounded-2xl border-white/40 bg-white/60 dark:bg-white/5 shadow-inner text-lg px-6 font-display"
          />
        </div>

        <div className="space-y-1.5 relative">
          <Label
            htmlFor={`ayah-to-${label}`}
            className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1"
          >
            Til Ayah
          </Label>
          <div className="relative group">
            <Input
              id={`ayah-to-${label}`}
              type="number"
              inputMode="numeric"
              min={1}
              max={(isCrossSurah ? maxAyahEnd : maxAyahStart) ?? undefined}
              disabled={disabled}
              value={internalTo ?? ''}
              onChange={handleToChange}
              onBlur={handleToBlur}
              className="h-14 rounded-2xl border-white/40 bg-white/60 dark:bg-white/5 shadow-inner text-lg pl-6 pr-14 font-display"
            />
            <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggleCrossSurah}
                className={`absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl transition-all ${
                    isCrossSurah ? "bg-[#004D40] text-white rotate-0" : "bg-[#004D40]/5 text-[#004D40] hover:bg-[#004D40]/10"
                }`}
            >
                {isCrossSurah ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </div>

      {isCrossSurah && (
        <div className="p-4 rounded-3xl bg-[#004D40]/5 border border-[#004D40]/10 space-y-4 animate-in slide-in-from-top-2 duration-300">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-[#004D40]/40 ml-1">Vælg slut-surah</Label>
            <SurahSelect
              surahs={surahSelectItems}
              value={endSurahName || null}
              onChange={onEndSurahChange}
              placeholder="Vælg til surah..."
            />
          </div>
        </div>
      )}
    </div>
  );
}