import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { useUserProfile } from '@/hooks/use-user-profile';
import { ProgressJourneyScreen } from '@/components/screens/progress-journey-screen';

export default function ProgressJourneyRoute() {
  const { user, loading } = useAuth();
  const { role, isLoading } = useUserProfile();

  if (loading || isLoading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;
  if (role !== 'student') return <Redirect href="/" />;

  return <ProgressJourneyScreen />;
}
