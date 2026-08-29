import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, deleteDoc, doc, orderBy, query, updateDoc } from 'firebase/firestore';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { useMembersData, type CombinedUser } from '@/hooks/use-members-data';
import { restoreAccount, deleteUser } from '@/lib/user-admin-actions';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguagePreference } from '@/context/language-context';

interface ContactMessage {
  id: string;
  userName?: string;
  userEmail?: string;
  email?: string;
  subject?: string;
  message?: string;
  isRead?: boolean;
  createdAt?: { toDate?: () => Date };
}

export function AdminMailScreen() {
  const { firestore } = useFirebase();
  const { tGlobal } = useLanguagePreference();
  const [tab, setTab] = useState<'inbox' | 'requests'>('inbox');
  const [selected, setSelected] = useState<ContactMessage | null>(null);

  const messagesQuery = useMemoFirebase(
    () => query(collection(firestore, 'contactMessages'), orderBy('createdAt', 'desc')),
    [firestore]
  );
  const { data: messages, isLoading } = useCollection<ContactMessage>(messagesQuery);

  const { members, isLoading: isLoadingMembers, mutate: mutateMembers } = useMembersData();
  const deletionRequests = members.filter((m) => m.status === 'Afventer Sletning');

  const openMessage = async (msg: ContactMessage) => {
    setSelected(msg);
    if (!msg.isRead) {
      try {
        await updateDoc(doc(firestore, 'contactMessages', msg.id), { isRead: true });
      } catch (error) {
        console.error('Failed to mark message as read:', error);
      }
    }
  };

  const handleDelete = (msg: ContactMessage) => {
    Alert.alert(tGlobal('Slet besked'), `${tGlobal('Slet beskeden fra')} ${msg.userName ?? tGlobal('afsender')}?`, [
      { text: tGlobal('Annuller'), style: 'cancel' },
      {
        text: tGlobal('Slet'),
        style: 'destructive',
        onPress: async () => {
          await deleteDoc(doc(firestore, 'contactMessages', msg.id));
          setSelected(null);
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="gap-3 p-4">
        <Text className="text-sm text-muted-foreground">{tGlobal('Admin')}</Text>
        <Text className="text-2xl font-bold text-foreground">{tab === 'inbox' ? tGlobal('Indbakke') : tGlobal('Anmodninger')}</Text>
        <View className="flex-row rounded-2xl bg-muted p-1">
          <Pressable
            onPress={() => setTab('inbox')}
            className={`flex-1 items-center rounded-xl py-2 ${tab === 'inbox' ? 'bg-card shadow-sm' : ''}`}
          >
            <Text className={tab === 'inbox' ? 'font-semibold text-foreground' : 'text-muted-foreground'}>{tGlobal('Indbakke')}</Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('requests')}
            className={`flex-1 items-center rounded-xl py-2 ${tab === 'requests' ? 'bg-card shadow-sm' : ''}`}
          >
            <Text className={tab === 'requests' ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
              {tGlobal('Anmodninger')}{deletionRequests.length > 0 ? ` (${deletionRequests.length})` : ''}
            </Text>
          </Pressable>
        </View>
      </View>

      {tab === 'inbox' ? (
        isLoading ? (
          <ActivityIndicator className="mt-8" />
        ) : (
          <FlatList
            data={messages ?? []}
            keyExtractor={(m) => m.id}
            contentContainerClassName="gap-2 px-4 pb-4"
            renderItem={({ item }) => (
              <Pressable onPress={() => openMessage(item)}>
                <Card>
                  <View className="flex-row items-center justify-between">
                    <Text className={item.isRead ? 'font-medium text-card-foreground' : 'font-extrabold text-card-foreground'}>
                      {item.userName ?? tGlobal('Ukendt')}
                    </Text>
                    {!item.isRead && <Badge>{tGlobal('Ny')}</Badge>}
                  </View>
                  <CardDescription>{item.subject ?? tGlobal('Intet emne')}</CardDescription>
                </Card>
              </Pressable>
            )}
            ListEmptyComponent={<Text className="mt-8 text-center text-muted-foreground">{tGlobal('Ingen beskeder endnu.')}</Text>}
          />
        )
      ) : isLoadingMembers ? (
        <ActivityIndicator className="mt-8" />
      ) : (
        <FlatList
          data={deletionRequests}
          keyExtractor={(m) => m.uid}
          contentContainerClassName="gap-2 px-4 pb-4"
          renderItem={({ item }) => (
            <DeletionRequestRow member={item} onChanged={mutateMembers} />
          )}
          ListEmptyComponent={<Text className="mt-8 text-center text-muted-foreground">{tGlobal('Ingen anmodninger.')}</Text>}
        />
      )}

      <Modal visible={selected !== null} animationType="slide" onRequestClose={() => setSelected(null)}>
        {selected && (
          <SafeAreaView className="flex-1 bg-background">
            <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
              <Text className="text-lg font-semibold text-foreground">{tGlobal('Besked')}</Text>
              <Pressable onPress={() => setSelected(null)} className="px-2 py-1">
                <Text className="text-muted-foreground">{tGlobal('Luk')}</Text>
              </Pressable>
            </View>
            <View className="gap-4 p-4">
              <Card>
                <CardTitle>{selected.userName ?? tGlobal('Ukendt')}</CardTitle>
                <CardDescription>{selected.userEmail ?? selected.email}</CardDescription>
              </Card>
              <Text className="text-base font-semibold text-foreground">{selected.subject ?? tGlobal('Intet emne')}</Text>
              <Text className="text-base leading-relaxed text-foreground/80">{selected.message ?? tGlobal('Ingen besked')}</Text>
              <Button variant="destructive" onPress={() => handleDelete(selected)}>
                {tGlobal('Slet Besked')}
              </Button>
            </View>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}

function DeletionRequestRow({ member, onChanged }: { member: CombinedUser; onChanged: () => void }) {
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { tGlobal } = useLanguagePreference();

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      await restoreAccount(member.uid, member.role);
      onChanged();
    } catch (error) {
      console.error('Failed to restore account:', error);
      Alert.alert(tGlobal('Fejl'), tGlobal('Kunne ikke gendanne kontoen.'));
    } finally {
      setIsRestoring(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      tGlobal('Slet konto permanent'),
      `${tGlobal('Er du sikker på at du vil slette')} ${member.displayName || member.email} ${tGlobal('permanent? Dette kan ikke fortrydes.')}`,
      [
        { text: tGlobal('Annuller'), style: 'cancel' },
        {
          text: tGlobal('Slet permanent'),
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteUser(member.uid);
              onChanged();
            } catch (error) {
              console.error('Failed to delete account:', error);
              Alert.alert(tGlobal('Fejl'), tGlobal('Kunne ikke slette kontoen.'));
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Card>
      <CardTitle>{member.displayName || member.email}</CardTitle>
      <CardDescription>{member.email}</CardDescription>
      <View className="mt-3 flex-row gap-3">
        <Button variant="outline" className="flex-1" loading={isRestoring} onPress={handleRestore}>
          {tGlobal('Gendan')}
        </Button>
        <Button variant="destructive" className="flex-1" loading={isDeleting} onPress={handleDelete}>
          {tGlobal('Slet permanent')}
        </Button>
      </View>
    </Card>
  );
}
