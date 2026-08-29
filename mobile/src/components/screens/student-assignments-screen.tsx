import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, orderBy, query } from 'firebase/firestore';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AssignmentForm } from './assignment-form';
import { useLanguagePreference } from '@/context/language-context';
import type { Assignment } from '@/shared/types';

export function StudentAssignmentsScreen({ studentId }: { studentId: string }) {
  const { firestore } = useFirebase();
  const { tGlobal } = useLanguagePreference();
  const [editing, setEditing] = useState<Assignment | 'new' | null>(null);

  const assignmentsQuery = useMemoFirebase(
    () => query(collection(firestore, 'students', studentId, 'assignments'), orderBy('assignedAt', 'desc')),
    [firestore, studentId]
  );
  const { data: assignments, isLoading } = useCollection<Assignment>(assignmentsQuery);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <FlatList
        className="flex-1 px-4"
        contentContainerClassName="gap-4 py-4"
        data={assignments ?? []}
        keyExtractor={(a) => a.id}
        ListHeaderComponent={
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-xl font-bold text-foreground">{tGlobal('Lektier')}</Text>
            <Button className="px-4 py-2" onPress={() => setEditing('new')}>
              {tGlobal('+ Ny lektie')}
            </Button>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => setEditing(item)}>
            <Card>
              <View className="flex-row items-center justify-between">
                <CardTitle>{item.hifz.surahName || item.murajara.surahName || tGlobal('Lektie')}</CardTitle>
                {(item.gradeHifz || item.gradeMurajara) && <Badge>{tGlobal(item.gradeHifz || item.gradeMurajara || '')}</Badge>}
              </View>
              <CardDescription>{item.dueDate}</CardDescription>
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator className="mt-8" />
          ) : (
            <Text className="mt-8 text-center text-muted-foreground">{tGlobal('Ingen lektier endnu.')}</Text>
          )
        }
      />

      <Modal visible={editing !== null} animationType="slide" onRequestClose={() => setEditing(null)}>
        <SafeAreaView className="flex-1 bg-background">
          <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
            <Text className="text-lg font-semibold text-foreground">
              {editing === 'new' ? tGlobal('Ny lektie') : tGlobal('Ret lektie')}
            </Text>
            <Pressable onPress={() => setEditing(null)} className="px-2 py-1">
              <Text className="text-muted-foreground">{tGlobal('Luk')}</Text>
            </Pressable>
          </View>
          {editing && (
            <AssignmentForm
              studentId={studentId}
              assignment={editing === 'new' ? undefined : editing}
              onDone={() => setEditing(null)}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
