import { Tabs } from 'expo-router';
import { Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/use-auth';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useLanguagePreference } from '@/context/language-context';
import { useAnnouncementsFeed } from '@/hooks/use-announcements-feed';
import { useChatUnreadCount } from '@/hooks/use-chat-unread-count';

function TabIcon(name: keyof typeof Ionicons.glyphMap) {
  return ({ color, size }: { color: string; size: number }) => <Ionicons name={name} size={size} color={color} />;
}

export default function StudentLayout() {
  const { user, loading } = useAuth();
  const { role, isLoading } = useUserProfile();
  const { tGlobal } = useLanguagePreference();
  const { feedItems } = useAnnouncementsFeed();
  const newPostsCount = feedItems.filter((i: any) => i.isNew).length;
  const unreadChatCount = useChatUnreadCount();

  if (loading || isLoading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;
  if (role && role !== 'student') return <Redirect href={`/(${role})/dashboard`} />;

  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen
        name="opslag"
        options={{ title: tGlobal('Opslag'), tabBarIcon: TabIcon('list-outline'), tabBarBadge: newPostsCount > 0 ? newPostsCount : undefined }}
      />
      <Tabs.Screen name="quran" options={{ title: tGlobal('Quran'), tabBarIcon: TabIcon('book-outline') }} />
      <Tabs.Screen name="dashboard" options={{ title: tGlobal('Hjem'), tabBarIcon: TabIcon('home') }} />
      <Tabs.Screen
        name="beskeder"
        options={{ title: tGlobal('Beskeder'), tabBarIcon: TabIcon('chatbubble-outline'), tabBarBadge: unreadChatCount > 0 ? unreadChatCount : undefined }}
      />
      <Tabs.Screen name="mere" options={{ title: tGlobal('Mere'), tabBarIcon: TabIcon('grid-outline') }} />

      {/* Reachable, but not shown in the tab bar */}
      <Tabs.Screen name="homework" options={{ href: null }} />
    </Tabs>
  );
}
