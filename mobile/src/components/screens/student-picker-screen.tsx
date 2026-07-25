import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { collection, query, orderBy } from 'firebase/firestore';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { Input } from '@/components/ui/input';

interface StudentRow {
  id: string;
  displayName?: string;
  name?: string;
  studentNumber?: string;
}

export function StudentPickerScreen() {
  const { firestore } = useFirebase();
  const [search, setSearch] = useState('');

  const studentsQuery = useMemoFirebase(
    () => query(collection(firestore, 'students'), orderBy('displayName')),
    [firestore]
  );
  const { data: students, isLoading } = useCollection<StudentRow>(studentsQuery);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term || !students) return students ?? [];
    return students.filter(
      (s) =>
        (s.displayName || s.name || '').toLowerCase().includes(term) ||
        (s.studentNumber || '').toLowerCase().includes(term)
    );
  }, [search, students]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="p-4">
        <Text className="mb-4 text-2xl font-bold text-foreground">Elever</Text>
        <Input placeholder="Søg efter elev..." value={search} onChangeText={setSearch} />
      </View>
      {isLoading ? (
        <ActivityIndicator className="mt-8" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(s) => s.id}
          contentContainerClassName="px-4 gap-2"
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                router.push({ pathname: '/students/[studentId]', params: { studentId: item.id } } as any)
              }
              className="rounded-xl border border-border bg-card p-4"
            >
              <Text className="font-semibold text-card-foreground">{item.displayName || item.name}</Text>
              {item.studentNumber && <Text className="text-xs text-muted-foreground">#{item.studentNumber}</Text>}
            </Pressable>
          )}
          ListEmptyComponent={<Text className="mt-8 text-center text-muted-foreground">Ingen elever fundet.</Text>}
        />
      )}
    </SafeAreaView>
  );
}
