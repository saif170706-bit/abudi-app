import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, Modal, Alert, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, getDocs, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useAbsenceReport } from '@/hooks/use-absence-report';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardDescription } from '@/components/ui/card';
import type { CombinedUser } from '@/hooks/use-members-data';

const PERIODS = [
  { value: 0, label: 'Denne uge' },
  { value: 1, label: 'Sidste uge' },
] as const;

function getWeekBoundaries(offsetWeeks: number) {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const start = new Date(now);
  start.setDate(diff - offsetWeeks * 7);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start, end };
}

function formatDateRange(offsetWeeks: number) {
  const { start, end } = getWeekBoundaries(offsetWeeks);
  const fmt = (d: Date) => d.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' }).toUpperCase();
  return `${fmt(start)} TIL ${fmt(end)}`;
}

function initials(name?: string) {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

function StudentAvatar({ student }: { student: CombinedUser }) {
  if (student.photoURL) {
    return <Image source={{ uri: student.photoURL }} className="h-11 w-11 rounded-full" />;
  }
  return (
    <View className="h-11 w-11 items-center justify-center rounded-full bg-muted">
      <Text className="text-xs font-bold text-muted-foreground">{initials(student.displayName)}</Text>
    </View>
  );
}

export function AdminAbsenceScreen() {
  const { reportData, students, isLoading } = useAbsenceReport();
  const [tab, setTab] = useState<'report' | 'history'>('report');
  const [period, setPeriod] = useState<0 | 1>(0);
  const [noteStudent, setNoteStudent] = useState<CombinedUser | null>(null);

  const rows = useMemo(() => {
    const periodData = reportData?.[period];
    if (!periodData) return [];
    return students
      .map((s) => ({ student: s, status: periodData[s.uid] }))
      .sort((a, b) => Number(a.status?.attended ?? false) - Number(b.status?.attended ?? false));
  }, [reportData, period, students]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="gap-3 p-4">
        <Text className="text-sm text-muted-foreground">Admin</Text>
        <Text className="text-2xl font-bold text-foreground">Fravær</Text>

        <View className="flex-row rounded-2xl bg-muted p-1">
          <Pressable
            onPress={() => setTab('report')}
            className={`flex-1 items-center rounded-xl py-2 ${tab === 'report' ? 'bg-card shadow-sm' : ''}`}
          >
            <Text className={tab === 'report' ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
              Ugentlig Rapport
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('history')}
            className={`flex-1 items-center rounded-xl py-2 ${tab === 'history' ? 'bg-card shadow-sm' : ''}`}
          >
            <Text className={tab === 'history' ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
              Historik &amp; Søgning
            </Text>
          </Pressable>
        </View>

        {tab === 'report' && (
          <>
            <View className="flex-row rounded-2xl bg-muted p-1">
              {PERIODS.map((p) => (
                <Pressable
                  key={p.value}
                  onPress={() => setPeriod(p.value)}
                  className={`flex-1 items-center rounded-xl py-2 ${period === p.value ? 'bg-foreground' : ''}`}
                >
                  <Text className={period === p.value ? 'font-semibold text-background' : 'text-muted-foreground'}>
                    {p.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {formatDateRange(period)}
            </Text>
          </>
        )}
      </View>

      {tab === 'history' ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-muted-foreground">Historik & søgning kommer snart.</Text>
        </View>
      ) : isLoading ? (
        <ActivityIndicator className="mt-8" />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.student.uid}
          contentContainerClassName="gap-2 px-4 pb-4"
          renderItem={({ item }) => (
            <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3">
              <StudentAvatar student={item.student} />
              <View className="flex-1">
                <Text className="font-semibold text-card-foreground">{item.student.displayName || item.student.email}</Text>
                <Text className={item.status?.attended ? 'text-xs font-bold text-primary' : 'text-xs font-bold text-destructive'}>
                  {item.status?.attended ? 'MØDT' : 'IKKE MØDT'}
                </Text>
              </View>
              <Pressable
                onPress={() => item.student.phoneNumber && Linking.openURL(`tel:${item.student.phoneNumber}`)}
                className="h-10 w-10 items-center justify-center rounded-full bg-primary/10"
              >
                <Ionicons name="call-outline" size={18} color="#197670" />
              </Pressable>
              <Pressable
                onPress={() => setNoteStudent(item.student)}
                className="h-10 w-10 items-center justify-center rounded-full bg-muted"
              >
                <Ionicons name="document-text-outline" size={18} color="#374151" />
              </Pressable>
            </View>
          )}
          ListEmptyComponent={<Text className="mt-8 text-center text-muted-foreground">Ingen elever fundet.</Text>}
        />
      )}

      <Modal visible={noteStudent !== null} animationType="slide" onRequestClose={() => setNoteStudent(null)}>
        {noteStudent && <AbsenceNoteModal student={noteStudent} onClose={() => setNoteStudent(null)} />}
      </Modal>
    </SafeAreaView>
  );
}

function AbsenceNoteModal({ student, onClose }: { student: CombinedUser; onClose: () => void }) {
  const { firestore } = useFirebase();
  const { user } = useAuth();
  const [notes, setNotes] = useState<{ id: string; text: string; createdAt?: any }[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const notesRef = collection(firestore, 'students', student.uid, 'absenceNotes');
    getDocs(query(notesRef, orderBy('createdAt', 'desc')))
      .then((snap) => {
        if (cancelled) return;
        setNotes(
          snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as any) }))
            .filter((n: any) => n.type !== 'student_report')
        );
      })
      .finally(() => !cancelled && setIsLoadingNotes(false));
    return () => {
      cancelled = true;
    };
  }, [firestore, student.uid]);

  const handleSave = async () => {
    if (!noteText.trim() || !user) return;
    setIsSaving(true);
    try {
      await addDoc(collection(firestore, 'students', student.uid, 'absenceNotes'), {
        text: noteText.trim(),
        createdAt: serverTimestamp(),
        authorName: user.displayName || 'Admin',
      });
      setNoteText('');
      onClose();
    } catch (error) {
      console.error('Failed to save absence note:', error);
      Alert.alert('Fejl', 'Kunne ikke gemme noten.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
        <Text className="text-lg font-semibold text-foreground">{student.displayName || student.email}</Text>
        <Pressable onPress={onClose} className="px-2 py-1">
          <Text className="text-muted-foreground">Luk</Text>
        </Pressable>
      </View>
      <View className="gap-4 p-4">
        {isLoadingNotes ? (
          <ActivityIndicator />
        ) : (
          notes.map((n) => (
            <Card key={n.id}>
              <CardDescription>{n.text}</CardDescription>
            </Card>
          ))
        )}
        <View className="gap-2">
          <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Ny note</Text>
          <Input multiline numberOfLines={4} value={noteText} onChangeText={setNoteText} className="min-h-[100px]" />
        </View>
        <Button loading={isSaving} onPress={handleSave}>
          Gem Note
        </Button>
      </View>
    </SafeAreaView>
  );
}
