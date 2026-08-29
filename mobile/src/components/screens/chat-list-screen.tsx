import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, Redirect } from 'expo-router';
import { OverlayProvider, Chat, ChannelList } from 'stream-chat-expo';
import type { ChannelSort } from 'stream-chat';
import { streamClient } from '@/lib/stream-client';
import { useStreamChat } from '@/hooks/use-stream-chat';
import { useAuth } from '@/hooks/use-auth';
import { useUserProfile } from '@/hooks/use-user-profile';

const sort: ChannelSort = { last_message_at: -1 };
const options = { limit: 20, presence: true, state: true, watch: true };

export function ChatListScreen() {
  const { user, loading } = useAuth();
  const { isLoading: profileLoading } = useUserProfile();
  const { isConnected } = useStreamChat();

  if (loading || profileLoading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;

  const filters = { members: { $in: [user.uid] }, type: { $in: ['messaging', 'team'] } };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center justify-between px-6 pb-4 pt-4">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            className="h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card shadow-sm"
          >
            <Ionicons name="chevron-back" size={20} color="#197670" />
          </Pressable>
          <Text className="text-2xl font-bold text-foreground">Beskeder</Text>
        </View>
        <Pressable
          onPress={() => router.push('/chat/new' as any)}
          className="h-11 w-11 items-center justify-center rounded-2xl bg-primary shadow-sm"
        >
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      {!isConnected ? (
        <ActivityIndicator className="mt-10" />
      ) : (
        <OverlayProvider>
          <Chat client={streamClient}>
            <ChannelList
              filters={filters}
              sort={sort}
              options={options}
              onSelect={(channel) => router.push(`/chat/${encodeURIComponent(channel.cid)}` as any)}
            />
          </Chat>
        </OverlayProvider>
      )}
    </SafeAreaView>
  );
}
