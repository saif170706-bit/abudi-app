import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { doc, deleteDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { firestore } from '@/firebase/client';
import type { UserRole } from '@/hooks/use-user-profile';

// Foreground behavior: show the system alert + sound even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function collectionForRole(role: UserRole) {
  return role === 'admin' ? 'admins' : role === 'teacher' ? 'teachers' : 'students';
}

/**
 * Requests notification permission and registers an Expo push token for the
 * signed-in user, under `{collection}/{uid}/expoPushTokens/{token}` — a
 * sibling of the web app's `fcmTokens` subcollection (see functions/lib/fcm.ts
 * and functions/index.js's notifyOnNotificationRequest), kept separate so a
 * mismatched token format never gets mistaken for a dead FCM token and
 * deleted by that trigger's cleanup logic.
 *
 * Requires an EAS project to be linked (`eas init`) — until `app.json` has
 * `extra.eas.projectId`, this resolves to null and logs why instead of
 * throwing, since Expo push tokens can't be minted without one. It also only
 * works in a custom dev/production build, not the web preview (no native
 * push transport there).
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  if (!Device.isDevice) {
    console.log('[push] Push notifications require a physical device (or a real simulator push setup), skipping.');
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    console.log('[push] No EAS project linked yet (app.json extra.eas.projectId is unset) — run `eas init` once to enable push notifications.');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.log('[push] Notification permission not granted.');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#197670',
    });
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    return token;
  } catch (error) {
    console.error('[push] Failed to get Expo push token:', error);
    return null;
  }
}

export async function savePushToken(uid: string, role: UserRole, token: string) {
  const col = collectionForRole(role);
  await setDoc(
    doc(firestore, col, uid, 'expoPushTokens', token),
    { createdAt: serverTimestamp(), platform: Platform.OS },
    { merge: true }
  );
}

export async function removePushToken(uid: string, role: UserRole, token: string) {
  await deleteDoc(doc(firestore, role === 'admin' ? 'admins' : role === 'teacher' ? 'teachers' : 'students', uid, 'expoPushTokens', token)).catch(() => {});
}

/**
 * Maps the `link` the web backend already sends in its push payloads (see
 * functions/index.js — e.g. `/audio/{callId}` for a virtual queue call,
 * `/?view=homework-reading&source=push` for a physical call) to a mobile
 * route. Falls back to the role-appropriate home tab for links with no
 * mobile equivalent.
 */
export function mapPushLinkToRoute(link: string | undefined, role: UserRole | null | undefined): string {
  if (!link) return '/';
  if (link.startsWith('/audio/')) {
    // Virtual queue call — tapping the notification joins straight into the
    // call screen, which itself registers the tap as "answered" (see
    // audio-call-screen.tsx) the same way accepting via IncomingCallListener would.
    return link;
  }
  if (link.includes('view=homework-reading')) {
    return role === 'teacher' ? '/teacher-queue' : '/';
  }
  return '/';
}
