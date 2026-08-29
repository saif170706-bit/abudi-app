import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { useUserProfile } from '@/hooks/use-user-profile';
import { LeaderboardScreen } from '@/components/screens/leaderboard-screen';

export default function LeaderboardRoute() {
  const { user, loading } = useAuth();
  const { role, isLoading } = useUserProfile();

  if (loading || isLoading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;
  if (role !== 'student') return <Redirect href="/" />;

  return <LeaderboardScreen />;
}
