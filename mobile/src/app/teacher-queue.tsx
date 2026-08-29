import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { useUserProfile } from '@/hooks/use-user-profile';
import { TeacherQueueScreen } from '@/components/screens/teacher-queue-screen';

export default function TeacherQueueRoute() {
  const { user, loading } = useAuth();
  const { role, isLoading } = useUserProfile();

  if (loading || isLoading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;
  if (role !== 'teacher') return <Redirect href="/" />;

  return <TeacherQueueScreen />;
}
