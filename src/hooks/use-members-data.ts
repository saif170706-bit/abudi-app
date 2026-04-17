'use client';

import { useFirebase } from '@/firebase';
import { collection, getDocs, query, orderBy, limit, startAfter, QueryDocumentSnapshot } from 'firebase/firestore';
import useSWR from 'swr';
import { useState, useCallback } from 'react';
import type { UserData, UserRole } from '@/types';

export type CombinedUser = UserData & {
  status: 'Tilmeldt' | 'Venter' | 'Afventer Sletning';
  id: string;
};

// Global in-memory cache: survives component unmounts.
// Once the admin list is fetched, it is stored here for the whole browser session.
// This means switching between admin sub-pages does NOT re-fetch the data.
let sessionCache: CombinedUser[] | null = null;
let sessionCacheTime = 0;
const SESSION_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function useMembersData() {
  const { firestore } = useFirebase();

  const fetcher = async () => {
    if (!firestore) return [];

    // Return session cache if it is still fresh (within 10 minutes)
    if (sessionCache && Date.now() - sessionCacheTime < SESSION_CACHE_TTL_MS) {
      return sessionCache;
    }

    const allUsers: CombinedUser[] = [];
    const userEmails = new Set<string>();

    const collectionsToFetch: UserRole[] = ['students', 'teachers', 'admins'];

    // Fetch all confirmed users in parallel (no change to existing behaviour)
    const collectionPromises = collectionsToFetch.map(col => getDocs(collection(firestore, col)));
    const snapshots = await Promise.all(collectionPromises);

    snapshots.forEach((snapshot, index) => {
      const role = collectionsToFetch[index];
      snapshot.forEach((doc) => {
        const data = doc.data() as UserData;
        if (data && data.email) {
          allUsers.push({
            ...data,
            id: doc.id,
            uid: doc.id,
            status: data.pendingDeletion ? 'Afventer Sletning' : 'Tilmeldt',
          });
          userEmails.add(data.email.toLowerCase());
        }
      });
    });

    // Fetch placeholders (pending users)
    const placeholderSnapshot = await getDocs(collection(firestore, 'placeholders'));
    placeholderSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.email && !userEmails.has(data.email.toLowerCase())) {
        allUsers.push({
          id: doc.id,
          uid: doc.id,
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

    // Store in session-level cache
    sessionCache = sorted;
    sessionCacheTime = Date.now();

    return sorted;
  };

  const { data, mutate, isValidating, error } = useSWR('admin_members_list', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false, // Don't re-fetch on reconnect — cache is enough
    dedupingInterval: 10 * 60 * 1000, // 10 minutes — only one fetch every 10 mins
  });

  // Expose a manual refresh that also clears the session cache
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
