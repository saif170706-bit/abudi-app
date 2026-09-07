import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, Modal, Alert, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { addDoc, collection, getDocs, orderBy, query, Timestamp, where, serverTimestamp } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useAbsenceReport } from '@/hooks/use-absence-report';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardDescription } from '@/components/ui/card';
import { useLanguagePreference, LOCALE_MAP } from '@/context/language-context';
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

function formatDateRange(offsetWeeks: number, locale: string, tGlobal: (s: string) => string) {
  const { start, end } = getWeekBoundaries(offsetWeeks);
  const fmt = (d: Date) => d.toLocaleDateString(locale, { day: 'numeric', month: 'short' }).toUpperCase();
  return `${fmt(start)} ${tGlobal('til').toUpperCase()} ${fmt(end)}`;
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
  const { tGlobal, language } = useLanguagePreference();
  const locale = LOCALE_MAP[language];
  const [tab, setTab] = useState<'report' | 'history'>('report');
  const [period, setPeriod] = useState<0 | 1>(0);
  const [noteStudent, setNoteStudent] = useState<CombinedUser | null>(null);
  const [historySearch, setHistorySearch] = useState('');
  const [historyStudent, setHistoryStudent] = useState<CombinedUser | null>(null);

  const filteredHistoryStudents = useMemo(() => {
    const term = historySearch.trim().toLowerCase();
    if (!term) return [];
    return students.filter((s) => (s.displayName || s.email || '').toLowerCase().includes(term));
  }, [historySearch, students]);

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
        <Text className="text-sm text-muted-foreground">{tGlobal('Admin')}</Text>
        <Text className="text-2xl font-bold text-foreground">{tGlobal('Fravær')}</Text>

        <View className="flex-row rounded-2xl bg-muted p-1">
          <Pressable
            onPress={() => setTab('report')}
            className={`flex-1 items-center rounded-xl py-2 ${tab === 'report' ? 'bg-card shadow-sm' : ''}`}
          >
            <Text className={tab === 'report' ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
              {tGlobal('Ugentlig Rapport')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('history')}
            className={`flex-1 items-center rounded-xl py-2 ${tab === 'history' ? 'bg-card shadow-sm' : ''}`}
          >
            <Text className={tab === 'history' ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
              {tGlobal('Historik & Søgning')}
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
                    {tGlobal(p.label)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {formatDateRange(period, locale, tGlobal)}
            </Text>
          </>
        )}
      </View>

      {tab === 'history' ? (
        <View className="flex-1">
          <View className="px-4 pb-2">
            <Input
              placeholder={tGlobal('Søg efter elev...')}
              value={historySearch}
              onChangeText={setHistorySearch}
              autoCapitalize="none"
            />
          </View>
          <FlatList
            data={filteredHistoryStudents}
            keyExtractor={(s) => s.uid}
            contentContainerClassName="gap-2 px-4 pb-4"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => setHistoryStudent(item)}
                className="flex-row items-center gap-3 rounded-2xl border border-border bg-card p-3"
              >
                <StudentAvatar student={item} />
                <View className="flex-1">
                  <Text className="font-semibold text-card-foreground">{item.displayName || item.email}</Text>
                  <Text className="text-xs text-muted-foreground">#{item.studentNumber || tGlobal('Ikke angivet')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
              </Pressable>
            )}
            ListEmptyComponent={
              historySearch ? (
                <Text className="mt-8 text-center text-muted-foreground">{tGlobal('Ingen elever fundet.')}</Text>
              ) : null
            }
          />
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
                  {item.status?.attended ? tGlobal('MØDT') : tGlobal('IKKE MØDT')}
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
          ListEmptyComponent={<Text className="mt-8 text-center text-muted-foreground">{tGlobal('Ingen elever fundet.')}</Text>}
        />
      )}

      <Modal visible={noteStudent !== null} animationType="slide" onRequestClose={() => setNoteStudent(null)}>
        {noteStudent && <AbsenceNoteModal student={noteStudent} onClose={() => setNoteStudent(null)} />}
      </Modal>

      <Modal visible={historyStudent !== null} animationType="slide" onRequestClose={() => setHistoryStudent(null)}>
        {historyStudent && <StudentHistoryModal student={historyStudent} locale={locale} onClose={() => setHistoryStudent(null)} />}
      </Modal>
    </SafeAreaView>
  );
}

function AbsenceNoteModal({ student, onClose }: { student: CombinedUser; onClose: () => void }) {
  const { firestore } = useFirebase();
  const { user } = useAuth();
  const { tGlobal } = useLanguagePreference();
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
        authorName: user.displayName || tGlobal('Admin'),
      });
      setNoteText('');
      onClose();
    } catch (error) {
      console.error('Failed to save absence note:', error);
      Alert.alert(tGlobal('Fejl'), tGlobal('Kunne ikke gemme noten.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
        <Text className="text-lg font-semibold text-foreground">{student.displayName || student.email}</Text>
        <Pressable onPress={onClose} className="px-2 py-1">
          <Text className="text-muted-foreground">{tGlobal('Luk')}</Text>
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
          <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{tGlobal('Ny note')}</Text>
          <Input multiline numberOfLines={4} value={noteText} onChangeText={setNoteText} className="min-h-[100px]" />
        </View>
        <Button loading={isSaving} onPress={handleSave}>
          {tGlobal('Gem Note')}
        </Button>
      </View>
    </SafeAreaView>
  );
}

/** 12-week attendance grid (one row per week, "attended" = at least one assignment that week) + notes, mirroring the web app's AdminAbsence history detail sheet. */
function StudentHistoryModal({
  student,
  locale,
  onClose,
}: {
  student: CombinedUser;
  locale: string;
  onClose: () => void;
}) {
  const { firestore } = useFirebase();
  const { user } = useAuth();
  const { tGlobal } = useLanguagePreference();
  const [weeks, setWeeks] = useState<{ start: Date; end: Date; attended: boolean; weekLabel: string }[]>([]);
  const [notes, setNotes] = useState<{ id: string; text: string; authorName?: string; createdAt?: any }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const loadNotes = async () => {
    const notesRef = collection(firestore, 'students', student.uid, 'absenceNotes');
    const snap = await getDocs(query(notesRef, orderBy('createdAt', 'desc')));
    setNotes(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })).filter((n: any) => n.type !== 'student_report'));
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const rows = [];
        for (let i = 0; i < 12; i++) {
          const { start, end } = getWeekBoundaries(i);
          const assignmentsRef = collection(firestore, 'students', student.uid, 'assignments');
          const snap = await getDocs(
            query(assignmentsRef, where('assignedAt', '>=', Timestamp.fromDate(start)), where('assignedAt', '<=', Timestamp.fromDate(end)))
          );
          rows.push({
            start,
            end,
            attended: !snap.empty,
            weekLabel: i === 0 ? tGlobal('Denne uge') : i === 1 ? tGlobal('Sidste uge') : `${i} ${tGlobal('uger siden')}`,
          });
        }
        if (!cancelled) setWeeks(rows);
        await loadNotes();
      } catch (error) {
        console.error('Failed to load student history:', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firestore, student.uid]);

  const handleSaveNote = async () => {
    if (!noteText.trim() || !user) return;
    setIsSaving(true);
    try {
      await addDoc(collection(firestore, 'students', student.uid, 'absenceNotes'), {
        text: noteText.trim(),
        createdAt: serverTimestamp(),
        authorName: user.displayName || tGlobal('Admin'),
      });
      setNoteText('');
      await loadNotes();
    } catch (error) {
      console.error('Failed to save absence note:', error);
      Alert.alert(tGlobal('Fejl'), tGlobal('Kunne ikke gemme noten.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
        <Text className="text-lg font-semibold text-foreground">{student.displayName || student.email}</Text>
        <Pressable onPress={onClose} className="px-2 py-1">
          <Text className="text-muted-foreground">{tGlobal('Luk')}</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator className="mt-10" />
      ) : (
        <FlatList
          data={[1]}
          keyExtractor={() => 'history'}
          contentContainerClassName="gap-8 p-4 pb-10"
          renderItem={() => (
            <View className="gap-8">
              <View className="gap-3">
                <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{tGlobal('Fremmøde')}</Text>
                <View className="gap-2">
                  {weeks.map((w, idx) => (
                    <View key={idx} className="flex-row items-center justify-between rounded-2xl border border-border bg-card p-4">
                      <View>
                        <Text className="text-sm font-bold text-foreground">{w.weekLabel}</Text>
                        <Text className="text-[10px] font-bold uppercase text-muted-foreground">
                          {w.start.toLocaleDateString(locale, { day: 'numeric', month: 'short' })} - {w.end.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
                        </Text>
                      </View>
                      <View className={`rounded-full px-3 py-1 ${w.attended ? 'bg-primary/10' : 'bg-destructive/10'}`}>
                        <Text className={`text-[9px] font-bold uppercase tracking-widest ${w.attended ? 'text-primary' : 'text-destructive'}`}>
                          {w.attended ? tGlobal('MØDT') : tGlobal('IKKE MØDT')}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              <View className="gap-3">
                <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{tGlobal('Noter')}</Text>
                {notes.length > 0 ? (
                  notes.map((n) => (
                    <Card key={n.id}>
                      <CardDescription>"{n.text}"</CardDescription>
                      <View className="mt-2 flex-row items-center justify-between">
                        <Text className="text-[10px] font-bold uppercase text-muted-foreground">{n.authorName}</Text>
                        <Text className="text-[10px] font-bold text-muted-foreground/40">
                          {n.createdAt?.toDate?.()?.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}
                        </Text>
                      </View>
                    </Card>
                  ))
                ) : (
                  <Text className="py-6 text-center italic text-muted-foreground">{tGlobal('Ingen noter endnu.')}</Text>
                )}
                <Input multiline numberOfLines={3} value={noteText} onChangeText={setNoteText} placeholder={tGlobal('Ny note')} className="min-h-[80px]" />
                <Button loading={isSaving} onPress={handleSaveNote}>
                  {tGlobal('Gem Note')}
                </Button>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
