import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
// See firebase/client.ts for why auth APIs come from @firebase/auth, not firebase/auth.
import { getAuth } from '@firebase/auth';
import { useFirebase } from '@/firebase';
import { useAuth } from './use-auth';
import useSWR from 'swr';

export type UserRole = 'student' | 'teacher' | 'admin';
export type UserProfile = {
  id: string; // uid
  role: UserRole;
  displayName?: string;
  email?: string;
  [key: string]: any;
};

function roleKey(uid: string) {
  return `cachedRole:${uid}`;
}
function profileKey(uid: string) {
  return `ibnamer_profile_v1:${uid}`;
}

function safeJsonParse<T>(s: string | null): T | null {
  if (!s) return null;
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

async function fetchProfileFromFirestore(firestore: any, uid: string) {
  if (!firestore || !uid) return null;

  const roles: UserRole[] = ['admin', 'teacher', 'student'];

  // Step 1: Try to read the role from the Firebase Auth token claim (0 extra reads).
  // New users get this claim set automatically by the onStudentCreated/onTeacherCreated/onAdminCreated
  // Cloud Functions. This replaces the 3-parallel-read pattern for most users.
  try {
    const auth = getAuth();
    if (auth.currentUser) {
      const tokenResult = await auth.currentUser.getIdTokenResult(false);
      const claimedRole = tokenResult.claims?.role as UserRole | undefined;
      if (claimedRole && roles.includes(claimedRole)) {
        const collectionName = claimedRole === 'admin' ? 'admins' : claimedRole === 'teacher' ? 'teachers' : 'students';
        const snap = await getDoc(doc(firestore, collectionName, uid));
        if (snap.exists()) {
          const profile = { id: uid, role: claimedRole, ...snap.data() } as UserProfile;
          await AsyncStorage.setItem(roleKey(uid), claimedRole).catch(() => {});
          await AsyncStorage.setItem(profileKey(uid), JSON.stringify(profile)).catch(() => {});
          return profile;
        }
      }
    }
  } catch (tokenErr) {
    console.warn('Token claim read failed, falling back to collection query:', tokenErr);
  }

  // Step 2: Fallback for existing users without a custom claim yet.
  // Fetch all 3 collections in parallel (original behaviour).
  try {
    const snaps = await Promise.all(
      roles.map((role) => {
        const collectionName = role === 'admin' ? 'admins' : role === 'teacher' ? 'teachers' : 'students';
        return getDoc(doc(firestore, collectionName, uid));
      })
    );

    const foundIdx = snaps.findIndex((s) => s.exists());
    if (foundIdx !== -1) {
      const role = roles[foundIdx];
      const data = snaps[foundIdx].data();
      const profile = { id: uid, role, ...data } as UserProfile;

      await AsyncStorage.setItem(roleKey(uid), role).catch(() => {});
      await AsyncStorage.setItem(profileKey(uid), JSON.stringify(profile)).catch(() => {});

      return profile;
    }
  } catch (error) {
    console.error('Error fetching user profile in parallel:', error);
  }

  return null;
}

export function useUserProfile() {
  const { user, loading: isAuthLoading } = useAuth();
  const { firestore } = useFirebase();

  // AsyncStorage is async, so the cached profile is hydrated into SWR's cache
  // via mutate() below rather than passed as synchronous fallbackData (web's
  // localStorage-based approach doesn't translate directly to RN).
  const [hydrated, setHydrated] = useState(false);

  const { data: profile, mutate, isValidating } = useSWR(
    user ? `user_profile_${user.uid}` : null,
    () => (user ? fetchProfileFromFirestore(firestore, user.uid) : null),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
    }
  );

  useEffect(() => {
    if (!user?.uid) {
      setHydrated(true);
      return;
    }
    let cancelled = false;
    setHydrated(false);
    AsyncStorage.getItem(profileKey(user.uid))
      .then((cached) => {
        if (cancelled) return;
        const parsed = safeJsonParse<UserProfile>(cached);
        if (parsed) mutate(parsed, false);
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.uid, mutate]);

  const handleMutate = useCallback(async () => {
    return mutate();
  }, [mutate]);

  return useMemo(
    () => ({
      profile: profile || null,
      role: profile?.role ?? null,
      isLoading: isAuthLoading || !hydrated || (!!user && !profile && isValidating),
      isRefreshing: isValidating,
      mutate: handleMutate,
    }),
    [profile, isAuthLoading, hydrated, user, isValidating, handleMutate]
  );
}
