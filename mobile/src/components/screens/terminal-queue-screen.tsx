import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { collection, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useFirebase } from '@/firebase';
import { functions } from '@/firebase/client';
import { Button } from '@/components/ui/button';
import { useLanguagePreference } from '@/context/language-context';

type QueueView = 'rest' | 'input' | 'teachers' | 'success';

const NUMPAD = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'DEL'];

export function TerminalQueueScreen() {
  const { firestore } = useFirebase();
  const { tGlobal } = useLanguagePreference();
  const [view, setView] = useState<QueueView>('rest');
  const [studentNumber, setStudentNumber] = useState('');
  const [student, setStudent] = useState<any>(null);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successInfo, setSuccessInfo] = useState<{ ticketNumber: number; studentNumber: string; teacherName: string | null } | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (view !== 'rest') {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setView('rest');
        setStudentNumber('');
        setStudent(null);
        setErrorMsg('');
      }, 60000);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [view, studentNumber]);

  useEffect(() => {
    const q = query(
      collection(firestore, 'teachers'),
      where('availablePhysical', '==', true),
      where('queueLocked', '==', false)
    );
    const unsub = onSnapshot(q, (snap) => setTeachers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return unsub;
  }, [firestore]);

  const handleLookupStudent = async () => {
    if (!studentNumber) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const q = query(collection(firestore, 'students'), where('studentNumber', '==', studentNumber));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        setErrorMsg(tGlobal('Elevnummer ikke fundet. Prøv igen.'));
      } else {
        const docSnap = snapshot.docs[0];
        setStudent({ id: docSnap.id, ...docSnap.data() });
        setView('teachers');
      }
    } catch {
      setErrorMsg(tGlobal('Der opstod en fejl.'));
    } finally {
      setLoading(false);
    }
  };

  const handleJoinQueue = async (teacher: any | null) => {
    if (!student) return;
    setLoading(true);
    try {
      const joinQueueFn = httpsCallable(functions, 'joinQueue');
      const res = await joinQueueFn({
        teacherId: teacher?.id || null,
        type: 'physical',
        displayName: student.displayName,
        phoneNumber: student.phoneNumber,
        studentNumber: student.studentNumber,
        lat: 55.72,
        lon: 12.44,
      });
      const data = res.data as any;
      setSuccessInfo({
        ticketNumber: data.ticketNumber,
        studentNumber: student.studentNumber,
        teacherName: teacher?.displayName || null,
      });
      setView('success');
      setTimeout(() => {
        setView('rest');
        setStudentNumber('');
        setStudent(null);
      }, 7000);
    } catch (e: any) {
      console.error('Queue join error:', e);
      setErrorMsg(e.message || tGlobal('Kunne ikke tilføje til køen.'));
    } finally {
      setLoading(false);
    }
  };

  const handleNumpad = (btn: string) => {
    if (btn === 'C') setStudentNumber('');
    else if (btn === 'DEL') setStudentNumber((s) => s.slice(0, -1));
    else if (studentNumber.length < 10) setStudentNumber((s) => s + btn);
  };

  const reset = () => {
    setView('rest');
    setStudentNumber('');
    setStudent(null);
    setErrorMsg('');
  };

  if (view === 'rest') {
    return (
      <Pressable onPress={() => setView('input')} className="flex-1 items-center justify-center bg-[#F0F5F3] p-6">
        <View className="mb-10 h-32 w-32 items-center justify-center rounded-full bg-white shadow-2xl">
          <Text className="text-4xl">🕌</Text>
        </View>
        <Text className="mb-8 text-center text-5xl font-bold text-primary">{tGlobal('Træk Nummer')}</Text>
        <View className="rounded-full bg-primary px-8 py-4">
          <Text className="text-base font-bold uppercase tracking-widest text-primary-foreground">
            {tGlobal('Tryk skærmen for at starte')}
          </Text>
        </View>
        <Pressable onPress={() => router.back()} className="absolute bottom-10">
          <Text className="text-primary/50">{tGlobal('Tilbage til Admin')}</Text>
        </Pressable>
      </Pressable>
    );
  }

  if (view === 'input') {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#F0F5F3] p-6">
        <Text className="mb-1 text-center text-3xl font-bold text-primary">{tGlobal('Dit Elevnummer')}</Text>
        <Text className="mb-8 text-center text-muted-foreground">{tGlobal('Indtast dit elevnummer for at fortsætte')}</Text>

        <View className="w-full max-w-sm rounded-[32px] bg-white p-6 shadow-2xl">
          <View className="mb-6 h-20 items-center justify-center rounded-2xl bg-[#F0F5F3]">
            <Text className="text-4xl tracking-widest text-primary">{studentNumber || '____'}</Text>
          </View>

          {!!errorMsg && <Text className="mb-4 text-center font-bold text-destructive">{errorMsg}</Text>}

          <View className="mb-6 flex-row flex-wrap gap-3">
            {NUMPAD.map((btn) => (
              <Pressable
                key={btn}
                onPress={() => handleNumpad(btn)}
                className="h-16 flex-[1_0_28%] items-center justify-center rounded-2xl bg-gray-50"
              >
                <Text className="text-2xl text-primary">{btn}</Text>
              </Pressable>
            ))}
          </View>

          <View className="flex-row gap-3">
            <Button variant="secondary" className="flex-1" onPress={reset}>
              {tGlobal('Annuller')}
            </Button>
            <Button className="flex-1" loading={loading} disabled={!studentNumber} onPress={handleLookupStudent}>
              {tGlobal('Næste')}
            </Button>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (view === 'teachers') {
    const matching = teachers.filter((t) => t.gender === student?.gender);
    return (
      <SafeAreaView className="flex-1 bg-[#F0F5F3] p-4">
        <View className="mb-6 flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-primary">{tGlobal('Kø System')}</Text>
            <Text className="text-xs font-bold uppercase tracking-widest text-accent">
              {tGlobal('Elev: ')}{student?.displayName || tGlobal('Ukendt')}
            </Text>
          </View>
          <Button variant="outline" onPress={reset}>
            {tGlobal('Afbryd')}
          </Button>
        </View>

        <Pressable onPress={() => handleJoinQueue(null)} className="mb-4 rounded-[28px] bg-primary p-6">
          <Text className="text-xl font-bold text-primary-foreground">{tGlobal('quickRegistration')}</Text>
          <Text className="mt-1 text-xs font-bold uppercase tracking-widest text-primary-foreground/60">
            {tGlobal('Find den første ledige lærer')}
          </Text>
        </Pressable>

        {matching.length === 0 ? (
          <Text className="mt-10 text-center text-muted-foreground">{tGlobal('Ingen lærere er fysisk tilgængelige lige nu.')}</Text>
        ) : (
          matching.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => handleJoinQueue(t)}
              className="mb-3 flex-row items-center gap-4 rounded-[28px] bg-white p-5 shadow-md"
            >
              <View className="h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Text className="text-lg font-bold text-primary">{t.displayName?.[0] ?? '?'}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-primary">{t.displayName}</Text>
                <Text className="text-xs font-bold uppercase tracking-widest text-accent">{tGlobal('Lokale')} {t.room}</Text>
              </View>
            </Pressable>
          ))
        )}
        {loading && (
          <View className="absolute inset-0 items-center justify-center bg-white/50">
            <ActivityIndicator size="large" />
          </View>
        )}
      </SafeAreaView>
    );
  }

  // success
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-primary p-6">
      <View className="items-center gap-6">
        <Text className="text-xs font-black uppercase tracking-[0.4em] text-accent">{tGlobal('Du Er Tilmeldt Køen')}</Text>
        <Text className="text-8xl font-light text-white">
          A{successInfo?.ticketNumber} <Text className="opacity-40">(#{successInfo?.studentNumber})</Text>
        </Text>
        {successInfo?.teacherName && (
          <Text className="text-2xl font-bold text-white">{tGlobal('Lærer')} {successInfo.teacherName}</Text>
        )}
        <Text className="max-w-xs text-center text-white/70">
          {tGlobal('Sæt dig og vent på, at dit nummer eller navn bliver kaldt på skærmen.')}
        </Text>
        <Button className="mt-6 bg-white" onPress={() => setView('rest')}>
          {tGlobal('Færdig')}
        </Button>
      </View>
    </SafeAreaView>
  );
}
