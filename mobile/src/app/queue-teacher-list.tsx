import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { useUserProfile } from '@/hooks/use-user-profile';
import { QueueTeacherListScreen } from '@/components/screens/queue-teacher-list-screen';

export default function QueueTeacherListRoute() {
  const { user, loading } = useAuth();
  const { role, isLoading } = useUserProfile();

  if (loading || isLoading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;
  if (role !== 'student') return <Redirect href="/" />;

  return <QueueTeacherListScreen />;
}
