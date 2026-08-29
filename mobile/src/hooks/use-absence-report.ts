import { useMemo } from 'react';
import { useFirebase } from '@/firebase';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import useSWR from 'swr';
import { useMembersData } from './use-members-data';

/** 0 = this week, 1 = last week, etc. */
function getWeekBoundaries(offsetWeeks = 0) {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);

  const start = new Date(now.setDate(diff - offsetWeeks * 7));
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

type StudentStatus = {
  attended: boolean;
  lastGraded?: any;
  absenceNote?: { text: string; startDate: any; endDate: any };
};

export function useAbsenceReport() {
  const { firestore } = useFirebase();
  const { members } = useMembersData();

  const students = useMemo(() => members.filter((m) => m.role === 'student' && m.status === 'Tilmeldt'), [members]);

  const fetcher = async () => {
    if (students.length === 0) return null;

    const periods = [0, 1] as const;
    const reportData: Record<number, Record<string, StudentStatus>> = {};

    for (const period of periods) {
      const { start, end } = getWeekBoundaries(period);
      const statusMap: Record<string, StudentStatus> = {};

      await Promise.all(
        students.map(async (student) => {
          const studentRef = collection(firestore, 'students', student.uid, 'assignments');
          const notesRef = collection(firestore, 'students', student.uid, 'absenceNotes');

          const qAttendance = query(
            studentRef,
            where('assignedAt', '>=', Timestamp.fromDate(start)),
            where('assignedAt', '<=', Timestamp.fromDate(end)),
            orderBy('assignedAt', 'desc')
          );

          try {
            const [attendSnap, notesSnap] = await Promise.all([getDocs(qAttendance), getDocs(query(notesRef))]);

            const attended = !attendSnap.empty;
            const allNotes = notesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
            const studentReports = allNotes.filter((n: any) => n.type === 'student_report');

            const activeNote = studentReports.find((n: any) => {
              try {
                if (!n.startDate || !n.endDate) return false;
                const nStart = n.startDate.toDate ? n.startDate.toDate() : new Date(n.startDate);
                const nEnd = n.endDate.toDate ? n.endDate.toDate() : new Date(n.endDate);
                return nStart <= end && nEnd >= start;
              } catch {
                return false;
              }
            });

            statusMap[student.uid] = {
              attended,
              lastGraded: attended ? attendSnap.docs[0].data().assignedAt : undefined,
              absenceNote: activeNote
                ? { text: (activeNote as any).text, startDate: (activeNote as any).startDate, endDate: (activeNote as any).endDate }
                : undefined,
            };
          } catch {
            statusMap[student.uid] = { attended: false };
          }
        })
      );

      reportData[period] = statusMap;
    }

    return reportData;
  };

  const { data, isValidating, mutate } = useSWR(
    firestore && students.length > 0 ? ['absence_report_v1', students.length] : null,
    fetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: true, dedupingInterval: 300000 }
  );

  return {
    reportData: data,
    students,
    isLoading: !data && isValidating,
    isRefreshing: isValidating,
    mutate,
  };
}
