import { useLocalSearchParams } from 'expo-router';
import { StudentAssignmentsScreen } from '@/components/screens/student-assignments-screen';

export default function StudentDetailRoute() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>();
  return <StudentAssignmentsScreen studentId={studentId} />;
}
