import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { useUserProfile } from '@/hooks/use-user-profile';
import { QueueWaitingScreen } from '@/components/screens/queue-waiting-screen';

export default function QueueWaitingRoute() {
  const { user, loading } = useAuth();
  const { role, isLoading } = useUserProfile();

  if (loading || isLoading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;
  if (role !== 'student') return <Redirect href="/" />;

  return <QueueWaitingScreen />;
}
