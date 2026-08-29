import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, Modal, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { collection, deleteDoc, doc, orderBy, query } from 'firebase/firestore';
import * as Clipboard from 'expo-clipboard';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguagePreference, LOCALE_MAP } from '@/context/language-context';

interface WaitingListEntry {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  gender: 'man' | 'woman';
  readingLevel?: string;
  memorizingLevel?: string;
  createdAt?: { toDate: () => Date };
}

const REGISTER_LINK = 'https://ibnamer.dk/waiting-list/register';

function initials(name?: string) {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
}

function formatDate(entry: WaitingListEntry, locale: string, withYear = false) {
  const d = entry.createdAt?.toDate?.();
  if (!d) return '...';
  return d.toLocaleDateString(locale, withYear ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'short' });
}

export function AdminWaitingListScreen() {
  const { firestore } = useFirebase();
  const { tGlobal, language } = useLanguagePreference();
  const locale = LOCALE_MAP[language];
  const [tab, setTab] = useState<'man' | 'woman'>('man');
  const [selected, setSelected] = useState<WaitingListEntry | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copied, setCopied] = useState(false);

  const waitingListQuery = useMemoFirebase(
    () => query(collection(firestore, 'waitingList'), orderBy('createdAt', 'asc')),
    [firestore]
  );
  const { data: entries, isLoading } = useCollection<WaitingListEntry>(waitingListQuery);

  const menQueue = useMemo(() => entries?.filter((e) => e.gender === 'man') ?? [], [entries]);
  const womenQueue = useMemo(() => entries?.filter((e) => e.gender === 'woman') ?? [], [entries]);
  const queue = tab === 'man' ? menQueue : womenQueue;

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(REGISTER_LINK);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    if (!selected) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(firestore, 'waitingList', selected.id));
      setSelected(null);
    } catch (error) {
      console.error('Failed to remove from waiting list:', error);
      Alert.alert(tGlobal('Fejl'), tGlobal('Kunne ikke fjerne personen.'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-start justify-between p-4">
        <View className="flex-row items-start gap-3">
          <Pressable
            onPress={() => router.back()}
            className="h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card shadow-sm"
          >
            <Ionicons name="arrow-back" size={20} color="#374151" />
          </Pressable>
          <View>
            <Text className="text-sm text-muted-foreground">{tGlobal('Admin')}</Text>
            <Text className="text-3xl font-bold text-foreground">{tGlobal('Venteliste')}</Text>
          </View>
        </View>
        <Pressable
          onPress={handleCopyLink}
          className="h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card shadow-sm"
        >
          <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={20} color="#197670" />
        </Pressable>
      </View>

      <View className="flex-row rounded-2xl bg-muted mx-4 p-1">
        <Pressable
          onPress={() => setTab('man')}
          className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl py-2 ${tab === 'man' ? 'bg-card shadow-sm' : ''}`}
        >
          <Text className="font-bold text-foreground">{tGlobal('Mænd')}</Text>
          <Badge className="bg-black/5">{String(menQueue.length)}</Badge>
        </Pressable>
        <Pressable
          onPress={() => setTab('woman')}
          className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl py-2 ${tab === 'woman' ? 'bg-card shadow-sm' : ''}`}
        >
          <Text className="font-bold text-foreground">{tGlobal('Kvinder')}</Text>
          <Badge className="bg-black/5">{String(womenQueue.length)}</Badge>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator className="mt-10" />
      ) : (
        <FlatList
          data={queue}
          keyExtractor={(e) => e.id}
          contentContainerClassName="gap-3 p-4"
          renderItem={({ item, index }) => {
            const isFirst = index === 0;
            return (
              <Pressable
                onPress={() => setSelected(item)}
                className={`flex-row items-center justify-between rounded-3xl border p-4 ${isFirst ? 'border-primary/30 bg-primary/[0.03]' : 'border-border bg-card'}`}
              >
                <View className="flex-row items-center gap-4">
                  <View>
                    <View className="h-12 w-12 items-center justify-center rounded-full border border-border bg-muted">
                      <Text className="text-xs font-bold text-muted-foreground">{initials(item.name)}</Text>
                    </View>
                    <View
                      className={`absolute -right-1 -top-1 h-5 w-5 items-center justify-center rounded-full border-2 border-card ${isFirst ? 'bg-primary' : 'bg-black/20'}`}
                    >
                      <Text className="text-[10px] font-bold text-white">{index + 1}</Text>
                    </View>
                  </View>
                  <View>
                    <Text className="text-base font-bold text-foreground">{item.name}</Text>
                    <Text className="text-[11px] font-bold uppercase tracking-tight text-muted-foreground">
                      {formatDate(item, locale)}
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-center gap-2">
                  {isFirst && (
                    <Badge className="bg-primary/10">
                      <Text className="text-[10px] font-bold text-primary">{tGlobal('NÆSTE')}</Text>
                    </Badge>
                  )}
                  <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <Text className="mt-16 text-center text-muted-foreground">
              {tGlobal(tab === 'man' ? 'Ingen mænd på ventelisten.' : 'Ingen kvinder på ventelisten.')}
            </Text>
          }
        />
      )}

      <Modal visible={!!selected} animationType="slide" onRequestClose={() => setSelected(null)}>
        <SafeAreaView className="flex-1 bg-background">
          <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
            <Text className="text-lg font-semibold text-foreground">{selected?.name}</Text>
            <Pressable onPress={() => setSelected(null)} className="p-2">
              <Ionicons name="close" size={22} color="#9ca3af" />
            </Pressable>
          </View>
          {selected && (
            <FlatList
              data={[1]}
              keyExtractor={() => 'detail'}
              contentContainerClassName="gap-6 p-6 pb-16"
              renderItem={() => (
                <View className="gap-6">
                  <View className="items-center gap-3">
                    <View className="h-24 w-24 items-center justify-center rounded-full border-4 border-card bg-muted shadow-sm">
                      <Text className="text-2xl font-bold text-muted-foreground">{initials(selected.name)}</Text>
                    </View>
                    <View className="items-center gap-1">
                      <Text className="text-2xl font-bold text-foreground">{selected.name}</Text>
                      <Text className="text-muted-foreground">{selected.email}</Text>
                      <View className="mt-2 flex-row gap-2">
                        <Badge className={selected.gender === 'man' ? 'bg-blue-50' : 'bg-pink-50'}>
                          <Text className={`text-[9px] font-bold uppercase tracking-widest ${selected.gender === 'man' ? 'text-blue-600' : 'text-pink-600'}`}>
                            {selected.gender === 'man' ? tGlobal('Mand') : tGlobal('Kvinde')}
                          </Text>
                        </Badge>
                        <Badge className="border border-border bg-transparent">
                          <Text className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                            {formatDate(selected, locale, true)}
                          </Text>
                        </Badge>
                      </View>
                    </View>
                  </View>

                  <View className="gap-4 rounded-3xl border border-border bg-card p-5 shadow-sm">
                    <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{tGlobal('Niveau')}</Text>
                    <View className="flex-row gap-4">
                      <View className="flex-1">
                        <Text className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">{tGlobal('Læsning')}</Text>
                        <Text className="text-sm font-bold leading-tight text-foreground">
                          {selected.readingLevel || tGlobal('Ikke angivet')}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">{tGlobal('Memorering')}</Text>
                        <Text className="text-sm font-bold leading-tight text-foreground">
                          {selected.memorizingLevel || tGlobal('Ikke angivet')}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View className="gap-4 rounded-3xl border border-border bg-card p-5 shadow-sm">
                    <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{tGlobal('Kontakt')}</Text>
                    <Pressable onPress={() => Linking.openURL(`tel:${selected.phoneNumber}`)} className="flex-row items-center gap-4">
                      <View className="h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                        <Ionicons name="call" size={18} color="#2563eb" />
                      </View>
                      <Text className="font-bold text-foreground">{selected.phoneNumber}</Text>
                    </Pressable>
                    <Pressable onPress={() => Linking.openURL(`mailto:${selected.email}`)} className="flex-row items-center gap-4">
                      <View className="h-10 w-10 items-center justify-center rounded-xl bg-purple-50">
                        <Ionicons name="mail" size={18} color="#9333ea" />
                      </View>
                      <Text className="font-bold text-foreground">{selected.email}</Text>
                    </Pressable>
                  </View>

                  <Button variant="destructive" loading={isDeleting} onPress={handleDelete}>
                    {tGlobal('Fjern fra venteliste')}
                  </Button>
                </View>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
