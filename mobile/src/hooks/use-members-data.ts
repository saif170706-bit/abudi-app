import { collection, getDocs } from 'firebase/firestore';
import useSWR from 'swr';
import { useCallback } from 'react';
import { useFirebase } from '@/firebase';
import type { UserData, UserRole } from '@/shared/types';

export type CombinedUser = UserData & {
  status: 'Tilmeldt' | 'Venter' | 'Afventer Sletning';
  id: string;
};

// Module-level cache: survives component unmounts for the whole app session.
let sessionCache: CombinedUser[] | null = null;
let sessionCacheTime = 0;
const SESSION_CACHE_TTL_MS = 10 * 60 * 1000;

export function useMembersData() {
  const { firestore } = useFirebase();

  const fetcher = useCallback(async () => {
    if (sessionCache && Date.now() - sessionCacheTime < SESSION_CACHE_TTL_MS) {
      return sessionCache;
    }

    const allUsers: CombinedUser[] = [];
    const userEmails = new Set<string>();
    const collectionsToFetch: UserRole[] = ['student', 'teacher', 'admin'];

    const snapshots = await Promise.all(
      collectionsToFetch.map((role) => getDocs(collection(firestore, `${role}s`)))
    );

    snapshots.forEach((snapshot, index) => {
      const role = collectionsToFetch[index];
      snapshot.forEach((d) => {
        const data = d.data() as UserData;
        if (data?.email) {
          allUsers.push({ ...data, id: d.id, uid: d.id, status: data.pendingDeletion ? 'Afventer Sletning' : 'Tilmeldt' });
          userEmails.add(data.email.toLowerCase());
        }
      });
    });

    const placeholderSnapshot = await getDocs(collection(firestore, 'placeholders'));
    placeholderSnapshot.forEach((d) => {
      const data = d.data() as any;
      if (data.email && !userEmails.has(data.email.toLowerCase())) {
        allUsers.push({
          id: d.id,
          uid: d.id,
          email: data.email,
          displayName: data.fullName || data.name || 'N/A',
          role: data.role,
          subscriptionAmount: data.subscriptionAmount || 0,
          gender: data.gender || 'man',
          status: 'Venter',
          studentNumber: data.studentNumber,
          courseDuration: data.courseDuration || null,
          photoURL: null,
          phoneNumber: data.phoneNumber || null,
        } as CombinedUser);
      }
    });

    const sorted = allUsers.sort((a, b) => a.email.localeCompare(b.email));
    sessionCache = sorted;
    sessionCacheTime = Date.now();
    return sorted;
  }, [firestore]);

  const { data, mutate, isValidating, error } = useSWR('admin_members_list', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    dedupingInterval: 10 * 60 * 1000,
  });

  const refresh = useCallback(async () => {
    sessionCache = null;
    sessionCacheTime = 0;
    await mutate();
  }, [mutate]);

  return {
    members: data || [],
    isLoading: !data && isValidating,
    isRefreshing: isValidating,
    error,
    mutate: refresh,
  };
}
