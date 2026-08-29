import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { useUserProfile } from '@/hooks/use-user-profile';
import { QueueSystemScreen } from '@/components/screens/queue-system-screen';

export default function QueueSystemRoute() {
  const { user, loading } = useAuth();
  const { role, isLoading } = useUserProfile();

  if (loading || isLoading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;
  if (role !== 'student') return <Redirect href="/" />;

  return <QueueSystemScreen />;
}
