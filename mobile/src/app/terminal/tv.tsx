import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { useUserProfile } from '@/hooks/use-user-profile';
import { TerminalTvScreen } from '@/components/screens/terminal-tv-screen';

export default function TerminalTvRoute() {
  const { user, loading } = useAuth();
  const { role, isLoading } = useUserProfile();

  if (loading || isLoading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;
  if (role !== 'admin') return <Redirect href="/" />;

  return <TerminalTvScreen />;
}
