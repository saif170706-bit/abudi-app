import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, FlatList, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { collection, getDocs } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useUserProfile } from '@/hooks/use-user-profile';
import { createOrFindChat } from '@/lib/stream-chat-actions';
import { pickAndUploadBanner } from '@/lib/upload-image';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLanguagePreference } from '@/context/language-context';

interface SearchableUser {
  uid: string;
  displayName: string;
  photoURL?: string | null;
  email?: string;
  gender?: 'man' | 'woman';
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

export default function NewChatRoute() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { firestore } = useFirebase();
  const { tGlobal } = useLanguagePreference();
  const [users, setUsers] = useState<SearchableUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<SearchableUser[]>([]);
  const [groupName, setGroupName] = useState('');
  const [groupImage, setGroupImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const isGroup = selected.length > 1;

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const roles: ('teachers' | 'students' | 'admins')[] = ['teachers'];
      if (profile.role === 'teacher' || profile.role === 'admin') roles.push('students');
      if (profile.role === 'admin') roles.push('admins');

      const snaps = await Promise.all(roles.map((r) => getDocs(collection(firestore, r))));
      const all: SearchableUser[] = [];
      snaps.forEach((snap) => {
        snap.forEach((d) => {
          const data = d.data() as any;
          all.push({ uid: d.id, displayName: data.displayName, photoURL: data.photoURL, email: data.email, gender: data.gender });
        });
      });

      const filtered = all.filter((u) => u.uid !== user?.uid && (!profile.gender || u.gender === profile.gender));
      setUsers(filtered);
      setIsLoading(false);
    })();
  }, [profile, user?.uid, firestore]);

  const filtered = useMemo(() => {
    if (!search) return users;
    const term = search.toLowerCase();
    return users.filter((u) => u.displayName?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term));
  }, [users, search]);

  const toggleUser = (u: SearchableUser) => {
    setSelected((prev) =>
      prev.some((x) => x.uid === u.uid) ? prev.filter((x) => x.uid !== u.uid) : [...prev, u]
    );
  };

  const handlePickGroupImage = async () => {
    setIsUploadingImage(true);
    try {
      const url = await pickAndUploadBanner('group-chats');
      if (url) setGroupImage(url);
    } catch (error) {
      console.error('Group image upload failed:', error);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleCreate = async () => {
    if (!user || !profile || selected.length === 0 || isCreating) return;
    setIsCreating(true);
    try {
      const idToken = await user.getIdToken();
      const channel = await createOrFindChat({
        idToken,
        members: [user.uid, ...selected.map((u) => u.uid)],
        createdBy: user.uid,
        groupName: isGroup ? groupName.trim() || undefined : undefined,
        groupImage: isGroup ? groupImage || undefined : undefined,
        memberProfiles: [
          { id: profile.id, name: profile.displayName || tGlobal('Bruger'), image: profile.photoURL || undefined },
          ...selected.map((u) => ({ id: u.uid, name: u.displayName, image: u.photoURL || undefined })),
        ],
      });
      router.replace(`/chat/${encodeURIComponent(channel.cid!)}` as any);
    } catch (error) {
      console.error('Failed to start chat:', error);
      Alert.alert(tGlobal('Fejl'), tGlobal('Kunne ikke starte samtalen.'));
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center gap-3 px-6 pt-4">
        <Pressable
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card shadow-sm"
        >
          <Ionicons name="close" size={20} color="#197670" />
        </Pressable>
        <Text className="text-xl font-bold text-foreground">{tGlobal('Ny samtale')}</Text>
      </View>

      <View className="px-6 pt-4">
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder={tGlobal('Søg efter navn...')}
          className="h-12 rounded-2xl border border-border bg-card px-4 text-base text-foreground"
        />
      </View>

      {selected.length > 0 && (
        <View className="gap-3 px-6 pt-4">
          <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {tGlobal('Valgte brugere')} ({selected.length})
          </Text>
          <FlatList
            horizontal
            data={selected}
            keyExtractor={(u) => u.uid}
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2"
            renderItem={({ item }) => (
              <Pressable
                onPress={() => toggleUser(item)}
                className="flex-row items-center gap-2 rounded-full border border-border bg-card py-2 pl-2 pr-3"
              >
                <View className="h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                  <Text className="text-[9px] font-bold text-primary">{initials(item.displayName)}</Text>
                </View>
                <Text className="text-xs font-semibold text-card-foreground" numberOfLines={1}>{item.displayName}</Text>
                <Ionicons name="close-circle" size={16} color="#9ca3af" />
              </Pressable>
            )}
          />
        </View>
      )}

      {isGroup && (
        <View className="gap-3 px-6 pt-4">
          <Pressable onPress={handlePickGroupImage} className="flex-row items-center gap-3">
            {groupImage ? (
              <Image source={{ uri: groupImage }} className="h-14 w-14 rounded-full" />
            ) : (
              <View className="h-14 w-14 items-center justify-center rounded-full bg-muted">
                {isUploadingImage ? <ActivityIndicator size="small" /> : <Ionicons name="camera" size={20} color="#9ca3af" />}
              </View>
            )}
            <Text className="text-sm font-bold text-primary">{tGlobal('Vælg gruppebillede')}</Text>
          </Pressable>
          <Input
            value={groupName}
            onChangeText={setGroupName}
            placeholder={tGlobal('Gruppenavn (valgfrit)')}
          />
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator className="mt-10" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(u) => u.uid}
          contentContainerClassName="gap-2 px-6 py-4"
          renderItem={({ item }) => {
            const isSelected = selected.some((u) => u.uid === item.uid);
            return (
              <Pressable
                onPress={() => toggleUser(item)}
                className={`flex-row items-center gap-3 rounded-2xl border px-4 py-3 ${isSelected ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
              >
                <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/5">
                  <Text className="text-xs font-bold text-primary">{initials(item.displayName)}</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-card-foreground">{item.displayName}</Text>
                  {item.email ? <Text className="text-xs text-muted-foreground">{item.email}</Text> : null}
                </View>
                <View className={`h-6 w-6 items-center justify-center rounded-full border-2 ${isSelected ? 'border-primary bg-primary' : 'border-border'}`}>
                  {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
              </Pressable>
            );
          }}
          ListEmptyComponent={<Text className="mt-10 text-center text-muted-foreground">{tGlobal('Ingen brugere fundet.')}</Text>}
        />
      )}

      {selected.length > 0 && (
        <View className="border-t border-border bg-background px-6 py-4">
          <Button loading={isCreating} onPress={handleCreate}>
            {isGroup ? tGlobal('Opret gruppechat') : tGlobal('Start chat')}
          </Button>
        </View>
      )}
    </SafeAreaView>
  );
}
