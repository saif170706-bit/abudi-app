import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/use-auth';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useLanguagePreference } from '@/context/language-context';
import { useUnreadMailCount } from '@/hooks/use-unread-mail-count';

function TabIcon(name: keyof typeof Ionicons.glyphMap) {
  return ({ color, size }: { color: string; size: number }) => <Ionicons name={name} size={size} color={color} />;
}

export default function AdminLayout() {
  const { user, loading } = useAuth();
  const { role, isLoading } = useUserProfile();
  const { tGlobal } = useLanguagePreference();
  const unreadMailCount = useUnreadMailCount();

  if (loading || isLoading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;
  if (role && role !== 'admin') return <Redirect href={`/(${role})/dashboard`} />;

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="members" options={{ title: tGlobal('Medlemmer'), tabBarIcon: TabIcon('people-outline') }} />
      <Tabs.Screen name="absence" options={{ title: tGlobal('Fravær'), tabBarIcon: TabIcon('time-outline') }} />
      <Tabs.Screen name="home" options={{ title: tGlobal('Hjem'), tabBarIcon: TabIcon('home') }} />
      <Tabs.Screen
        name="announcements"
        options={{ title: tGlobal('Opslag'), tabBarIcon: TabIcon('add-circle-outline') }}
      />
      <Tabs.Screen
        name="mail"
        options={{ title: tGlobal('Mail'), tabBarIcon: TabIcon('mail-outline'), tabBarBadge: unreadMailCount > 0 ? unreadMailCount : undefined }}
      />

      {/* Reachable, but not shown in the tab bar */}
      <Tabs.Screen name="dashboard" options={{ href: null }} />
      <Tabs.Screen name="quran" options={{ href: null }} />
    </Tabs>
  );
}
