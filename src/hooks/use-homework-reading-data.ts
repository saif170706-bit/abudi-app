'use client';

import { useMemo } from 'react';
import { useFirebase, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, Timestamp } from 'firebase/firestore';

/**
 * Hook to manage and pre-fetch teacher availability and queue data.
 * Used at the dashboard level to ensure data is ready before the user clicks "Læs Lektie".
 */
export function useHomeworkReadingData() {
  const { firestore } = useFirebase();
  const { user } = useUser();

  const teachersQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'teachers')) : null),
    [firestore]
  );

  const queuesQuery = useMemoFirebase(
    () => (firestore ? collection(firestore, 'queues') : null),
    [firestore]
  );

  const { data: allTeachers, isLoading: lTeachers } = useCollection<any>(teachersQuery);
  const { data: allQueues, isLoading: lQueues } = useCollection<any>(queuesQuery);

  const processed = useMemo(() => {
    const queueData: Record<string, { count: number; studentsById: any }> = {};
    let userQueue = null;

    if (allQueues) {
      allQueues.forEach(q => {
        const studentsById = q.studentsById || {};
        const studentList = Object.entries(studentsById).map(([id, v]: [string, any]) => ({
          id,
          type: v.type,
          joinedAtMs: v.joinedAt instanceof Timestamp 
            ? v.joinedAt.toMillis() 
            : (v.joinedAt?.seconds ? v.joinedAt.seconds * 1000 : 0)
        })).sort((a, b) => a.joinedAtMs - b.joinedAtMs);

        queueData[q.id] = { count: studentList.length, studentsById };

        if (user) {
          const myIndex = studentList.findIndex(s => s.id === user.uid);
          if (myIndex >= 0) {
            userQueue = {
              teacherId: q.id,
              position: myIndex + 1,
              queueLength: studentList.length,
              type: studentList[myIndex].type
            };
          }
        }
      });
    }

    return { queueData, userQueue };
  }, [allQueues, user?.uid]);

  return {
    allTeachers: allTeachers || [],
    queueData: processed.queueData,
    userQueue: processed.userQueue,
    isLoading: lTeachers || lQueues
  };
}
