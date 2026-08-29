import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { calculateAchievements, getLatestEarned, ACHIEVEMENTS, type AchievementStatus } from '@/lib/achievements';

function AchievementsPanel({ statuses, onClose }: { statuses: AchievementStatus[]; onClose: () => void }) {
  const categories = useMemo(() => {
    const hifz = statuses.filter((s) => s.achievement.category === 'memorization');
    const streaks = statuses.filter((s) => s.achievement.category === 'streak');
    const other = statuses.filter((s) => s.achievement.category !== 'memorization' && s.achievement.category !== 'streak');
    return [
      { id: 'hifz', label: 'Hifdh Milesten', items: hifz },
      { id: 'streak', label: 'Murajara Streaks', items: streaks },
      { id: 'other', label: 'Andre Mål', items: other },
    ].filter((c) => c.items.length > 0);
  }, [statuses]);

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable className="flex-1 bg-black/40" onPress={onClose} />
      <View className="absolute inset-x-0 bottom-0 max-h-[85%] rounded-t-[40px] bg-background pb-8 shadow-2xl">
        <View className="items-center pb-1 pt-3">
          <View className="h-1.5 w-12 rounded-full bg-primary/10" />
        </View>
        <View className="flex-row items-start justify-between px-6 pb-2 pt-4">
          <View>
            <Text className="text-xl font-black tracking-tight text-primary">Dine Præstationer</Text>
            <Text className="mt-1 text-[11px] font-bold uppercase tracking-widest text-primary/40">
              Hifdh Journey Achievements
            </Text>
          </View>
          <Pressable onPress={onClose} className="rounded-full bg-primary/5 p-2">
            <Ionicons name="close" size={20} color="#197670" />
          </Pressable>
        </View>

        <ScrollView className="px-6" contentContainerClassName="pb-10">
          {categories.map((cat) => (
            <View key={cat.id} className="mt-6 first:mt-2">
              <Text className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-primary/40">{cat.label}</Text>
              <View className="gap-4">
                {cat.items.map((s) => (
                  <View key={s.achievement.id} className="flex-row items-center gap-4" style={{ opacity: s.earned ? 1 : 0.4 }}>
                    <View className={`h-14 w-14 items-center justify-center rounded-2xl ${s.earned ? 'bg-accent/10' : 'bg-muted'}`}>
                      <Text style={{ fontSize: 28 }}>{s.achievement.icon}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-black text-primary">{s.achievement.titleDa}</Text>
                      <Text className="text-xs font-medium text-primary/60">{s.achievement.descDa}</Text>
                      {!s.earned && s.progress > 0 && (
                        <View className="mt-2.5">
                          <View className="h-1.5 w-full overflow-hidden rounded-full bg-primary/5">
                            <View className="h-full rounded-full bg-accent" style={{ width: `${s.progress * 100}%` }} />
                          </View>
                          <Text className="mt-1.5 text-[9px] font-bold uppercase tracking-wider text-accent">
                            {s.currentValue} / {s.achievement.threshold}
                          </Text>
                        </View>
                      )}
                    </View>
                    {s.earned && (
                      <View className="h-8 w-8 items-center justify-center rounded-full bg-accent">
                        <Ionicons name="star" size={16} color="#fff" />
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

export function AchievementBanner({
  totalPages,
  streak,
  reviewCount,
}: {
  totalPages: number;
  streak: number;
  reviewCount: number;
}) {
  const [showPanel, setShowPanel] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const statuses = useMemo(() => calculateAchievements(totalPages, streak, reviewCount), [totalPages, streak, reviewCount]);
  const latest = getLatestEarned(statuses);
  const unearnedPreviews = statuses.filter((s) => !s.earned).slice(0, 4);
  const earnedCount = statuses.filter((s) => s.earned).length;

  if (dismissed || !latest) {
    return (
      <>
        <Pressable
          onPress={() => setDismissed(false)}
          className="absolute right-0 top-40 z-10 flex-row items-center gap-2 rounded-l-2xl border border-white/20 bg-accent py-3 pl-3 pr-4 shadow-lg"
        >
          <Ionicons name="trophy" size={18} color="#fff" />
          <Text className="text-[10px] font-black uppercase tracking-widest text-white">Dine Præstationer</Text>
        </Pressable>
        {showPanel && <AchievementsPanel statuses={statuses} onClose={() => setShowPanel(false)} />}
      </>
    );
  }

  return (
    <>
      <Pressable
        onPress={() => setShowPanel(true)}
        className="absolute inset-x-6 top-40 z-10 overflow-hidden rounded-[30px] border border-accent/30 bg-primary p-4 shadow-2xl"
      >
        <View className="flex-row items-center gap-4">
          <View className="h-16 w-16 items-center justify-center rounded-2xl border border-accent/30 bg-accent/20">
            <Text style={{ fontSize: 32 }}>{latest.achievement.icon}</Text>
          </View>
          <View className="flex-1">
            <View className="mb-1 flex-row items-center gap-2">
              <View className="h-1.5 w-1.5 rounded-full bg-accent" />
              <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Ny præstation optjent</Text>
            </View>
            <Text className="text-lg font-black tracking-tight text-white">{latest.achievement.titleDa}</Text>
            <Text className="mt-1 text-[10px] font-bold uppercase tracking-wider text-white/50">
              Tryk for at se alle præstationer
            </Text>
          </View>
          <Pressable onPress={() => setDismissed(true)} className="h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
            <Ionicons name="close" size={20} color="#fff" />
          </Pressable>
        </View>
        <View className="mt-4 flex-row items-center justify-between border-t border-white/10 pt-3">
          <View className="flex-row items-center gap-2">
            {unearnedPreviews.map((s) => (
              <View key={s.achievement.id} className="h-6 w-6 items-center justify-center rounded-lg bg-white/5">
                <Text style={{ fontSize: 12, opacity: 0.4 }}>{s.achievement.icon}</Text>
              </View>
            ))}
            <View className="h-6 items-center justify-center rounded-lg bg-white/5 px-2">
              <Text className="text-[9px] font-black uppercase text-white/30">
                {ACHIEVEMENTS.length - earnedCount} tilbage
              </Text>
            </View>
          </View>
          <Ionicons name="trophy" size={14} color="#DEA93E" />
        </View>
      </Pressable>
      {showPanel && <AchievementsPanel statuses={statuses} onClose={() => setShowPanel(false)} />}
    </>
  );
}
