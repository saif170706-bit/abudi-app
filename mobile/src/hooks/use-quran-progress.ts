import { useCallback, useRef } from 'react';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useAuth } from './use-auth';

/**
 * Saves the user's current Quran page to Firestore.
 * Stored at: users/{uid}/quranProgress/current
 * Throttled to 1 write per 3 seconds to avoid excessive writes.
 */
export function useQuranProgress() {
  const { firestore } = useFirebase();
  const { user } = useAuth();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveProgress = useCallback(
    (page: number) => {
      if (!user || !firestore) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        try {
          await setDoc(
            doc(firestore, 'users', user.uid, 'quranProgress', 'current'),
            { page, updatedAt: serverTimestamp() },
            { merge: true }
          );
        } catch {
          // Silent fail — never interrupt reading
        }
      }, 3000);
    },
    [user, firestore]
  );

  return { saveProgress };
}

/** Fetches the user's last saved Quran page. Returns null if none saved. */
export async function getQuranProgress(firestore: any, uid: string): Promise<number | null> {
  try {
    const snap = await getDoc(doc(firestore, 'users', uid, 'quranProgress', 'current'));
    if (snap.exists()) return snap.data()?.page ?? null;
    return null;
  } catch {
    return null;
  }
}
