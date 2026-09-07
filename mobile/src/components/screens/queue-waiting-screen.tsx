import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc, onSnapshot, updateDoc, deleteField, Timestamp } from 'firebase/firestore';
import { functions } from '@/firebase/client';
import { useFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { useLanguagePreference } from '@/context/language-context';

type CalledBy = { teacherId: string; type: 'physical' | 'virtual'; calledAt?: Timestamp } | null;

/**
 * Live queue-waiting room: position updates in real time from the same
 * queues/globalQueues docs the teacher side reads, and a "you're being
 * called" state driven by the student doc's `calledBy` field — the same
 * signal the web app's student/homework-reading in_queue view watches.
 * Virtual calls are additionally handled by the app-wide
 * IncomingCallListener (accept UI + navigation into the call); this screen
 * just also surfaces the physical case, which has no separate call screen
 * to navigate to.
 */
export function QueueWaitingScreen() {
  const { position: initialPosition, ticketNumber, type, teacherId } = useLocalSearchParams<{
    position?: string;
    ticketNumber?: string;
    type?: string;
    teacherId?: string;
  }>();
  const { firestore } = useFirebase();
  const { user } = useAuth();
  const { tGlobal } = useLanguagePreference();
  const [isLeaving, setIsLeaving] = useState(false);
  const [livePosition, setLivePosition] = useState<number | null>(
    initialPosition ? Number(initialPosition) : null
  );
  const [calledBy, setCalledBy] = useState<CalledBy>(null);
  const [callingTeacherName, setCallingTeacherName] = useState<string | null>(null);
  const [callingTeacherRoom, setCallingTeacherRoom] = useState<string | null>(null);
  const [redirectedFrom, setRedirectedFrom] = useState<string | null>(null);
  const clearedStaleRef = useRef(false);

  const queueType = (type as 'physical' | 'virtual') || 'physical';

  // If the teacher closes their dedicated queue, the backend moves waiting
  // students into the shared global pool and leaves a courtesy note on their
  // doc — from then on this screen should track the global pool instead of
  // the now-stale dedicated queue doc.
  useEffect(() => {
    if (!firestore || !user) return;
    const unsub = onSnapshot(doc(firestore, 'students', user.uid), (snap) => {
      const notice = snap.data()?.redirectNotification;
      if (notice?.teacherName) setRedirectedFrom(notice.teacherName);
    });
    return unsub;
  }, [firestore, user]);

  const effectiveTeacherId = redirectedFrom ? null : teacherId;

  // Live position within the relevant queue (dedicated teacher queue, or the shared global pool).
  useEffect(() => {
    if (!firestore || !user) return;
    const queueDocRef = effectiveTeacherId
      ? doc(firestore, 'queues', effectiveTeacherId)
      : doc(firestore, 'globalQueues', queueType);

    const unsub = onSnapshot(queueDocRef, (snap) => {
      const data = snap.data();
      if (!data) return;
      // Global pool splits by gender key; merge both since we don't know the
      // student's gender here without another read — only one will contain them.
      const genderKeys = ['manStudentsById', 'womanStudentsById'];
      const pool = effectiveTeacherId
        ? data.studentsById || {}
        : genderKeys.reduce((acc, key) => ({ ...acc, ...(data[key] || {}) }), {} as Record<string, any>);
      const list = Object.entries(pool)
        .map(([id, s]: [string, any]) => ({ id, ...s }))
        .sort((a, b) => (a.joinedAt?.toMillis?.() || 0) - (b.joinedAt?.toMillis?.() || 0));
      const idx = list.findIndex((s) => s.id === user.uid);
      if (idx >= 0) setLivePosition(idx + 1);
    });
    return unsub;
  }, [firestore, user, effectiveTeacherId, queueType]);

  // Watch own student doc for calledBy (physical call banner + stale-call cleanup).
  useEffect(() => {
    if (!firestore || !user) return;
    const unsub = onSnapshot(doc(firestore, 'students', user.uid), async (snap) => {
      const data = snap.data();
      const cb = data?.calledBy as CalledBy;
      if (cb?.teacherId && cb.calledAt instanceof Timestamp) {
        const age = Date.now() - cb.calledAt.toMillis();
        if (age > 180000) {
          if (!clearedStaleRef.current) {
            clearedStaleRef.current = true;
            updateDoc(doc(firestore, 'students', user.uid), { calledBy: deleteField() }).catch(() => {});
          }
          return;
        }
        setCalledBy(cb);
        if (cb.type === 'physical') {
          const tDoc = await getDoc(doc(firestore, 'teachers', cb.teacherId));
          if (tDoc.exists()) {
            setCallingTeacherName(tDoc.data().displayName || null);
            setCallingTeacherRoom(tDoc.data().room || null);
          }
        }
      } else {
        setCalledBy(null);
      }
    });
    return unsub;
  }, [firestore, user]);

  const handleLeaveQueue = async () => {
    setIsLeaving(true);
    try {
      const fn = httpsCallable(functions, 'leaveQueue');
      await fn({ type: queueType });
      router.dismissAll();
    } catch (error) {
      console.error('Failed to leave queue:', error);
      Alert.alert(tGlobal('Fejl'), tGlobal('Kunne ikke forlade køen.'));
    } finally {
      setIsLeaving(false);
    }
  };

  const handleAcknowledgeCall = async () => {
    if (!firestore || !user) return;
    await updateDoc(doc(firestore, 'students', user.uid), { calledBy: deleteField() }).catch(() => {});
    router.dismissAll();
  };

  // Physically called — full-screen "go to room X" state, replaces the waiting UI.
  if (calledBy?.type === 'physical') {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-primary px-6">
        <View className="h-24 w-24 items-center justify-center rounded-[40px] bg-white/10">
          <Ionicons name="walk" size={44} color="#fff" />
        </View>
        <Text className="mt-8 text-center text-3xl font-bold text-white">{tGlobal('Det er din tur!')}</Text>
        {callingTeacherRoom ? (
          <Text className="mt-3 text-center text-xl font-bold text-accent">
            {tGlobal('Lokale')} {callingTeacherRoom}
          </Text>
        ) : null}
        {callingTeacherName ? (
          <Text className="mt-1 text-center text-sm font-bold uppercase tracking-widest text-white/60">
            {tGlobal('Lærer')} {callingTeacherName}
          </Text>
        ) : null}
        <Button className="mt-10 bg-white px-8" textClassName="text-primary" onPress={handleAcknowledgeCall}>
          {tGlobal('Færdig')}
        </Button>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-background px-6">
      <View className="h-24 w-24 items-center justify-center rounded-[40px] bg-primary/10">
        <Ionicons name="hourglass-outline" size={44} color="#197670" />
      </View>
      <Text className="mt-8 text-3xl font-bold text-foreground">{tGlobal('Du er tilmeldt køen')}</Text>
      {redirectedFrom ? (
        <View className="mt-4 flex-row items-center gap-2 rounded-2xl border border-accent/30 bg-accent/5 px-4 py-3">
          <Ionicons name="information-circle" size={16} color="#b8860b" />
          <Text className="flex-1 text-xs font-bold text-foreground">
            {redirectedFrom} {tGlobal('har lukket sin kø. Du er nu i fælleskøen.')}
          </Text>
        </View>
      ) : null}
      {ticketNumber ? (
        <Text className="mt-2 text-lg font-bold text-accent">
          {tGlobal('Billet #')}
          {ticketNumber}
        </Text>
      ) : null}
      {livePosition ? (
        <Text className="mt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          {tGlobal('Din plads i køen:')} {livePosition}
        </Text>
      ) : (
        <ActivityIndicator className="mt-2" size="small" />
      )}
      <Text className="mt-6 text-center text-sm text-muted-foreground">
        {tGlobal('Vi giver besked her i appen, når en lærer er klar til dig.')}
      </Text>
      <Button variant="outline" className="mt-10 px-8" loading={isLeaving} onPress={handleLeaveQueue}>
        {tGlobal('Forlad køen')}
      </Button>
      <Button variant="ghost" className="mt-2 px-8" onPress={() => router.dismissAll()}>
        {tGlobal('Tilbage til Hjem')}
      </Button>
    </SafeAreaView>
  );
}
