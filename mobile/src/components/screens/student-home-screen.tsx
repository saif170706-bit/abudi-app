import React, { useMemo } from 'react';
import { View, Text, Pressable, ScrollView, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { collection, orderBy, query } from 'firebase/firestore';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useUserProfile } from '@/hooks/use-user-profile';
import { AchievementBanner } from '@/components/ui/achievement-banner';
import { QuranContinueCard } from '@/components/ui/quran-continue-card';
import { LeaderboardPreview } from '@/components/ui/leaderboard-preview';
import {
  calculateCompletedPages,
  calculateStreakPoints,
} from '@/lib/student-logic';
import { getDailyVerse } from '@/lib/daily-verses';
import { useLanguagePreference } from '@/context/language-context';
import type { Assignment } from '@/shared/types';

const TOTAL_PAGES = 604;

const QUICK_ACCESS = [
  { id: 'view-homework', title: 'Lektie Liste', desc: 'Alle opgaver', icon: 'document-text-outline', color: '#ea580c' },
  { id: 'progress-journey', title: 'Hifz Rejse', desc: 'Se dit kort', icon: 'map-outline', color: '#197670' },
  { id: 'quran-index', title: 'Quran', desc: 'Find Surah', icon: 'book-outline', color: '#2563eb' },
  { id: 'leaderboard', title: 'Leaderboard', desc: 'Vind over venner', icon: 'trophy-outline', color: '#b8860b' },
] as const;

export function StudentHomeScreen() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { firestore } = useFirebase();
  const { tGlobal } = useLanguagePreference();

  const assignmentsQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, 'students', user.uid, 'assignments'), orderBy('assignedAt', 'desc')) : null),
    [firestore, user]
  );
  const { data: assignments, isLoading } = useCollection<Assignment>(assignmentsQuery);

  const completedPages = useMemo(() => calculateCompletedPages(assignments || []), [assignments]);
  const totalPagesCount = completedPages.size;
  const streak = useMemo(() => calculateStreakPoints(assignments || []), [assignments]);
  const reviewCount = useMemo(
    () => (assignments || []).filter((a) => a.type === 'moraja3a').length,
    [assignments]
  );
  const dailyVerse = useMemo(() => getDailyVerse(), []);

  const handleQuickAccess = (id: (typeof QUICK_ACCESS)[number]['id']) => {
    if (id === 'quran-index') router.push('/(student)/quran');
    else if (id === 'view-homework') router.push('/(student)/homework');
    else if (id === 'leaderboard') router.push('/leaderboard');
    else if (id === 'progress-journey') router.push('/progress-journey');
    else Alert.alert(tGlobal('Kommer snart'), 'Den side er ikke bygget endnu.');
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Floats over the scroll content, matching the web app's fixed-position achievements button/banner. */}
      {!isLoading && <AchievementBanner totalPages={totalPagesCount} streak={streak} reviewCount={reviewCount} />}

      <ScrollView contentContainerClassName="gap-8 px-6 pb-32 pt-6">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="mb-1 text-sm font-bold text-primary/40">Assalamu Alaikum 👋</Text>
            <Text className="text-3xl font-bold tracking-tight text-primary">
              {profile?.displayName?.split(' ')[0] ?? tGlobal('Elev')}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/(student)/mere')}
            className="h-14 w-14 overflow-hidden rounded-[24px] border-4 border-border shadow-lg"
          >
            {profile?.photoURL ? (
              <Image source={{ uri: profile.photoURL }} className="h-full w-full" resizeMode="cover" />
            ) : (
              <View className="h-full w-full items-center justify-center bg-primary/10">
                <Ionicons name="person" size={22} color="#197670" />
              </View>
            )}
          </Pressable>
        </View>

        <View className="flex-row">
          <View className="flex-1">
            <Text className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{tGlobal('Sider')}</Text>
            <Text className="mt-1 text-xl font-bold text-foreground">{totalPagesCount}</Text>
          </View>
          <View className="mx-3 w-px bg-border" />
          <View className="flex-1">
            <Text className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{tGlobal('Mål')}</Text>
            <Text className="mt-1 text-xl font-bold text-foreground">{TOTAL_PAGES}</Text>
          </View>
          <View className="mx-3 w-px bg-border" />
          <View className="flex-1">
            <Text className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{tGlobal('Procent')}</Text>
            <Text className="mt-1 text-xl font-bold text-foreground">
              {((totalPagesCount / TOTAL_PAGES) * 100).toFixed(1)}%
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => router.push('/queue-system')}
          className="flex-row items-center justify-between overflow-hidden rounded-[28px] border-2 border-accent/40 bg-card p-6 shadow-sm"
        >
          <View>
            <Text className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{tGlobal('Session')}</Text>
            <Text className="mt-1 text-3xl font-bold text-primary">{tGlobal('Læs Lektie')}</Text>
            <Text className="mt-1 text-[10px] font-black uppercase tracking-widest text-accent">
              {tGlobal('Dagens Kø & Evaluering')}
            </Text>
            <View className="mt-6 flex-row items-center gap-2">
              <Text className="text-[11px] font-black uppercase tracking-widest text-primary">{tGlobal('Tilmeld Kø')}</Text>
              <View className="h-4 w-4 items-center justify-center rounded-full bg-foreground">
                <Ionicons name="chevron-forward" size={10} color="#fff" />
              </View>
            </View>
          </View>
          <Ionicons name="people" size={56} color="#197670" style={{ opacity: 0.15 }} />
        </Pressable>

        <View className="gap-4">
          <Text className="text-[10px] font-black uppercase tracking-widest text-accent">| {tGlobal('Hurtig adgang')}</Text>
          <View className="gap-4">
            {[QUICK_ACCESS.slice(0, 2), QUICK_ACCESS.slice(2, 4)].map((row, rowIdx) => (
              <View key={rowIdx} className="flex-row gap-4">
                {row.map((feat) => (
                  <Pressable
                    key={feat.id}
                    onPress={() => handleQuickAccess(feat.id)}
                    className="flex-1 items-center gap-3 rounded-[28px] border border-border bg-card p-6 shadow-sm"
                  >
                    <View className="rounded-2xl bg-primary/5 p-3">
                      <Ionicons name={feat.icon as any} size={24} color={feat.color} />
                    </View>
                    <View className="items-center">
                      <Text className="text-sm font-black leading-tight text-foreground">{tGlobal(feat.title)}</Text>
                      <Text className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {tGlobal(feat.desc)}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        </View>

        <QuranContinueCard />

        {!profile?.hideFromLeaderboard && user && <LeaderboardPreview userId={user.uid} />}

        <View className="gap-4">
          <Text className="text-[10px] font-black uppercase tracking-widest text-accent">| {tGlobal('Dagens Vers')}</Text>
          <View className="items-center rounded-[28px] border border-border bg-card p-8">
            <Text className="mb-6 text-center text-2xl leading-relaxed text-primary">{dailyVerse.arabic}</Text>
            <Text className="mb-4 text-center text-xs italic leading-relaxed text-primary/60">
              "{dailyVerse.translationKey}"
            </Text>
            <View className="mb-4 h-px w-12 bg-accent/20" />
            <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">
              {tGlobal('surah')} {dailyVerse.reference}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
