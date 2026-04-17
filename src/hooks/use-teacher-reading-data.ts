'use client';

import { useEffect } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { doc, getDoc, onSnapshot, Timestamp, setDoc, serverTimestamp } from 'firebase/firestore';
import useSWR from 'swr';
import type { QueueStudent } from '@/types';

/**
 * Hook to manage and pre-fetch teacher-specific queue and status.
 * Uses SWR to share data globally across the teacher dashboard.
 */
export function useTeacherReadingData() {
  const { firestore } = useFirebase();
  const { user } = useUser();

  const { data: teacher, mutate: mutateTeacher } = useSWR(
    user && firestore ? `teacher_profile_v1_${user.uid}` : null,
    async () => {
      const snap = await getDoc(doc(firestore!, 'teachers', user!.uid));
      return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    },
    { revalidateOnFocus: false, revalidateOnReconnect: true }
  );

  const { data: queue, mutate: mutateQueue } = useSWR(
    user && firestore ? `teacher_queue_v1_${user.uid}` : null,
    async () => {
      const snap = await getDoc(doc(firestore!, 'queues', user!.uid));
      if (!snap.exists()) {
        const queueData = {
          teacherId: user!.uid,
          studentsById: {},
          createdAt: serverTimestamp(),
        };
        await setDoc(doc(firestore!, 'queues', user!.uid), queueData, { merge: true });
        return [];
      }
      const map = (snap.data()?.studentsById ?? {}) as Record<string, any>;
      const list = Object.entries(map).map(([id, s]) => ({
        id,
        name: s.name ?? 'Ukendt',
        photoURL: s.photoURL ?? null,
        fcmToken: s.fcmToken ?? null,
        phoneNumber: s.phoneNumber ?? null,
        source: s.source ?? null,
        type: s.type ?? 'physical',
        joinedAtMs: s.joinedAt instanceof Timestamp ? s.joinedAt.toMillis() : 0,
        ticketNumber: s.ticketNumber ?? null,
      }));
      return list.sort((a, b) => (a.joinedAtMs ?? 0) - (b.joinedAtMs ?? 0));
    },
    { revalidateOnFocus: false, revalidateOnReconnect: true }
  );

  useEffect(() => {
    if (!user || !firestore) return;

    const unsubT = onSnapshot(doc(firestore, 'teachers', user.uid), (snap) => {
      if (snap.exists()) {
        mutateTeacher({ id: snap.id, ...snap.data() }, false);
      }
    });

    const unsubQ = onSnapshot(doc(firestore, 'queues', user.uid), (snap) => {
      if (snap.exists()) {
        const map = (snap.data()?.studentsById ?? {}) as Record<string, any>;
        const list = Object.entries(map).map(([id, s]) => ({
          id,
          name: s.name ?? 'Ukendt',
          photoURL: s.photoURL ?? null,
          fcmToken: s.fcmToken ?? null,
          phoneNumber: s.phoneNumber ?? null,
          source: s.source ?? null,
          type: s.type ?? 'physical',
          joinedAtMs: s.joinedAt instanceof Timestamp ? s.joinedAt.toMillis() : 0,
          ticketNumber: s.ticketNumber ?? null,
        })).sort((a, b) => (a.joinedAtMs ?? 0) - (b.joinedAtMs ?? 0));
        mutateQueue(list, false);
      }
    });

    return () => {
      unsubT();
      unsubQ();
    };
  }, [user?.uid, firestore, mutateTeacher, mutateQueue]);

  return {
    teacher,
    queue: queue || [],
    isLoading: !teacher && !queue
  };
}
