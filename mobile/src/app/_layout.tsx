import '@/global.css';

import { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { FirebaseProvider } from '@/firebase';
import { AuthProvider } from '@/context/auth-context';
import { LanguageProvider } from '@/context/language-context';
import { useAuth } from '@/hooks/use-auth';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { IncomingCallListener } from '@/components/ui/incoming-call-listener';
import { OfflineBanner } from '@/components/ui/offline-banner';

SplashScreen.preventAutoHideAsync();

/**
 * Expo Router convention: a named `ErrorBoundary` export from any route file
 * (including this root layout) catches render errors in that route's
 * subtree instead of crashing to a blank/frozen screen — see
 * expo-router/build/views/Try.js, which wraps every route's component with
 * exactly this {error, retry} contract. No such boundary existed anywhere
 * before this, so any uncaught render error in any screen took the whole
 * app down with no recovery.
 */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  if (__DEV__) console.error('[ErrorBoundary]', error);
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-background px-8">
      <Text className="text-5xl">😔</Text>
      <Text className="mt-4 text-center text-xl font-bold text-foreground">Der gik noget galt</Text>
      <Text className="mt-2 text-center text-sm text-muted-foreground">
        Prøv igen, eller genstart appen hvis problemet fortsætter.
      </Text>
      <Pressable onPress={retry} className="mt-8 rounded-2xl bg-primary px-8 py-4">
        <Text className="font-bold text-primary-foreground">Prøv igen</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function RootNavigator() {
  const { loading } = useAuth();
  usePushNotifications();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (loading) return null;

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(admin)" />
        <Stack.Screen name="(teacher)" />
        <Stack.Screen name="(student)" />
        <Stack.Screen name="events/[eventId]" options={{ headerShown: true, title: 'Tilmelding', presentation: 'modal' }} />
        <Stack.Screen name="surveys/[surveyId]" options={{ presentation: 'modal' }} />
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
        <Stack.Screen name="audio/[cid]" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="livestream-view/[id]" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="livestream-broadcast/[id]" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
      </Stack>
      <IncomingCallListener />
      <OfflineBanner />
    </>
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
