import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { useUserProfile } from '@/hooks/use-user-profile';

export default function Index() {
  const { user } = useAuth();
  const { role, isLoading } = useUserProfile();

  if (!user) return <Redirect href="/(auth)/login" />;

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  if (!role) return <Redirect href="/(auth)/login" />;

  return <Redirect href={`/(${role})/dashboard`} />;
}
