import React, { useMemo } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { collection, orderBy, query } from 'firebase/firestore';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useUserProfile } from '@/hooks/use-user-profile';
import { QuranProgressMap } from '@/components/ui/quran-progress-map';
import { HifdhJourneyPath } from '@/components/ui/hifdh-journey-path';
import { PlanForecastCard } from '@/components/ui/plan-forecast-card';
import { calculateCompletedPages, calculateCompletedSurahs, calculateCompletedJuz } from '@/lib/student-logic';
import type { Assignment } from '@/shared/types';

export function ProgressJourneyScreen() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { firestore } = useFirebase();

  const assignmentsQuery = useMemoFirebase(
    () => (user ? query(collection(firestore, 'students', user.uid, 'assignments'), orderBy('assignedAt', 'desc')) : null),
    [firestore, user]
  );
  const { data: assignments, isLoading } = useCollection<Assignment>(assignmentsQuery);

  const completedPages = useMemo(() => calculateCompletedPages(assignments || []), [assignments]);
  const completedSurahs = useMemo(() => calculateCompletedSurahs(assignments || []), [assignments]);
  const completedJuz = useMemo(() => calculateCompletedJuz(assignments || []), [assignments]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerClassName="gap-8 px-6 pb-16 pt-6">
        <View className="flex-row items-center gap-4">
          <Pressable
            onPress={() => router.back()}
            className="h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card shadow-sm"
          >
            <Ionicons name="chevron-back" size={22} color="#197670" />
          </Pressable>
          <View>
            <Text className="text-3xl font-bold text-primary">Hifz Rejse</Text>
            <Text className="text-[10px] font-black uppercase tracking-[0.25em] text-accent">
              Din personlige oversigt
            </Text>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator className="mt-10" />
        ) : (
          <>
            <View className="gap-3">
              <Text className="text-[10px] font-black uppercase tracking-widest text-accent">| Quran kortet</Text>
              <QuranProgressMap completedPages={completedPages} completedSurahs={completedSurahs} completedJuz={completedJuz} />
            </View>

            <HifdhJourneyPath completedPages={completedPages.size} />

            <View className="gap-3">
              <Text className="text-[10px] font-black uppercase tracking-widest text-accent">| Prognose</Text>
              <PlanForecastCard assignments={assignments || []} courseDuration={profile?.courseDuration || '3'} />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
