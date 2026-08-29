import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { getQuranProgress } from '@/hooks/use-quran-progress';

/** "Continue reading from page X" card on the student overview — mirrors QuranContinueCard from the web app. */
export function QuranContinueCard() {
  const { firestore } = useFirebase();
  const { user } = useAuth();
  const [page, setPage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      const saved = await getQuranProgress(firestore, user.uid);
      if (!cancelled) {
        setPage(saved);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, firestore]);

  if (loading) {
    return (
      <View className="min-h-[96px] flex-row items-center gap-4 rounded-[28px] bg-primary/5 p-5">
        <ActivityIndicator />
      </View>
    );
  }

  if (!page) return null;

  return (
    <Pressable
      onPress={() => router.push(`/(student)/quran?page=${page}` as any)}
      className="min-h-[96px] flex-row items-center gap-4 rounded-[28px] border border-border bg-card p-5 shadow-sm"
    >
      <View className="h-12 w-12 items-center justify-center rounded-2xl bg-accent/10">
        <Ionicons name="book" size={22} color="#b8860b" />
      </View>
      <View className="flex-1">
        <Text className="mb-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-accent">Fortsæt læsning</Text>
        <Text className="text-base font-black leading-tight text-foreground">Side {page} i Quran</Text>
        <Text className="mt-0.5 text-[10px] font-bold text-muted-foreground">Tryk for at fortsætte</Text>
      </View>
      <View className="h-9 w-9 items-center justify-center rounded-full bg-primary">
        <Ionicons name="chevron-forward" size={18} color="#fff" />
      </View>
    </Pressable>
  );
}
