import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { collection, doc, getDocs, limit as fsLimit, orderBy, query, setDoc, updateDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChipPicker } from '@/components/ui/chip-picker';
import { useLanguagePreference } from '@/context/language-context';
import type { UserGender, UserRole } from '@/shared/types';

interface CombinedUser {
  id: string;
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  gender?: UserGender;
  phoneNumber?: string | null;
  subscriptionAmount?: number;
  studentNumber?: string | null;
  courseDuration?: string | null;
  status: 'Tilmeldt' | 'Venter';
}

const PAGE_SIZE = 10;
const GENDER_OPTIONS: { value: UserGender; label: string }[] = [
  { value: 'man', label: 'Mand' },
  { value: 'woman', label: 'Kvinde' },
];

export function AdminMembersScreen() {
  const { firestore } = useFirebase();
  const { tGlobal } = useLanguagePreference();
  const [members, setMembers] = useState<CombinedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [limitCount, setLimitCount] = useState<number | 'all'>(PAGE_SIZE);
  const [editing, setEditing] = useState<CombinedUser | null>(null);

  const fetchUsers = useCallback(
    async (currentLimit: number | 'all', search: string) => {
      setIsLoading(true);
      try {
        const collections: UserRole[] = ['student', 'teacher', 'admin'];
        const all: CombinedUser[] = [];
        const emails = new Set<string>();

        await Promise.all(
          collections.map(async (role) => {
            const colName = `${role}s`;
            const q =
              currentLimit === 'all' || search
                ? query(collection(firestore, colName))
                : query(collection(firestore, colName), orderBy('createdAt', 'desc'), fsLimit(currentLimit));
            try {
              const snap = await getDocs(q);
              snap.forEach((d) => {
                const data = d.data() as any;
                if (data?.email) {
                  all.push({ ...data, id: d.id, uid: d.id, role, status: 'Tilmeldt' });
                  emails.add(data.email.toLowerCase());
                }
              });
            } catch {
              const snap = await getDocs(query(collection(firestore, colName), fsLimit(currentLimit === 'all' ? 200 : currentLimit)));
              snap.forEach((d) => {
                const data = d.data() as any;
                if (data?.email) {
                  all.push({ ...data, id: d.id, uid: d.id, role, status: 'Tilmeldt' });
                  emails.add(data.email.toLowerCase());
                }
              });
            }
          })
        );

        const placeholderQ =
          currentLimit === 'all' || search
            ? query(collection(firestore, 'placeholders'))
            : query(collection(firestore, 'placeholders'), fsLimit(currentLimit));
        const placeholderSnap = await getDocs(placeholderQ);
        placeholderSnap.forEach((d) => {
          const data = d.data() as any;
          if (data?.email && !emails.has(data.email.toLowerCase())) {
            all.push({
              id: d.id,
              uid: d.id,
              email: data.email,
              displayName: data.fullName || data.name || 'N/A',
              role: data.role,
              status: 'Venter',
              subscriptionAmount: data.subscriptionAmount,
              gender: data.gender,
              studentNumber: data.studentNumber,
              courseDuration: data.courseDuration,
              phoneNumber: data.phoneNumber,
            });
          }
        });

        let result = all;
        if (search) {
          const term = search.toLowerCase().trim();
          result = all.filter(
            (u) =>
              (u.displayName || '').toLowerCase().includes(term) ||
              u.email.toLowerCase().includes(term) ||
              (u.studentNumber || '').toLowerCase().includes(term)
          );
        }

        setMembers(result.sort((a, b) => a.email.localeCompare(b.email)));
      } finally {
        setIsLoading(false);
      }
    },
    [firestore]
  );

  useEffect(() => {
    fetchUsers(limitCount, searchInput);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limitCount]);

  const handleSearch = () => fetchUsers(limitCount, searchInput);

  const handleSave = async (updated: CombinedUser) => {
    try {
      const updateData = {
        displayName: updated.displayName,
        name: updated.displayName,
        phoneNumber: updated.phoneNumber || null,
        subscriptionAmount: updated.subscriptionAmount ?? 0,
        gender: updated.gender,
        ...(updated.role === 'student'
          ? { studentNumber: updated.studentNumber || null, courseDuration: updated.courseDuration || null }
          : {}),
      };
      if (updated.status === 'Venter') {
        await updateDoc(doc(firestore, 'placeholders', updated.id), updateData);
      } else {
        await updateDoc(doc(firestore, `${updated.role}s`, updated.id), updateData);
      }
      setEditing(null);
      fetchUsers(limitCount, searchInput);
    } catch (error) {
      console.error('Failed to update member:', error);
      Alert.alert(tGlobal('Fejl'), tGlobal('Kunne ikke opdatere brugeren.'));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-start justify-between px-4 pt-4">
        <View>
          <Text className="text-sm text-muted-foreground">{tGlobal('Admin')}</Text>
          <Text className="text-3xl font-bold text-foreground">{tGlobal('Medlemmer')}</Text>
        </View>
        <Pressable
          onPress={() => router.push('/admin-waiting-list')}
          className="h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card shadow-sm"
        >
          <Ionicons name="time-outline" size={20} color="#197670" />
        </Pressable>
      </View>
      <View className="gap-3 p-4">
        <Input
          placeholder={tGlobal('Søg efter navn, email eller elevnummer...')}
          value={searchInput}
          onChangeText={setSearchInput}
          onSubmitEditing={handleSearch}
        />
        <Button variant="outline" onPress={handleSearch} className="self-start px-4 py-2">
          {tGlobal('Søg')}
        </Button>
      </View>

      {isLoading ? (
        <ActivityIndicator className="mt-8" />
      ) : (
        <FlatList
          data={members}
          keyExtractor={(m) => m.id}
          contentContainerClassName="gap-2 px-4 pb-4"
          renderItem={({ item }) => (
            <Pressable onPress={() => setEditing(item)} className="rounded-xl border border-border bg-card p-4">
              <View className="flex-row items-center justify-between">
                <Text className="font-semibold text-card-foreground">{item.displayName || item.email}</Text>
                <Badge>{tGlobal(item.status)}</Badge>
              </View>
              <Text className="text-xs text-muted-foreground">
                {item.email} · {item.role}
              </Text>
            </Pressable>
          )}
          ListFooterComponent={
            limitCount !== 'all' ? (
              <Button variant="outline" onPress={() => setLimitCount('all')} className="mt-2">
                {tGlobal('Vis alle')}
              </Button>
            ) : null
          }
          ListEmptyComponent={<Text className="mt-8 text-center text-muted-foreground">{tGlobal('Ingen medlemmer fundet.')}</Text>}
        />
      )}

      <Modal visible={editing !== null} animationType="slide" onRequestClose={() => setEditing(null)}>
        {editing && (
          <MemberEditForm member={editing} onCancel={() => setEditing(null)} onSave={handleSave} />
        )}
      </Modal>
    </SafeAreaView>
  );
}

function MemberEditForm({
  member,
  onCancel,
  onSave,
}: {
  member: CombinedUser;
  onCancel: () => void;
  onSave: (updated: CombinedUser) => void;
}) {
  const [form, setForm] = useState<CombinedUser>(member);
  const [isSaving, setIsSaving] = useState(false);
  const { tGlobal } = useLanguagePreference();

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
        <Text className="text-lg font-semibold text-foreground">{tGlobal('Rediger medlem')}</Text>
        <Pressable onPress={onCancel} className="px-2 py-1">
          <Text className="text-muted-foreground">{tGlobal('Luk')}</Text>
        </Pressable>
      </View>
      <View className="gap-4 p-4">
        <View className="gap-2">
          <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{tGlobal('Navn')}</Text>
          <Input value={form.displayName || ''} onChangeText={(v) => setForm((f) => ({ ...f, displayName: v }))} />
        </View>
        <View className="gap-2">
          <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{tGlobal('Telefonnummer')}</Text>
          <Input
            keyboardType="phone-pad"
            value={form.phoneNumber || ''}
            onChangeText={(v) => setForm((f) => ({ ...f, phoneNumber: v }))}
          />
        </View>
        <View className="gap-2">
          <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{tGlobal('Køn')}</Text>
          <ChipPicker
            options={GENDER_OPTIONS.map((o) => ({ ...o, label: tGlobal(o.label) }))}
            value={form.gender || 'man'}
            onChange={(v) => setForm((f) => ({ ...f, gender: v }))}
          />
        </View>
        <View className="gap-2">
          <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{tGlobal('Abonnement (DKK)')}</Text>
          <Input
            keyboardType="number-pad"
            value={String(form.subscriptionAmount ?? 0)}
            onChangeText={(v) => setForm((f) => ({ ...f, subscriptionAmount: Number(v) || 0 }))}
          />
        </View>
        {form.role === 'student' && (
          <View className="gap-2">
            <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{tGlobal('Elevnummer')}</Text>
            <Input
              value={form.studentNumber || ''}
              onChangeText={(v) => setForm((f) => ({ ...f, studentNumber: v }))}
            />
          </View>
        )}
        <Button
          loading={isSaving}
          onPress={async () => {
            setIsSaving(true);
            await onSave(form);
            setIsSaving(false);
          }}
        >
          {tGlobal('Gem')}
        </Button>
      </View>
    </SafeAreaView>
  );
}
