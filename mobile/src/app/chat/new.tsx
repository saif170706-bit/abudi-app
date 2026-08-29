import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, TextInput, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { collection, getDocs } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useUserProfile } from '@/hooks/use-user-profile';
import { createOrFindChat } from '@/lib/stream-chat-actions';

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
  const [users, setUsers] = useState<SearchableUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState<string | null>(null);

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

  const handleStartChat = async (other: SearchableUser) => {
    if (!user || !profile || creating) return;
    setCreating(other.uid);
    try {
      const idToken = await user.getIdToken();
      const channel = await createOrFindChat({
        idToken,
        members: [user.uid, other.uid],
        createdBy: user.uid,
        memberProfiles: [
          { id: profile.id, name: profile.displayName || 'Bruger', image: profile.photoURL || undefined },
          { id: other.uid, name: other.displayName, image: other.photoURL || undefined },
        ],
      });
      router.replace(`/chat/${encodeURIComponent(channel.cid!)}` as any);
    } catch (error) {
      console.error('Failed to start chat:', error);
      Alert.alert('Fejl', 'Kunne ikke starte samtalen.');
    } finally {
      setCreating(null);
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
        <Text className="text-xl font-bold text-foreground">Ny samtale</Text>
      </View>

      <View className="px-6 pt-4">
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Søg efter navn..."
          className="h-12 rounded-2xl border border-border bg-card px-4 text-base text-foreground"
        />
      </View>

      {isLoading ? (
        <ActivityIndicator className="mt-10" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(u) => u.uid}
          contentContainerClassName="gap-2 px-6 py-4"
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleStartChat(item)}
              disabled={!!creating}
              className="flex-row items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3"
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-primary/5">
                <Text className="text-xs font-bold text-primary">{initials(item.displayName)}</Text>
              </View>
              <View className="flex-1">
                <Text className="font-semibold text-card-foreground">{item.displayName}</Text>
                {item.email ? <Text className="text-xs text-muted-foreground">{item.email}</Text> : null}
              </View>
              {creating === item.uid ? <ActivityIndicator /> : <Ionicons name="chevron-forward" size={18} color="#9ca3af" />}
            </Pressable>
          )}
          ListEmptyComponent={<Text className="mt-10 text-center text-muted-foreground">Ingen brugere fundet.</Text>}
        />
      )}
    </SafeAreaView>
  );
}
