import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useAuth } from '@/hooks/use-auth';

function availabilityText(count: number) {
  if (count === 0) return 'Ingen lærere';
  return count === 1 ? '1 lærer er klar' : `${count} lærere er klar`;
}

export function QueueSystemScreen() {
  const { firestore } = useFirebase();
  const { profile } = useUserProfile();
  const { user } = useAuth();
  const [physicalRaw, setPhysicalRaw] = useState<any[]>([]);
  const [virtualRaw, setVirtualRaw] = useState<any[]>([]);

  useEffect(() => {
    if (!firestore) return;
    const q1 = query(collection(firestore, 'teachers'), where('availablePhysical', '==', true), where('queueLocked', '==', false));
    const unsub1 = onSnapshot(q1, (snap) => setPhysicalRaw(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const q2 = query(collection(firestore, 'teachers'), where('availableVirtual', '==', true), where('queueLocked', '==', false));
    const unsub2 = onSnapshot(q2, (snap) => setVirtualRaw(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => {
      unsub1();
      unsub2();
    };
  }, [firestore]);

  const filterForStudent = (list: any[]) =>
    list.filter((t) => {
      if (t.gender !== profile?.gender) return false;
      if (t.allowedStudentIds && t.allowedStudentIds.length > 0) {
        return t.allowedStudentIds.includes(user?.uid || '');
      }
      return true;
    });

  const physicalTeachers = useMemo(() => filterForStudent(physicalRaw), [physicalRaw, profile?.gender, user?.uid]);
  const virtualTeachers = useMemo(() => filterForStudent(virtualRaw), [virtualRaw, profile?.gender, user?.uid]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="gap-12 px-6 pt-8">
        <View className="flex-row items-center gap-4">
          <Pressable
            onPress={() => router.back()}
            className="h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card shadow-sm"
          >
            <Ionicons name="chevron-back" size={24} color="#197670" />
          </Pressable>
          <View>
            <Text className="text-4xl font-bold tracking-tight text-foreground">Kø System</Text>
            <Text className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">
              Tilmeld dig dagens kø
            </Text>
          </View>
        </View>

        <View className="gap-6">
          <Pressable
            onPress={() => router.push({ pathname: '/queue-teacher-list', params: { type: 'physical' } } as any)}
            className="overflow-hidden rounded-[32px] border border-border bg-card p-6 shadow-sm"
          >
            <View className="flex-row items-center gap-6">
              <View className="h-20 w-20 items-center justify-center rounded-[28px] bg-primary shadow-lg">
                <Ionicons name="book" size={36} color="#DEA93E" />
              </View>
              <View>
                <Text className="text-2xl font-bold text-primary">Læs Fysisk</Text>
                <Text className="mt-1 text-[10px] font-black uppercase tracking-widest text-accent">
                  {availabilityText(physicalTeachers.length)}
                </Text>
              </View>
            </View>
          </Pressable>

          <Pressable
            onPress={() => router.push({ pathname: '/queue-teacher-list', params: { type: 'virtual' } } as any)}
            className="overflow-hidden rounded-[32px] border border-border bg-card p-6 shadow-sm"
          >
            <View className="flex-row items-center gap-6">
              <View className="h-20 w-20 items-center justify-center rounded-[28px] bg-primary shadow-lg">
                <Ionicons name="call" size={34} color="#DEA93E" />
              </View>
              <View>
                <Text className="text-2xl font-bold text-primary">Læs Virtuelt</Text>
                <Text className="mt-1 text-[10px] font-black uppercase tracking-widest text-accent">
                  {availabilityText(virtualTeachers.length)}
                </Text>
              </View>
            </View>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}
