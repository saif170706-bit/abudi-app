import { Tabs } from 'expo-router';
import { Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/use-auth';
import { useUserProfile } from '@/hooks/use-user-profile';

function TabIcon(name: keyof typeof Ionicons.glyphMap) {
  return ({ color, size }: { color: string; size: number }) => <Ionicons name={name} size={size} color={color} />;
}

export default function StudentLayout() {
  const { user, loading } = useAuth();
  const { role, isLoading } = useUserProfile();

  if (loading || isLoading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;
  if (role && role !== 'student') return <Redirect href={`/(${role})/dashboard`} />;

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="opslag" options={{ title: 'Opslag', tabBarIcon: TabIcon('list-outline') }} />
      <Tabs.Screen name="quran" options={{ title: 'Koran', tabBarIcon: TabIcon('book-outline') }} />
      <Tabs.Screen name="dashboard" options={{ title: 'Hjem', tabBarIcon: TabIcon('home') }} />
      <Tabs.Screen name="beskeder" options={{ title: 'Beskeder', tabBarIcon: TabIcon('chatbubble-outline') }} />
      <Tabs.Screen name="mere" options={{ title: 'Mere', tabBarIcon: TabIcon('grid-outline') }} />

      {/* Reachable, but not shown in the tab bar */}
      <Tabs.Screen name="homework" options={{ href: null }} />
    </Tabs>
  );
}
