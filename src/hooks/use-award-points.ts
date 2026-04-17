'use client';

import { doc, setDoc, increment, serverTimestamp } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useCallback } from 'react';

// Points per grade as per the Confidential Development Report
const GRADE_POINTS: Record<string, number> = {
  Perfekt: 10,
  'Meget godt': 7,
  Godt: 4,
  'Ikke læst': 0,
};

/**
 * Awards points to a student in the leaderboard collection
 * when their assignment is graded.
 * 
 * Called from AssignmentForm when saving a grade.
 * Written with idempotency in mind — safe to call multiple times
 * (the delta is the actual award, not an absolute set).
 */
export function useAwardPoints() {
  const { firestore } = useFirebase();

  const awardPoints = useCallback(
    async ({
      studentId,
      studentName,
      photoURL,
      gradeHifz,
      gradeMurajara,
      previousGradeHifz,
      previousGradeMurajara,
    }: {
      studentId: string;
      studentName: string;
      photoURL?: string | null;
      gradeHifz?: string | null;
      gradeMurajara?: string | null;
      previousGradeHifz?: string | null;
      previousGradeMurajara?: string | null;
    }) => {
      if (!firestore) return;

      // Calculate delta (new points minus previously awarded points)
      const prevHifzPts = GRADE_POINTS[previousGradeHifz || ''] ?? 0;
      const prevMurajaraPts = GRADE_POINTS[previousGradeMurajara || ''] ?? 0;
      const newHifzPts = GRADE_POINTS[gradeHifz || ''] ?? 0;
      const newMurajaraPts = GRADE_POINTS[gradeMurajara || ''] ?? 0;

      const delta = (newHifzPts + newMurajaraPts) - (prevHifzPts + prevMurajaraPts);

      if (delta === 0) return; // No change, skip write

      const isPerfectHifz = gradeHifz === 'Perfekt';
      const isPerfectMurajara = gradeMurajara === 'Perfekt';
      const perfectDelta =
        (isPerfectHifz ? 1 : 0) +
        (isPerfectMurajara ? 1 : 0) -
        (previousGradeHifz === 'Perfekt' ? 1 : 0) -
        (previousGradeMurajara === 'Perfekt' ? 1 : 0);

      try {
        const boardRef = doc(firestore, 'leaderboard', studentId);
        await setDoc(
          boardRef,
          {
            displayName: studentName,
            photoURL: photoURL || null,
            totalPoints: increment(delta),
            weeklyPoints: increment(delta),
            perfectCount: increment(perfectDelta),
            lastUpdated: serverTimestamp(),
          },
          { merge: true } // Create if doesn't exist, update if it does
        );
      } catch (e) {
        // Never block the teacher's flow
        console.error('[awardPoints] Failed to update leaderboard:', e);
      }
    },
    [firestore]
  );

  return { awardPoints };
}
