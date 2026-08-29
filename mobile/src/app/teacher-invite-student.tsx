import { View, Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Redirect } from 'expo-router';
import { useAuth } from '@/hooks/use-auth';
import { useUserProfile } from '@/hooks/use-user-profile';
import { InviteUserForm } from '@/components/screens/invite-user-form';

export default function TeacherInviteStudentRoute() {
  const { user, loading } = useAuth();
  const { role, isLoading } = useUserProfile();

  if (loading || isLoading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;
  if (role !== 'teacher') return <Redirect href="/" />;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center gap-4 px-6 pt-4">
        <Pressable
          onPress={() => router.back()}
          className="h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card shadow-sm"
        >
          <Ionicons name="chevron-back" size={22} color="#197670" />
        </Pressable>
        <Text className="text-2xl font-bold text-foreground">Tilføj elev</Text>
      </View>
      <View className="p-6">
        <InviteUserForm />
      </View>
    </SafeAreaView>
  );
}
