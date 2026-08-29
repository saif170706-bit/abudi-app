import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Full chat (Stream Chat SDK) hasn't been wired up in the mobile app yet — this is the
// static shell matching the web design. Sending/receiving messages needs a separate pass.
export function StudentMessagesScreen() {
  const [search, setSearch] = useState('');

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-start justify-between px-6 pt-6">
        <View>
          <Text className="text-4xl font-bold tracking-tight text-foreground">Beskeder</Text>
          <Text className="mt-2 text-[10px] font-black uppercase tracking-[0.25em] text-accent">
            Chat med dine lærere
          </Text>
        </View>
        <Pressable
          onPress={() => Alert.alert('Kommer snart', 'At starte en ny samtale er ikke tilgængeligt i appen endnu.')}
          className="h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-sm"
        >
          <Ionicons name="add" size={26} color="#fff" />
        </Pressable>
      </View>

      <View className="relative mx-6 mt-6">
        <Ionicons name="search" size={18} color="#9ca3af" style={{ position: 'absolute', left: 16, top: 17, zIndex: 1 }} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Søg i samtaler..."
          className="h-14 rounded-[24px] bg-primary/5 pl-12 pr-4 text-base font-bold text-foreground"
        />
      </View>

      <View className="mx-6 mt-6 flex-row items-center gap-2">
        <View className="h-3 w-0.5 bg-accent" />
        <Text className="text-[10px] font-black uppercase tracking-widest text-accent">Dine samtaler</Text>
      </View>

      <View className="mx-6 mt-4 items-center rounded-[32px] border border-border bg-card py-16">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Ionicons name="chatbubble-outline" size={28} color="#9ca3af" />
        </View>
        <Text className="mt-4 text-lg font-bold text-primary">Ingen beskeder endnu</Text>
        <Text className="mt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Start din første samtale med en lærer
        </Text>
      </View>
    </SafeAreaView>
  );
}
