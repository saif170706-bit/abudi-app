import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, FlatList, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { httpsCallable } from 'firebase/functions';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import * as Location from 'expo-location';
import { useFirebase } from '@/firebase';
import { functions } from '@/firebase/client';
import { useAuth } from '@/hooks/use-auth';
import { useUserProfile } from '@/hooks/use-user-profile';

function initials(name?: string) {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

/** Resolves the student's current location for a physical queue join. Returns null (and alerts) if unavailable. */
async function resolveLocation(): Promise<{ lat: number; lon: number } | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Lokation påkrævet', 'Appen skal bruge din lokation for at bekræfte fysisk fremmøde.');
    return null;
  }
  try {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return { lat: pos.coords.latitude, lon: pos.coords.longitude };
  } catch {
    Alert.alert('Lokation påkrævet', 'Kunne ikke hente din lokation. Prøv igen.');
    return null;
  }
}

export function QueueTeacherListScreen() {
  const { type } = useLocalSearchParams<{ type: 'physical' | 'virtual' }>();
  const isVirtual = type === 'virtual';
  const { firestore } = useFirebase();
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const [teachersRaw, setTeachersRaw] = useState<any[]>([]);
  const [joining, setJoining] = useState<string | null>(null);

  useEffect(() => {
    if (!firestore) return;
    const field = isVirtual ? 'availableVirtual' : 'availablePhysical';
    const q = query(collection(firestore, 'teachers'), where(field, '==', true), where('queueLocked', '==', false));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as any)
        .filter((t) => {
          if (t.gender !== profile?.gender) return false;
          if (t.allowedStudentIds && t.allowedStudentIds.length > 0) {
            return t.allowedStudentIds.includes(user?.uid || '');
          }
          return true;
        });
      setTeachersRaw(list);
    });
    return unsub;
  }, [firestore, isVirtual, profile?.gender, user?.uid]);

  const join = async (teacherId: string | null) => {
    if (!user || !profile || joining) return;

    let lat: number | undefined;
    let lon: number | undefined;
    if (!isVirtual) {
      const loc = await resolveLocation();
      if (!loc) return;
      lat = loc.lat;
      lon = loc.lon;
    }

    setJoining(teacherId ?? 'fastest');
    try {
      const fn = httpsCallable(functions, teacherId ? 'joinQueue' : 'joinGlobalQueue');
      const payload: any = {
        type: isVirtual ? 'virtual' : 'physical',
        lat,
        lon,
        displayName: profile.displayName,
        photoURL: profile.photoURL || null,
        fcmToken: null,
        phoneNumber: profile.phoneNumber || null,
      };
      if (teacherId) payload.teacherId = teacherId;

      const result: any = await fn(payload);
      if (result.data?.success) {
        router.replace({
          pathname: '/queue-waiting',
          params: { position: String(result.data.position ?? 1), ticketNumber: String(result.data.ticketNumber ?? '') },
        } as any);
      }
    } catch (err: any) {
      const code = err?.code;
      if (code === 'functions/permission-denied') {
        Alert.alert('For langt væk', 'Du skal være til stede på instituttet for at tilmelde dig fysisk kø.');
      } else if (code === 'functions/already-exists') {
        Alert.alert('Allerede i kø', 'Du er allerede tilmeldt en kø.');
      } else {
        Alert.alert('Fejl', 'Kunne ikke tilmelde dig køen.');
      }
    } finally {
      setJoining(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <FlatList
        data={teachersRaw}
        keyExtractor={(t) => t.id}
        contentContainerClassName="gap-4 px-6 pb-10 pt-8"
        ListHeaderComponent={
          <View className="mb-6 gap-8">
            <View className="flex-row items-center gap-4">
              <Pressable
                onPress={() => router.back()}
                className="h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card shadow-sm"
              >
                <Ionicons name="chevron-back" size={24} color="#197670" />
              </Pressable>
              <Text className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
                Vælg Lærer
              </Text>
            </View>

            <Pressable
              onPress={() => join(null)}
              className="flex-row items-center gap-6 rounded-[28px] bg-primary p-6 shadow-xl"
            >
              <View className="h-14 w-14 items-center justify-center rounded-2xl bg-accent">
                <Ionicons name="sparkles" size={26} color="#0f2e20" />
              </View>
              <View className="flex-1">
                <Text className="text-xl font-bold text-white">Hurtig Tilmelding</Text>
                <Text className="text-[10px] font-black uppercase tracking-widest text-white/60">Find hurtigste</Text>
              </View>
              {joining === 'fastest' ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              )}
            </Pressable>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => join(item.id)}
            className="flex-row items-center gap-5 rounded-[28px] border border-border bg-card px-6 py-5 shadow-sm"
          >
            <View className="h-16 w-16 items-center justify-center rounded-full border-4 border-border bg-primary/10">
              <Text className="text-xl font-bold text-primary">{initials(item.displayName)}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-lg font-bold text-primary">{item.displayName}</Text>
              <Text className="mt-1 text-[10px] font-black uppercase tracking-widest text-accent">
                {isVirtual ? 'Virtuelt' : `Lokale ${item.room ?? ''}`}
              </Text>
            </View>
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-foreground">
              {joining === item.id ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              )}
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text className="mt-10 text-center text-muted-foreground">Ingen lærere tilgængelige lige nu.</Text>
        }
      />
    </SafeAreaView>
  );
}
