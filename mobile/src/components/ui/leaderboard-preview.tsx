import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import { useFirebase } from '@/firebase';

function openLeaderboard() {
  router.push('/leaderboard');
}

interface LeaderboardEntry {
  id: string;
  displayName: string;
  photoURL: string | null;
  totalPoints: number;
}

function initials(name?: string) {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

export function LeaderboardPreview({ userId }: { userId: string }) {
  const { firestore } = useFirebase();
  const [loading, setLoading] = useState(true);
  const [topStudents, setTopStudents] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    if (!firestore || !userId) return;
    const q = query(collection(firestore, 'leaderboard'), orderBy('monthlyScore', 'desc'), limit(20));
    getDocs(q)
      .then((snap) => {
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as any);
        setTopStudents(all.slice(0, 3));
        const rank = all.findIndex((s: any) => s.id === userId) + 1;
        setUserRank(rank > 0 ? rank : null);
      })
      .catch((err) => console.error('Leaderboard preview fetch error:', err))
      .finally(() => setLoading(false));
  }, [firestore, userId]);

  if (loading) {
    return (
      <View className="h-24 items-center justify-center rounded-[28px] border border-border bg-card">
        <ActivityIndicator />
      </View>
    );
  }

  const headline =
    userRank === 1 ? 'Du fører!' : userRank && userRank <= 3 ? 'Du er i Top 3!' : 'Top 3 er tæt!';

  return (
    <View className="gap-4">
      <View className="flex-row items-center justify-between px-1">
        <View className="flex-row items-center gap-2">
          <Ionicons name="trophy" size={16} color="#b8860b" />
          <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/30">Leaderboard</Text>
        </View>
        <Pressable onPress={openLeaderboard}>
          <Text className="text-[10px] font-black uppercase tracking-widest text-accent">Se alle →</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={openLeaderboard}
        className="flex-row items-center justify-between rounded-[28px] border border-border bg-card p-5 shadow-sm"
      >
        <View className="flex-row items-center gap-4">
          <View className="flex-row">
            {topStudents.map((s, i) => (
              <View
                key={s.id}
                className="h-10 w-10 items-center justify-center rounded-full border-2 border-background bg-primary"
                style={{ marginLeft: i === 0 ? 0 : -12, zIndex: 10 - i }}
              >
                <Text className="text-[10px] font-bold text-primary-foreground">{initials(s.displayName)}</Text>
              </View>
            ))}
          </View>
          <View>
            <Text className="text-[11px] font-black uppercase tracking-tight text-primary">{headline}</Text>
            <Text className="text-[9px] font-bold uppercase text-primary/30">
              {userRank ? `Du er nummer ${userRank}` : 'Se hvem der fører'}
            </Text>
          </View>
        </View>
        <View className="flex-row items-center gap-3">
          <View className="items-end">
            <Text className="text-[9px] font-black uppercase tracking-widest text-primary/30">Din plads</Text>
            <View className="flex-row items-center gap-1">
              <Ionicons name="sparkles" size={12} color="#b8860b" />
              <Text className="text-xl font-bold text-primary">#{userRank ?? '?'}</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
        </View>
      </Pressable>
    </View>
  );
}
