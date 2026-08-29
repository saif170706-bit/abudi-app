import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { collection, doc, getDocs, onSnapshot, query, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useLanguagePreference } from '@/context/language-context';

type Gender = 'man' | 'woman';

type Announcement = {
  id: string;
  ticketNumber: string;
  letter: string;
  teacherName: string;
  room: string;
  studentNumber?: string;
};

export function TerminalTvScreen() {
  const { firestore } = useFirebase();
  const { tGlobal } = useLanguagePreference();
  const [gender, setGender] = useState<Gender | null>(null);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const seenIds = useRef<Set<string>>(new Set());
  const isFirstSnapshot = useRef(true);

  useEffect(() => {
    if (!gender) return;
    const q = query(collection(firestore, 'teachers'), where('availablePhysical', '==', true), where('gender', '==', gender));
    const unsub = onSnapshot(q, (snap) => {
      const current: any[] = [];
      snap.forEach((d) => {
        const data = { id: d.id, ...d.data() } as any;
        current.push(data);
        const calling = data.currentlyCalling;
        if (calling?.announcementId) {
          if (isFirstSnapshot.current) {
            seenIds.current.add(calling.announcementId);
          } else if (!seenIds.current.has(calling.announcementId)) {
            seenIds.current.add(calling.announcementId);
            setAnnouncement({
              id: calling.announcementId,
              ticketNumber: calling.ticketNumber?.toString() || '1',
              letter: data.queueLetter || 'A',
              teacherName: data.displayName || tGlobal('Lærer'),
              room: data.room || tGlobal('Ukendt'),
              studentNumber: calling.studentNumber,
            });
            setTimeout(() => setAnnouncement(null), 5000);
          }
        }
      });
      isFirstSnapshot.current = false;
      current.sort((a, b) => (a.currentlyCalling ? -1 : b.currentlyCalling ? 1 : (a.displayName || '').localeCompare(b.displayName || '')));
      setTeachers(current);
    });
    return unsub;
  }, [firestore, gender]);

  const handleReset = () => {
    Alert.alert(
      tGlobal('Nulstil alle kø-numre'),
      tGlobal('Er du sikker på at du vil nulstille alle fysiske kø-numre og afslutte alle fysiske sessioner? Virtuelle køer bevares.'),
      [
        { text: tGlobal('Annuller'), style: 'cancel' },
        {
          text: tGlobal('Nulstil'),
          style: 'destructive',
          onPress: async () => {
            setIsResetting(true);
            try {
              const qSnap = await getDocs(collection(firestore, 'queues'));
              const batch = writeBatch(firestore);
              qSnap.forEach((qDoc) => {
                const data = qDoc.data() as any;
                const studentsById = data.studentsById || {};
                const updated: Record<string, any> = {};
                Object.entries(studentsById).forEach(([id, s]: [string, any]) => {
                  if (s.type === 'virtual') updated[id] = s;
                });
                batch.update(qDoc.ref, { lastTicketNumber: 0, studentsById: updated });
              });
              batch.update(doc(firestore, 'globalQueues', 'physical'), {
                manStudentsById: {},
                womanStudentsById: {},
                lastTicketNumber: 0,
                lastResetAt: serverTimestamp(),
              });
              const tSnap = await getDocs(collection(firestore, 'teachers'));
              tSnap.forEach((tDoc) => {
                const data = tDoc.data() as any;
                const updates: any = { availablePhysical: false, queueLetter: '' };
                if (data.activeSessionType === 'physical' || !data.availableVirtual) {
                  updates.currentlyCalling = null;
                  updates.lastCalledTicket = null;
                }
                batch.update(tDoc.ref, updates);
              });
              await batch.commit();
              Alert.alert(tGlobal('Færdig'), tGlobal('Alle fysiske køer er nulstillet.'));
            } catch (error) {
              console.error(error);
              Alert.alert(tGlobal('Fejl'), tGlobal('Der opstod en fejl under nulstilling.'));
            } finally {
              setIsResetting(false);
            }
          },
        },
      ]
    );
  };

  if (!gender) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-primary p-8">
        <View className="mb-12 items-center">
          <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-white">
            <Text className="text-3xl">🕌</Text>
          </View>
          <Text className="mb-2 text-3xl font-bold text-white">{tGlobal('Kø Oversigt')}</Text>
          <Text className="text-xs font-bold uppercase tracking-widest text-accent">{tGlobal('Vælg afdeling for denne skærm')}</Text>
        </View>

        <View className="w-full max-w-sm gap-4">
          <Pressable onPress={() => setGender('man')} className="items-center rounded-[28px] bg-white p-8">
            <Ionicons name="people-outline" size={32} color="#197670" />
            <Text className="mt-4 text-xl font-bold text-primary">{tGlobal('Mandlig Afdeling')}</Text>
          </Pressable>
          <Pressable onPress={() => setGender('woman')} className="items-center rounded-[28px] bg-white p-8">
            <Ionicons name="people-outline" size={32} color="#DEA93E" />
            <Text className="mt-4 text-xl font-bold text-primary">{tGlobal('Kvindelig Afdeling')}</Text>
          </Pressable>
        </View>

        <Pressable onPress={handleReset} disabled={isResetting} className="mt-10 rounded-2xl border border-white/20 px-6 py-3">
          <Text className="font-bold text-white">{isResetting ? tGlobal('Nulstiller…') : tGlobal('Nulstil Alle Kø-Numre')}</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} className="mt-6">
          <Text className="text-white/50">{tGlobal('Tilbage til Admin')}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-primary p-4">
      <View className="mb-6 self-start rounded-full bg-white/5 px-6 py-3">
        <Text className="text-lg font-bold uppercase tracking-widest text-white">
          {gender === 'man' ? tGlobal('Mandlig Afdeling') : tGlobal('Kvindelig Afdeling')}
        </Text>
      </View>

      <View className="flex-1 flex-row flex-wrap gap-4">
        {teachers.map((t) => {
          const calling = t.currentlyCalling || t.lastCalledTicket;
          return (
            <View key={t.id} className="min-w-[45%] flex-1 rounded-[28px] bg-[#FDF8F3] p-6">
              <View className="mb-4 items-center gap-2">
                <View className="h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Text className="text-lg font-bold text-primary">{t.displayName?.[0] ?? '?'}</Text>
                </View>
                <Text className="text-center text-lg font-bold text-primary">{t.displayName}</Text>
                <View className="rounded-full bg-primary px-3 py-1">
                  <Text className="text-[10px] font-bold uppercase tracking-widest text-primary-foreground">
                    {tGlobal('Lokale')} {t.room}
                  </Text>
                </View>
              </View>
              <View className="rounded-2xl bg-white/60 p-4">
                <Text className="mb-2 text-center text-[10px] font-bold uppercase tracking-widest text-primary/40">
                  {tGlobal('Nu Betjenes')}
                </Text>
                <Text className="text-center text-3xl font-bold text-primary">
                  {calling ? `${t.queueLetter || 'A'}${calling.ticketNumber}` : '--'}
                </Text>
                {calling?.studentNumber && (
                  <Text className="text-center text-sm font-bold text-accent">#{calling.studentNumber}</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {announcement && (
        <View className="absolute inset-0 items-center justify-center bg-primary/90 p-8">
          <View className="w-full max-w-md items-center gap-4 rounded-[40px] bg-[#FDF8F3] p-10">
            <Text className="text-xs font-black uppercase tracking-[0.4em] text-accent">{tGlobal('Nummer Kaldt')}</Text>
            <Text className="text-7xl font-bold text-primary">
              {announcement.letter}
              {announcement.ticketNumber}
            </Text>
            <Text className="text-xl text-accent">#{announcement.studentNumber || '----'}</Text>
            <Text className="text-center text-2xl font-bold text-primary">
              {tGlobal('Gå venligst til')} <Text className="text-accent">{tGlobal('Lokale')} {announcement.room}</Text>
            </Text>
            <Text className="text-sm font-bold uppercase tracking-widest text-primary/40">
              {tGlobal('Lærer')} {announcement.teacherName}
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
