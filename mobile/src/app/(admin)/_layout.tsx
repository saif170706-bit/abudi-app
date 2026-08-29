import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/use-auth';
import { useUserProfile } from '@/hooks/use-user-profile';

function TabIcon(name: keyof typeof Ionicons.glyphMap) {
  return ({ color, size }: { color: string; size: number }) => <Ionicons name={name} size={size} color={color} />;
}

export default function AdminLayout() {
  const { user, loading } = useAuth();
  const { role, isLoading } = useUserProfile();

  if (loading || isLoading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;
  if (role && role !== 'admin') return <Redirect href={`/(${role})/dashboard`} />;

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="members" options={{ title: 'Medlemmer', tabBarIcon: TabIcon('people-outline') }} />
      <Tabs.Screen name="absence" options={{ title: 'Fravær', tabBarIcon: TabIcon('time-outline') }} />
      <Tabs.Screen name="home" options={{ title: 'Hjem', tabBarIcon: TabIcon('home') }} />
      <Tabs.Screen
        name="announcements"
        options={{ title: 'Opslag', tabBarIcon: TabIcon('add-circle-outline') }}
      />
      <Tabs.Screen name="mail" options={{ title: 'Mail', tabBarIcon: TabIcon('mail-outline') }} />

      {/* Reachable, but not shown in the tab bar */}
      <Tabs.Screen name="dashboard" options={{ href: null }} />
      <Tabs.Screen name="quran" options={{ href: null }} />
    </Tabs>
  );
}
