import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, FlatList, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useFirebase } from '@/firebase';
import { functions } from '@/firebase/client';
import { useAuth } from '@/hooks/use-auth';

type QueuedStudent = { id: string; name: string; joinedAt?: any };

export function TeacherQueueScreen() {
  const { firestore } = useFirebase();
  const { user } = useAuth();
  const [students, setStudents] = useState<QueuedStudent[]>([]);
  const [currentlyCalling, setCurrentlyCalling] = useState<any>(null);
  const [calling, setCalling] = useState<'physical' | 'virtual' | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsubQueue = onSnapshot(doc(firestore, 'queues', user.uid), (snap) => {
      const data = snap.data();
      const list = Object.values(data?.studentsById || {}) as QueuedStudent[];
      list.sort((a, b) => (a.joinedAt?.toMillis?.() || 0) - (b.joinedAt?.toMillis?.() || 0));
      setStudents(list);
    });
    const unsubTeacher = onSnapshot(doc(firestore, 'teachers', user.uid), (snap) => {
      setCurrentlyCalling(snap.data()?.currentlyCalling ?? null);
    });
    return () => {
      unsubQueue();
      unsubTeacher();
    };
  }, [firestore, user]);

  const handleCallNext = async (callType: 'physical' | 'virtual') => {
    setCalling(callType);
    try {
      const fn = httpsCallable(functions, 'callQueueStudent');
      await fn({ callType });
    } catch (error: any) {
      if (error?.code === 'functions/not-found') {
        Alert.alert('Køen er tom', 'Der er ingen elever i køen lige nu.');
      } else {
        console.error('Failed to call next student:', error);
        Alert.alert('Fejl', 'Kunne ikke kalde næste elev.');
      }
    } finally {
      setCalling(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center gap-4 px-6 pt-4">
        <Pressable
          onPress={() => router.back()}
          className="h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card shadow-sm"
        >
          <Ionicons name="chevron-back" size={22} color="#197670" />
        </Pressable>
        <View>
          <Text className="text-2xl font-bold text-primary">Lektiehjælp Kø</Text>
          <Text className="text-[10px] font-black uppercase tracking-widest text-accent">Administrer din elev kø</Text>
        </View>
      </View>

      {currentlyCalling && (
        <View className="mx-6 mt-6 flex-row items-center gap-3 rounded-2xl border border-accent/30 bg-accent/5 p-4">
          <Ionicons name="megaphone" size={18} color="#b8860b" />
          <Text className="flex-1 text-sm font-bold text-foreground">Kalder: {currentlyCalling.studentName}</Text>
        </View>
      )}

      <View className="flex-row gap-3 px-6 pt-6">
        <Pressable
          onPress={() => handleCallNext('physical')}
          disabled={!!calling}
          className="flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-4"
        >
          {calling === 'physical' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="book" size={18} color="#fff" />
              <Text className="text-xs font-black uppercase tracking-widest text-primary-foreground">Kald Næste Fysisk</Text>
            </>
          )}
        </Pressable>
        <Pressable
          onPress={() => handleCallNext('virtual')}
          disabled={!!calling}
          className="flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-4"
        >
          {calling === 'virtual' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="call" size={18} color="#fff" />
              <Text className="text-xs font-black uppercase tracking-widest text-primary-foreground">Kald Næste Virtuel</Text>
            </>
          )}
        </Pressable>
      </View>

      <FlatList
        data={students}
        keyExtractor={(s) => s.id}
        contentContainerClassName="gap-2 px-6 pt-6 pb-10"
        ListHeaderComponent={
          <Text className="mb-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Din direkte kø ({students.length})
          </Text>
        }
        renderItem={({ item, index }) => (
          <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
            <Text className="w-6 text-center text-xs font-black text-primary/30">{index + 1}</Text>
            <Text className="flex-1 font-semibold text-card-foreground">{item.name}</Text>
          </View>
        )}
        ListEmptyComponent={<Text className="mt-10 text-center text-muted-foreground">Ingen elever i din direkte kø.</Text>}
      />
    </SafeAreaView>
  );
}
