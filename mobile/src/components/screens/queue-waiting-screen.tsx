import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/firebase/client';
import { Button } from '@/components/ui/button';
import { useLanguagePreference } from '@/context/language-context';

// Minimal "you're in the queue" confirmation. The full live experience (position updates,
// being called by a teacher, redirect notices) mirrors the web app's ~1000-line in_queue
// flow and hasn't been built yet — this is a placeholder until that's scoped. Leaving the
// queue and being called (via the global IncomingCallListener/push notifications) do work.
export function QueueWaitingScreen() {
  const { position, ticketNumber, type } = useLocalSearchParams<{ position?: string; ticketNumber?: string; type?: string }>();
  const { tGlobal } = useLanguagePreference();
  const [isLeaving, setIsLeaving] = useState(false);

  const handleLeaveQueue = async () => {
    setIsLeaving(true);
    try {
      const fn = httpsCallable(functions, 'leaveQueue');
      await fn({ type: type || 'physical' });
      router.dismissAll();
    } catch (error) {
      console.error('Failed to leave queue:', error);
      Alert.alert(tGlobal('Fejl'), tGlobal('Kunne ikke forlade køen.'));
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-background px-6">
      <View className="h-24 w-24 items-center justify-center rounded-[40px] bg-primary/10">
        <Ionicons name="hourglass-outline" size={44} color="#197670" />
      </View>
      <Text className="mt-8 text-3xl font-bold text-foreground">{tGlobal('Du er tilmeldt køen')}</Text>
      {ticketNumber ? (
        <Text className="mt-2 text-lg font-bold text-accent">
          {tGlobal('Billet #')}
          {ticketNumber}
        </Text>
      ) : null}
      {position ? (
        <Text className="mt-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          {tGlobal('Din plads i køen:')} {position}
        </Text>
      ) : null}
      <Text className="mt-6 text-center text-sm text-muted-foreground">
        {tGlobal('Vi giver besked her i appen, når en lærer er klar til dig.')}
      </Text>
      <Button variant="outline" className="mt-10 px-8" loading={isLeaving} onPress={handleLeaveQueue}>
        {tGlobal('Forlad køen')}
      </Button>
      <Button variant="ghost" className="mt-2 px-8" onPress={() => router.dismissAll()}>
        {tGlobal('Tilbage til Hjem')}
      </Button>
    </SafeAreaView>
  );
}
