'use client';

import { useEffect, useCallback } from 'react';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useFirebase, useUser } from '@/firebase';

import { useView } from '@/context/ViewContext';

/**
 * Saves the user's current Quran page to Firestore.
 * Stored at: users/{uid}/quranProgress/current
 * Throttled to 1 write per 3 seconds to avoid excessive writes.
 */
export function useQuranProgress() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { setSavedQuranPage } = useView();

  const saveProgress = useCallback(
    (() => {
      let timer: ReturnType<typeof setTimeout> | null = null;
      return (page: number) => {
        // Live update the context immediately for UI responsiveness
        setSavedQuranPage(page);

        if (!user || !firestore) return;
        if (timer) clearTimeout(timer);
        timer = setTimeout(async () => {
          try {
            await setDoc(
              doc(firestore, 'users', user.uid, 'quranProgress', 'current'),
              { page, updatedAt: serverTimestamp() },
              { merge: true }
            );
          } catch (e) {
            // Silent fail — never interrupt reading
          }
        }, 3000);
      };
    })(),
    [user, firestore, setSavedQuranPage]
  );

  return { saveProgress };
}

/**
 * Fetches the user's last saved Quran page.
 * Returns null if no progress is saved.
 */
export async function getQuranProgress(
  firestore: any,
  uid: string
): Promise<number | null> {
  try {
    const snap = await getDoc(doc(firestore, 'users', uid, 'quranProgress', 'current'));
    if (snap.exists()) return snap.data()?.page ?? null;
    return null;
  } catch {
    return null;
  }
}
