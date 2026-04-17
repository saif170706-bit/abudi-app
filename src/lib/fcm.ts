'use client';

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { isSupported, getMessaging, getToken, onMessage, deleteToken } from "firebase/messaging";
import { firebaseConfig } from "@/firebase/config";
import { toast } from "@/hooks/use-toast";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

/**
 * Registers the service worker and retrieves an FCM token for any role.
 * Stores the token in Firestore with a lastUpdated timestamp so old-device
 * notifications can be cleaned up.
 */
export async function ensureWebPushToken(role: string): Promise<string | null> {
  if (!VAPID_PUBLIC_KEY) {
    console.error("VAPID_PUBLIC_KEY is not set.");
    return null;
  }

  if (!(await isSupported())) {
    console.log("FCM not supported in this browser.");
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
    const perm = await Notification.requestPermission();

    if (perm !== "granted") {
      return null;
    }

    const messaging = getMessaging(app);
    const token = await getToken(messaging, {
      vapidKey: VAPID_PUBLIC_KEY,
      serviceWorkerRegistration: reg
    });

    if (!token) return null;

    const auth = getAuth(app);
    const uid = auth.currentUser?.uid;
    if (!uid) return token;

    const col = role === 'admin' ? 'admins' : role === 'teacher' ? 'teachers' : 'students';

    // Store token with lastUpdated timestamp for deduplication and cleanup
    const tokenRef = doc(db, `${col}/${uid}/fcmTokens/${token}`);
    await setDoc(
      tokenRef,
      {
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(), // Used for cleanup of stale tokens
        platform: "web",
        ua: navigator.userAgent,
        role,
      },
      { merge: true }
    );

    return token;
  } catch (error) {
    console.error("FCM setup failed:", error);
    return null;
  }
}

export async function ensureWebPushTokenForStudent() {
  return ensureWebPushToken('student');
}

/**
 * Cleans up the current FCM token on logout.
 * Removes the token from Firestore so that the old device stops
 * receiving push notifications after the user signs out.
 */
export async function cleanupFcmTokenOnLogout(role: string): Promise<void> {
  if (!(await isSupported())) return;

  try {
    const auth = getAuth(app);
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const messaging = getMessaging(app);

    // Get the current token before it's deleted
    const reg = await navigator.serviceWorker.getRegistration("/firebase-messaging-sw.js");
    if (!reg) return;

    const token = await getToken(messaging, {
      vapidKey: VAPID_PUBLIC_KEY!,
      serviceWorkerRegistration: reg,
    }).catch(() => null);

    if (token) {
      // 1. Remove from Firestore so Cloud Functions stop sending to it
      const col = role === 'admin' ? 'admins' : role === 'teacher' ? 'teachers' : 'students';
      const tokenRef = doc(db, `${col}/${uid}/fcmTokens/${token}`);
      await deleteDoc(tokenRef).catch(() => {}); // Silent fail — logout should never be blocked

      // 2. Invalidate the token with FCM itself
      await deleteToken(messaging).catch(() => {});
    }
  } catch (error) {
    // Never block logout because of FCM cleanup failure
    console.warn("FCM cleanup on logout failed (non-blocking):", error);
  }
}

export function bindForegroundMessaging() {
  isSupported().then((ok) => {
    if (!ok) return;

    const messaging = getMessaging(app);
    onMessage(messaging, (payload) => {
      const data = payload.data || {};
      const notification = payload.notification || {};

      const title = notification.title || "Ibn Amer";
      const body = notification.body || "";

      // 1. Resolve deep link and context
      const channelType = data['stream.channel_type'];
      const channelId = data['stream.channel_id'];
      const cid = (channelType && channelId) ? `${channelType}:${channelId}` : data.cid;

      let link = "/";
      if (cid) {
        link = `/?view=chat&cid=${cid}&source=push`;
      } else if (data.link) {
        link = data.link;
      }

      const tag = data.tag || (cid ? cid : 'general-notification');

      // 2. Suppress if user is already looking at this EXACT chat
      const activeCid = (window as any).__IBNAMER_ACTIVE_CID__;
      if (activeCid && cid && activeCid === cid) {
        console.log("[FCM] Suppressed notification for active chat:", cid);
        return;
      }

      // 3. Show System Notification (even while app is open)
      if (Notification.permission === "granted") {
        // We use a small timeout to ensure the OS doesn't throttle rapid fires
        setTimeout(() => {
          const n = new Notification(title, {
            body: body,
            tag: tag, // Ensures unique notification per message (collapses duplicates)
            data: { link },
            icon: 'https://i.postimg.cc/RVPTkLJN/frontepagelogo-5282001fe8581541590a.png',
            badge: 'https://i.postimg.cc/RVPTkLJN/frontepagelogo-5282001fe8581541590a.png'
          });

          n.onclick = (e) => {
            e.preventDefault();
            window.focus();
            window.location.href = link;
          };
        }, 50);
      }

      // 4. Play sound
      try {
        const audio = new Audio('/sounds/ping.mp3');
        audio.play().catch(() => {});
      } catch (e) {}
    });
  });
}
