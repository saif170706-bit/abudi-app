import React from 'react';
import { View, Text, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/use-auth';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useAnnouncementsFeed } from '@/hooks/use-announcements-feed';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const roleLabel: Record<string, string> = {
  admin: 'Administrator',
  teacher: 'Lærer',
  student: 'Elev',
};

export function DashboardScreen() {
  const { logout } = useAuth();
  const { profile, isLoading: isProfileLoading } = useUserProfile();
  const { feedItems, isLoading: isFeedLoading } = useAnnouncementsFeed();

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <FlatList
        className="flex-1 px-4"
        contentContainerClassName="gap-4 py-4"
        data={feedItems}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        refreshControl={<RefreshControl refreshing={false} onRefresh={() => {}} />}
        ListHeaderComponent={
          <View className="gap-4">
            <Card>
              {isProfileLoading ? (
                <ActivityIndicator />
              ) : (
                <>
                  <CardTitle>{profile?.displayName ?? 'Bruger'}</CardTitle>
                  <CardDescription>{profile?.email}</CardDescription>
                  {profile?.role && <Badge className="mt-3">{roleLabel[profile.role] ?? profile.role}</Badge>}
                </>
              )}
              <Button variant="outline" className="mt-4" onPress={logout}>
                Log Ud
              </Button>
            </Card>

            <Text className="text-lg font-semibold text-foreground">Opslag</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Card>
            <View className="mb-2 flex-row items-center gap-2">
              {item.isNew && <Badge>Nyt</Badge>}
              <Text className="text-xs uppercase text-muted-foreground">{item.type}</Text>
            </View>
            <CardTitle>{item.title}</CardTitle>
            {item.content ? <CardDescription>{item.content}</CardDescription> : null}
            {item.description ? <CardDescription>{item.description}</CardDescription> : null}
          </Card>
        )}
        ListEmptyComponent={
          isFeedLoading ? (
            <ActivityIndicator className="mt-8" />
          ) : (
            <Text className="mt-8 text-center text-muted-foreground">Ingen opslag endnu.</Text>
          )
        }
      />
    </SafeAreaView>
  );
}
