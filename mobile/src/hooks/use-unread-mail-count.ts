import { useMemo } from 'react';
import { collection } from 'firebase/firestore';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';

/**
 * Count of unread contact messages, for the admin "Mail" tab badge.
 * Filters client-side (not `where('isRead', '==', false)`) because Firestore
 * equality queries don't match documents where the field is entirely absent
 * — older messages predating `isRead` would be silently excluded otherwise.
 * Matches admin-mail-screen.tsx's own `!msg.isRead` check exactly.
 */
export function useUnreadMailCount() {
  const { firestore } = useFirebase();
  const messagesQuery = useMemoFirebase(() => collection(firestore, 'contactMessages'), [firestore]);
  const { data } = useCollection<{ isRead?: boolean }>(messagesQuery);
  return useMemo(() => (data ?? []).filter((m) => !m.isRead).length, [data]);
}
