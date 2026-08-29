import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { useUserProfile } from '@/hooks/use-user-profile';
import { AdminWaitingListScreen } from '@/components/screens/admin-waiting-list-screen';

export default function AdminWaitingListRoute() {
  const { user, loading } = useAuth();
  const { role, isLoading } = useUserProfile();

  if (loading || isLoading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;
  if (role !== 'admin') return <Redirect href="/" />;

  return <AdminWaitingListScreen />;
}
