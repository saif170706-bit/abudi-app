import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { collection, doc, getCountFromServer, getDoc, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { useLanguagePreference } from '@/context/language-context';

interface LeaderboardEntry {
  id: string;
  displayName: string;
  photoURL: string | null;
  monthlyScore: number;
  allTimeScore: number;
  streakPoints: number;
  plan: string;
  frequency: number;
}

type Filter = 'monthly' | 'allTime' | 'streak';

const SCORE_KEY: Record<Filter, keyof LeaderboardEntry> = {
  monthly: 'monthlyScore',
  allTime: 'allTimeScore',
  streak: 'streakPoints',
};

const MEDAL_COLORS = ['#DEA93E', '#94A3B8', '#92400E'];

function initials(name?: string) {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

function Avatar({ entry, size, ringColor }: { entry: LeaderboardEntry; size: number; ringColor?: string }) {
  return (
    <View
      style={{ height: size, width: size, borderRadius: size / 2, borderWidth: 4, borderColor: ringColor ?? '#e5e7eb' }}
      className="items-center justify-center bg-primary shadow-xl"
    >
      <Text className="font-black text-primary-foreground" style={{ fontSize: size * 0.32 }}>
        {initials(entry.displayName)}
      </Text>
    </View>
  );
}

function Podium({
  top3,
  filter,
  currentUserId,
  tGlobal,
}: {
  top3: LeaderboardEntry[];
  filter: Filter;
  currentUserId?: string;
  tGlobal: (s: string) => string;
}) {
  const order = [top3[1], top3[0], top3[2]];
  const ranks = [2, 1, 3];
  const heights = [96, 160, 72];

  return (
    <View className="flex-row items-end justify-center gap-2 px-2 pb-6 pt-10">
      {order.map((entry, i) => {
        if (!entry) return <View key={i} className="flex-1" />;
        const rank = ranks[i];
        const isFirst = rank === 1;
        const isMe = entry.id === currentUserId;
        const value = entry[SCORE_KEY[filter]];

        return (
          <View key={entry.id} className="flex-1 items-center">
            <View className="relative mb-3">
              {isFirst && (
                <Text style={{ position: 'absolute', top: -34, left: '50%', marginLeft: -14, fontSize: 28, zIndex: 20 }}>
                  👑
                </Text>
              )}
              <Avatar entry={entry} size={isFirst ? 80 : 56} ringColor={isMe ? '#197670' : isFirst ? '#DEA93E' : '#fff'} />
              <View
                style={{ backgroundColor: MEDAL_COLORS[rank - 1] }}
                className="absolute -bottom-2 left-1/2 h-6 w-6 -ml-3 items-center justify-center rounded-full border-2 border-background"
              >
                <Text className="text-[10px] font-black text-white">{rank}</Text>
              </View>
            </View>
            <Text numberOfLines={1} className="mb-2 max-w-full px-1 text-[10px] font-black uppercase text-primary/60">
              {entry.displayName?.split(' ')[0]}
            </Text>
            <View
              style={{ height: heights[i] }}
              className={`w-full items-center justify-center rounded-t-2xl p-2 ${
                isFirst ? 'bg-primary' : 'border-x border-t border-border bg-card'
              }`}
            >
              <Text className={`text-lg font-bold ${isFirst ? 'text-primary-foreground' : 'text-primary'}`}>{value ?? 0}</Text>
              <Text className={`text-[8px] font-black uppercase tracking-widest opacity-50 ${isFirst ? 'text-primary-foreground' : 'text-primary'}`}>
                {filter === 'streak' ? tGlobal('Pts') : tGlobal('Score')}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function LeaderboardScreen() {
  const { firestore } = useFirebase();
  const { user } = useAuth();
  const { tGlobal } = useLanguagePreference();
  const [filter, setFilter] = useState<Filter>('monthly');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [limitCount, setLimitCount] = useState<number | 'all'>(10);
  const [me, setMe] = useState<LeaderboardEntry | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);

  const scoreKey = SCORE_KEY[filter];

  useEffect(() => {
    if (!user) return;
    getDoc(doc(firestore, 'leaderboard', user.uid))
      .then((snap) => {
        if (!snap.exists()) return;
        const s = snap.data();
        setMe({
          id: snap.id,
          displayName: s.displayName,
          photoURL: s.photoURL,
          plan: s.plan,
          frequency: s.frequency,
          monthlyScore: s.monthlyScore || 0,
          allTimeScore: s.allTimeScore || 0,
          streakPoints: s.streakPoints || 0,
        });
      })
      .catch(() => null);
  }, [firestore, user?.uid]);

  useEffect(() => {
    setIsLoading(true);
    let q = query(collection(firestore, 'leaderboard'), orderBy(scoreKey as string, 'desc'));
    if (limitCount !== 'all') q = query(q, limit(limitCount));
    getDocs(q)
      .then((snap) => {
        setEntries(
          snap.docs.map((d) => {
            const s = d.data();
            return {
              id: d.id,
              displayName: s.displayName,
              photoURL: s.photoURL,
              plan: s.plan,
              frequency: s.frequency,
              monthlyScore: s.monthlyScore || 0,
              allTimeScore: s.allTimeScore || 0,
              streakPoints: s.streakPoints || 0,
            } as LeaderboardEntry;
          })
        );
      })
      .finally(() => setIsLoading(false));
  }, [firestore, filter, limitCount, scoreKey]);

  useEffect(() => {
    if (!me) return;
    const myScore = me[scoreKey] as number;
    getCountFromServer(query(collection(firestore, 'leaderboard'), where(scoreKey as string, '>', myScore)))
      .then((snap) => setMyRank(snap.data().count + 1))
      .catch(() => setMyRank(null));
  }, [firestore, me, scoreKey]);

  const top3 = entries.slice(0, 3);
  const rest = useMemo(() => entries.slice(3), [entries]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="gap-4 border-b border-border px-6 pb-4 pt-4">
        <View className="flex-row items-center gap-4">
          <Pressable
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-xl border border-border bg-card shadow-sm"
          >
            <Ionicons name="chevron-back" size={18} color="#197670" />
          </Pressable>
          <View>
            <Text className="text-2xl font-bold text-primary">{tGlobal('Leaderboard')}</Text>
            <View className="mt-1 flex-row items-center gap-2">
              <View className="h-1.5 w-1.5 rounded-full bg-accent" />
              <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40">
                {tGlobal('Konkurrér med andre')}
              </Text>
            </View>
          </View>
        </View>

        <View className="flex-row gap-1 rounded-2xl bg-primary/5 p-1">
          {(
            [
              { id: 'monthly', label: 'Måned', icon: 'calendar-outline' as const },
              { id: 'allTime', label: 'Top-liste', icon: 'ribbon-outline' as const },
              { id: 'streak', label: 'Streaks', icon: 'trending-up-outline' as const },
            ] as const
          ).map((f) => (
            <Pressable
              key={f.id}
              onPress={() => setFilter(f.id)}
              className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2.5 ${
                filter === f.id ? 'bg-card shadow-sm' : ''
              }`}
            >
              <Ionicons name={f.icon} size={12} color={filter === f.id ? '#197670' : '#9ca3af'} />
              <Text
                className={`text-[10px] font-black uppercase tracking-widest ${
                  filter === f.id ? 'text-primary' : 'text-primary/40'
                }`}
              >
                {tGlobal(f.label)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator className="mt-16" />
      ) : (
        <FlatList
          data={rest}
          keyExtractor={(e) => e.id}
          contentContainerClassName="gap-2 px-6 pb-8"
          ListHeaderComponent={
            top3.length > 0 ? <Podium top3={top3} filter={filter} currentUserId={user?.uid} tGlobal={tGlobal} /> : null
          }
          renderItem={({ item, index }) => {
            const rank = index + 4;
            const isMe = item.id === user?.uid;
            const value = item[scoreKey];
            return (
              <View
                className={`flex-row items-center gap-3 rounded-2xl border bg-card p-3 shadow-sm ${
                  isMe ? 'border-primary/30' : 'border-border'
                }`}
              >
                <Text className="w-6 text-center text-[10px] font-black text-primary/20">{rank}</Text>
                <View className="h-10 w-10 items-center justify-center rounded-full border border-border bg-primary/5">
                  <Text className="text-xs font-black text-primary">{initials(item.displayName)}</Text>
                </View>
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text numberOfLines={1} className="text-sm font-black text-primary">
                      {item.displayName}
                    </Text>
                    {isMe && (
                      <View className="rounded bg-primary px-1 py-0.5">
                        <Text className="text-[8px] font-black text-primary-foreground">{tGlobal('DIG')}</Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-[9px] font-bold uppercase tracking-widest text-primary/30">
                    {item.plan ?? '?'} {tGlobal('års plan')} • {item.frequency ?? '?'} {tGlobal('dage/uge')}
                  </Text>
                </View>
                <View className="items-end">
                  <Text className="text-sm font-bold text-primary">{value ?? 0}</Text>
                  <Text className="text-[8px] font-black uppercase tracking-widest text-primary/30">
                    {filter === 'streak' ? tGlobal('Pts') : tGlobal('Score')}
                  </Text>
                </View>
              </View>
            );
          }}
          ListFooterComponent={
            limitCount !== 'all' && entries.length === limitCount ? (
              <View className="gap-3 pt-6">
                <Button variant="outline" onPress={() => setLimitCount((prev) => (typeof prev === 'number' ? prev + 10 : prev))}>
                  {tGlobal('Vis 10 mere')}
                </Button>
                <Button variant="ghost" onPress={() => setLimitCount('all')}>
                  {tGlobal('Vis alle')}
                </Button>
              </View>
            ) : null
          }
          ListEmptyComponent={
            top3.length === 0 ? (
              <Text className="mt-16 text-center text-muted-foreground">{tGlobal('Ingen placeringer endnu.')}</Text>
            ) : null
          }
        />
      )}

      {me && myRank && myRank > 3 && !isLoading && (
        <View className="px-6 pb-4">
          <View className="flex-row items-center gap-3 rounded-3xl border border-border bg-primary p-4 shadow-2xl">
            <View className="h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
              <Text className="text-lg font-bold text-accent">#{myRank}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-[10px] font-black uppercase tracking-widest text-white/60">{tGlobal('Din placering')}</Text>
              <Text className="text-base font-bold text-white">{tGlobal('Fortsæt det gode arbejde!')}</Text>
            </View>
            <View className="items-end">
              <Text className="text-lg font-bold text-white">{me[scoreKey]}</Text>
              <Text className="text-[8px] font-black uppercase text-white/60">
                {filter === 'streak' ? tGlobal('Streak Pts') : tGlobal('Hifz Score')}
              </Text>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
