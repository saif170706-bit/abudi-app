import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useAuth } from './use-auth';
import { useUserProfile } from './use-user-profile';
import { registerForPushNotificationsAsync, savePushToken, mapPushLinkToRoute } from '@/lib/push-notifications';

/**
 * Registers the device for push notifications once the user + role are known,
 * and navigates to the relevant screen when a notification is tapped
 * (foreground or from a cold/background start). Mirrors the web app's
 * ensureWebPushTokenForStudent/bindForegroundMessaging (functions/lib/fcm.ts),
 * but stores tokens separately — see push-notifications.ts for why.
 */
export function usePushNotifications() {
  const { user, loading: authLoading } = useAuth();
  const { role, isLoading: profileLoading } = useUserProfile();
  const registeredRef = useRef<string | null>(null);

  useEffect(() => {
    if (authLoading || profileLoading || !user || !role) return;
    if (registeredRef.current === user.uid) return;

    (async () => {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        try {
          await savePushToken(user.uid, role, token);
          registeredRef.current = user.uid;
        } catch (error) {
          console.error('[push] Failed to save push token:', error);
        }
      }
    })();
  }, [authLoading, profileLoading, user, role]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const link = response.notification.request.content.data?.link as string | undefined;
      const route = mapPushLinkToRoute(link, role);
      router.push(route as any);
    });
    return () => subscription.remove();
  }, [role]);
}
