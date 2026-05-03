'use client';

import { useEffect, useRef } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { doc, getDoc, onSnapshot, Timestamp, setDoc, serverTimestamp, collection } from 'firebase/firestore';
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
      if (!user || !firestore) return [];

      // Always fetch fresh teacher data for filtering
      const tSnap = await getDoc(doc(firestore, 'teachers', user.uid));
      if (!tSnap.exists()) return [];
      const teacher = tSnap.data();

      const list: any[] = [];
      const genderKey = `${teacher.gender === 'woman' ? 'woman' : 'man'}StudentsById`;
      const allowedIds = teacher.allowedStudentIds as string[] | null;

      const [qSnap, gPSnap, gVSnap] = await Promise.all([
        getDoc(doc(firestore, 'queues', user.uid)),
        getDoc(doc(firestore, 'globalQueues', 'physical')),
        getDoc(doc(firestore, 'globalQueues', 'virtual'))
      ]);

      // 1. Process teacher-specific queue
      if (qSnap.exists()) {
        const map = (qSnap.data()?.studentsById ?? {}) as Record<string, any>;
        Object.entries(map).forEach(([id, s]) => {
          // If a group filter is active, only include students in that group
          if (allowedIds && !allowedIds.includes(id)) return;
          
          list.push({ 
            id, 
            ...s, 
            source: 'specific', 
            joinedAtMs: s.joinedAt instanceof Timestamp ? s.joinedAt.toMillis() : 0 
          });
        });
      }

      // 2. Process global queues (Filter matching gender, teacher availability, AND preference)
      const processGlobal = (snap: any, type: string) => {
        if (!snap.exists()) return;
        const map = (snap.data()?.[genderKey] ?? {}) as Record<string, any>;
        Object.entries(map).forEach(([id, s]) => {
          // RULE 0: If a group filter is active, only include students in that group
          if (allowedIds && !allowedIds.includes(id)) return;

          // RULE 1: Only show if neutral (no preference) OR if I am the preferred teacher
          const isNeutral = !s.preferredTeacherId;
          const isPreferredForMe = s.preferredTeacherId === user!.uid;
          
          if (isNeutral || isPreferredForMe) {
            list.push({ 
              id, 
              ...s, 
              source: 'global', 
              type, 
              joinedAtMs: s.joinedAt instanceof Timestamp ? s.joinedAt.toMillis() : 0 
            });
          }
        });
      };

      if (teacher.availablePhysical) processGlobal(gPSnap, 'physical');
      if (teacher.availableVirtual) processGlobal(gVSnap, 'virtual');

      return list.sort((a, b) => (a.joinedAtMs ?? 0) - (b.joinedAtMs ?? 0));
    },
    { revalidateOnFocus: true, dedupingInterval: 2000 }
  );

  // Store mutate functions in refs so they never change identity and won't
  // cause the snapshot useEffect to re-run on every render.
  const mutateTeacherRef = useRef(mutateTeacher);
  const mutateQueueRef = useRef(mutateQueue);
  useEffect(() => { mutateTeacherRef.current = mutateTeacher; }, [mutateTeacher]);
  useEffect(() => { mutateQueueRef.current = mutateQueue; }, [mutateQueue]);

  useEffect(() => {
    if (!user || !firestore) return;

    // 1. Listen to the teacher's own document (IMPORTANT: React to availability and filter changes)
    const unsubTeacher = onSnapshot(doc(firestore, 'teachers', user.uid), () => {
      mutateQueueRef.current();
      mutateTeacherRef.current();
    });

    // 2. Listen to teacher-specific queue document
    const unsubQ = onSnapshot(doc(firestore, 'queues', user.uid), () => {
      mutateQueueRef.current();
    });

    // 3. Listen to global queue documents
    const unsubGlobalP = onSnapshot(doc(firestore, 'globalQueues', 'physical'), () => mutateQueueRef.current());
    const unsubGlobalV = onSnapshot(doc(firestore, 'globalQueues', 'virtual'), () => mutateQueueRef.current());

    return () => {
      unsubTeacher();
      unsubQ();
      unsubGlobalP();
      unsubGlobalV();
    };
  }, [user?.uid, firestore]);

  return {
    teacher,
    queue: queue || [],
    isLoading: !teacher && !queue
  };
}
