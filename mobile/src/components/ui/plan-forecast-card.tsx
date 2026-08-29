import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { calculateForecast, TOTAL_PAGES } from '@/lib/student-logic';
import { useLanguagePreference, LOCALE_MAP } from '@/context/language-context';
import type { Assignment } from '@/shared/types';

export function PlanForecastCard({ assignments, courseDuration }: { assignments: Assignment[]; courseDuration: string }) {
  const forecast = useMemo(() => calculateForecast(assignments, courseDuration || '3'), [assignments, courseDuration]);
  const isAhead = forecast.status === 'ahead';
  const { tGlobal, language } = useLanguagePreference();
  const locale = LOCALE_MAP[language];

  return (
    <View className="rounded-[32px] border border-border bg-card p-6">
      <View className="mb-6 flex-row items-start justify-between">
        <View>
          <Text className="text-xl font-black tracking-tight text-primary">{tGlobal('Hifdh Prognose')}</Text>
          <Text className="mt-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-accent">
            {tGlobal('Tidslinje for fuldførelse')}
          </Text>
        </View>
        <View className={`items-center justify-center rounded-2xl p-3 ${isAhead ? 'bg-emerald-500' : 'bg-accent'}`}>
          <Ionicons name={isAhead ? 'checkmark-circle' : 'trending-up'} size={22} color="#fff" />
        </View>
      </View>

      <View className="mb-6 h-32 justify-between rounded-3xl border border-primary/5 bg-primary/[0.02] p-4">
        <View className="flex-row justify-end">
          <View className={`rounded-xl px-3 py-1.5 ${forecast.percentAheadBehind >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}>
            <Text className="text-[10px] font-black uppercase tracking-wider text-white">
              {forecast.percentAheadBehind >= 0
                ? `${forecast.percentAheadBehind.toFixed(1)}% ${tGlobal('Forud')}`
                : `${Math.abs(forecast.percentAheadBehind).toFixed(1)}% ${tGlobal('Bagud')}`}
            </Text>
          </View>
        </View>
        <View className="h-[2px] w-full bg-accent/20" />
        <View className="flex-row justify-between">
          <Text className="text-[8px] font-black uppercase tracking-tighter text-primary/20">{tGlobal('Start')}</Text>
          <Text className="text-[8px] font-black uppercase tracking-tighter text-accent/40">{tGlobal('Mål (604p)')}</Text>
        </View>
      </View>

      <View className="gap-6">
        <View className="flex-row justify-between px-2">
          <View>
            <Text className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-primary/30">{tGlobal('Forventet færdig')}</Text>
            <Text className={`text-lg font-bold ${forecast.percentAheadBehind >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {forecast.estimatedFinishDate
                ? forecast.estimatedFinishDate.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
                : tGlobal('Beregner...')}
            </Text>
          </View>
          <View className="items-end">
            <Text className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-primary/30">{tGlobal('Planlagt mål')}</Text>
            <Text className="text-lg font-bold text-accent">
              {forecast.targetFinishDate
                ? forecast.targetFinishDate.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
                : tGlobal('Ingen plan')}
            </Text>
          </View>
        </View>

        <View className="gap-3">
          <View className="flex-row items-center gap-2">
            <Ionicons name="information-circle-outline" size={14} color="#9ca3af" />
            <Text className="flex-1 text-[10px] font-black uppercase tracking-widest text-primary/40">
              {tGlobal('Prognosen er baseret på din gennemsnitlige pace de sidste 4 uger.')}
            </Text>
          </View>
          <View className="h-3 w-full overflow-hidden rounded-full bg-primary/5">
            <View
              style={{ width: `${(forecast.completedPages / TOTAL_PAGES) * 100}%` }}
              className="h-full rounded-full bg-accent"
            />
          </View>
          <View className="flex-row justify-between">
            <Text className="text-[9px] font-black uppercase tracking-widest text-primary/30">
              {forecast.completedPages} {tGlobal('sider fuldført')}
            </Text>
            <Text className="text-[9px] font-black uppercase tracking-widest text-primary/30">
              {604 - forecast.completedPages} {tGlobal('sider tilbage')}
            </Text>
          </View>
        </View>

        <View className="flex-row gap-3 border-t border-primary/5 pt-6">
          <View className="flex-1 flex-row items-center gap-3 rounded-2xl border border-primary/5 bg-primary/[0.02] p-3">
            <View className="rounded-xl bg-card p-2 shadow-sm">
              <Ionicons name="calendar-outline" size={16} color="#197670" />
            </View>
            <View>
              <Text className="text-[9px] font-black uppercase tracking-widest text-primary/30">{tGlobal('Tempo')}</Text>
              <Text className="text-xs font-black text-primary">
                {(forecast.actualPace4Weeks * 7).toFixed(1)} {tGlobal('sider/uge')}
              </Text>
            </View>
          </View>
          <View className="flex-1 flex-row items-center gap-3 rounded-2xl border border-primary/5 bg-primary/[0.02] p-3">
            <View className="rounded-xl bg-card p-2 shadow-sm">
              <Ionicons name="alert-circle-outline" size={16} color="#197670" />
            </View>
            <View>
              <Text className="text-[9px] font-black uppercase tracking-widest text-primary/30">{tGlobal('Resterende')}</Text>
              <Text className="text-xs font-black text-primary">
                {forecast.daysRemaining === Infinity ? 'Infinity' : forecast.daysRemaining} {tGlobal('Dage')}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
