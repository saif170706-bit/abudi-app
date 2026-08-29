import React from 'react';
import { View, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/ui/button';

// Minimal "you're in the queue" confirmation. The full live experience (position updates,
// being called by a teacher, redirect notices) mirrors the web app's ~1000-line in_queue
// flow and hasn't been built yet — this is a placeholder until that's scoped.
export function QueueWaitingScreen() {
  const { position, ticketNumber } = useLocalSearchParams<{ position?: string; ticketNumber?: string }>();

  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-background px-6">
      <View className="h-24 w-24 items-center justify-center rounded-[40px] bg-primary/10">
        <Ionicons name="hourglass-outline" size={44} color="#197670" />
      </View>
      <Text className="mt-8 text-3xl font-bold text-foreground">Du er tilmeldt køen</Text>
      {ticketNumber ? <Text className="mt-2 text-lg font-bold text-accent">Billet #{ticketNumber}</Text> : null}
      {position ? (
        <Text className="mt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Din plads i køen: {position}
        </Text>
      ) : null}
      <Text className="mt-6 text-center text-sm text-muted-foreground">
        Vi giver besked her i appen, når en lærer er klar til dig.
      </Text>
      <Button
        variant="outline"
        className="mt-10 px-8"
        onPress={() =>
          Alert.alert('Kommer snart', 'At forlade køen fra appen er ikke muligt endnu — kontakt en lærer.')
        }
      >
        Forlad køen
      </Button>
      <Button variant="ghost" className="mt-2 px-8" onPress={() => router.dismissAll()}>
        Tilbage til Hjem
      </Button>
    </SafeAreaView>
  );
}
