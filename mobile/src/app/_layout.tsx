import '@/global.css';

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { FirebaseProvider } from '@/firebase';
import { AuthProvider } from '@/context/auth-context';
import { LanguageProvider } from '@/context/language-context';
import { useAuth } from '@/hooks/use-auth';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { loading } = useAuth();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (loading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(admin)" />
      <Stack.Screen name="(teacher)" />
      <Stack.Screen name="(student)" />
      <Stack.Screen name="events/[eventId]" options={{ headerShown: true, title: 'Tilmelding', presentation: 'modal' }} />
      <Stack.Screen name="terminal/queue" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="terminal/tv" options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="admin-waiting-list" />
      <Stack.Screen name="queue-system" />
      <Stack.Screen name="queue-teacher-list" />
      <Stack.Screen name="queue-waiting" />
      <Stack.Screen name="leaderboard" />
      <Stack.Screen name="progress-journey" />
      <Stack.Screen name="chat/index" options={{ presentation: 'card' }} />
      <Stack.Screen name="chat/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="chat/[cid]" options={{ presentation: 'card' }} />
      <Stack.Screen name="teacher-queue" />
      <Stack.Screen name="teacher-invite-student" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LanguageProvider>
        <FirebaseProvider>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </FirebaseProvider>
      </LanguageProvider>
    </GestureHandlerRootView>
  );
}
