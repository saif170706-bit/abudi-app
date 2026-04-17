'use client';

import { useFirebase } from '@/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import useSWR from 'swr';

/**
 * Hook to manage and pre-fetch contact messages for the Admin Mail center.
 * Uses SWR for efficient caching and background revalidation.
 */
export function useAdminMail() {
  const { firestore } = useFirebase();

  const fetcher = async () => {
    if (!firestore) return [];
    
    const contactRef = collection(firestore, 'contactMessages');
    const q = query(contactRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));
  };

  const { data, mutate, isValidating, error } = useSWR('admin_contact_messages_list', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 60000, // 1 minute cache
  });

  return {
    messages: data || [],
    isLoading: !data && isValidating,
    isRefreshing: isValidating,
    error,
    mutate,
  };
}
