import React, { useMemo } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { collection, orderBy, query } from 'firebase/firestore';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { surahs } from '@/shared/surahs';
import { findPageForVerse } from '@/lib/quran-page-lookup';
import type { Assignment, AssignmentPart } from '@/shared/types';

function gradeVariant(grade: string | null | undefined): 'primary' | 'outline' {
  return grade ? 'primary' : 'outline';
}

function AssignmentSection({ title, part, grade }: { title: string; part: AssignmentPart; grade: string | null | undefined }) {
  const startSurah = surahs.find((s) => s.name === part.surahName || s.englishName === part.surahName);
  const startName = startSurah?.englishName || part.surahName || 'Ikke angivet';
  const hasEndSurah = part.endSurahName && part.endSurahName !== part.surahName;
  const endSurah = hasEndSurah ? surahs.find((s) => s.name === part.endSurahName || s.englishName === part.endSurahName) : null;
  const endName = endSurah?.englishName || part.endSurahName;

  const canRead = !!(part.surahName && part.fromAyah);

  const handleRead = () => {
    if (!canRead) return;
    const s = surahs.find((x) => x.name === part.surahName || x.englishName === part.surahName);
    if (!s) return;
    const page = findPageForVerse(s.number, part.fromAyah);
    if (page) router.push({ pathname: '/quran', params: { page: String(page) } } as any);
  };

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</Text>
        {grade && <Badge>{grade}</Badge>}
      </View>
      <View className="flex-row items-center justify-between rounded-xl border border-border bg-background p-3">
        <View>
          <Text className="font-semibold text-foreground">{hasEndSurah ? `${startName} - ${endName}` : startName}</Text>
          <Text className="text-xs text-muted-foreground">
            {hasEndSurah
              ? `${startName} ${part.fromAyah || 0} → ${endName} ${part.toAyah || 0}`
              : `Ayah ${part.fromAyah || 0} - ${part.toAyah || 0}`}
          </Text>
        </View>
        <Button variant="outline" disabled={!canRead} onPress={handleRead} className="px-4 py-2">
          Læs
        </Button>
      </View>
    </View>
  );
}

export function ViewHomeworkScreen() {
  const { firestore } = useFirebase();
  const { user } = useAuth();

  const assignmentsQuery = useMemoFirebase(
    () =>
      user
        ? query(collection(firestore, 'students', user.uid, 'assignments'), orderBy('assignedAt', 'desc'))
        : null,
    [firestore, user?.uid]
  );
  const { data: assignments, isLoading } = useCollection<Assignment>(assignmentsQuery);

  const { upcoming, previous } = useMemo(() => {
    if (!assignments) return { upcoming: null as Assignment | null, previous: [] as Assignment[] };
    const idx = assignments.findIndex((a) => !a.gradeHifz && !a.gradeMurajara);
    if (idx === -1) return { upcoming: null, previous: assignments };
    return { upcoming: assignments[idx], previous: assignments.filter((_, i) => i !== idx) };
  }, [assignments]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <FlatList
        className="flex-1 px-4"
        contentContainerClassName="gap-6 py-4"
        data={previous}
        keyExtractor={(a) => a.id}
        ListHeaderComponent={
          <View className="gap-6">
            <Text className="text-2xl font-bold text-foreground">Lektie Liste</Text>
            {upcoming ? (
              <Card>
                <View className="mb-2 flex-row items-center gap-2">
                  <View className="h-2 w-2 rounded-full bg-accent" />
                  <Text className="text-[10px] font-bold uppercase tracking-widest text-accent">Næste Lektie</Text>
                </View>
                <View className="gap-4">
                  <AssignmentSection title="Hifz" part={upcoming.hifz} grade={upcoming.gradeHifz} />
                  <AssignmentSection title="Murajara" part={upcoming.murajara} grade={upcoming.gradeMurajara} />
                </View>
              </Card>
            ) : (
              <Text className="text-center text-muted-foreground">Du har ingen kommende lektier.</Text>
            )}
            {previous.length > 0 && <Text className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Historik</Text>}
          </View>
        }
        renderItem={({ item }) => (
          <Card>
            <View className="gap-4">
              <AssignmentSection title="Hifz" part={item.hifz} grade={item.gradeHifz} />
              <AssignmentSection title="Murajara" part={item.murajara} grade={item.gradeMurajara} />
              {item.notes && <CardDescription>&quot;{item.notes}&quot;</CardDescription>}
            </View>
          </Card>
        )}
        ListEmptyComponent={
          !upcoming ? <Text className="text-center text-muted-foreground">Du har ingen tidligere lektier.</Text> : null
        }
      />
    </SafeAreaView>
  );
}
