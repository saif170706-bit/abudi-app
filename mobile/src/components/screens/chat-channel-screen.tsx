import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, Redirect } from 'expo-router';
import { OverlayProvider, Chat, Channel, MessageList, MessageComposer } from 'stream-chat-expo';
import type { Channel as StreamChannel } from 'stream-chat';
import { streamClient } from '@/lib/stream-client';
import { useStreamChat } from '@/hooks/use-stream-chat';
import { useAuth } from '@/hooks/use-auth';
import { useLanguagePreference } from '@/context/language-context';

export function ChatChannelScreen() {
  const { cid } = useLocalSearchParams<{ cid: string }>();
  const { user, loading } = useAuth();
  const { isConnected } = useStreamChat();
  const { tGlobal } = useLanguagePreference();
  const [channel, setChannel] = useState<StreamChannel | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!isConnected || !cid) return;
    const decoded = decodeURIComponent(cid);
    const [type, id] = decoded.split(':');
    if (!type || !id) {
      setError(true);
      return;
    }
    const ch = streamClient.channel(type, id);
    ch.watch()
      .then(() => setChannel(ch))
      .catch(() => setError(true));
  }, [isConnected, cid]);

  if (loading) return null;
  if (!user) return <Redirect href="/(auth)/login" />;

  const title = channel
    ? (channel.data as any)?.name ||
      Object.values(channel.state.members)
        .filter((m) => m.user?.id !== user.uid)
        .map((m) => m.user?.name)
        .join(', ') ||
      tGlobal('Samtale')
    : tGlobal('Samtale');

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center gap-3 border-b border-border px-4 py-3">
        <Pressable onPress={() => router.back()} className="p-1">
          <Ionicons name="chevron-back" size={22} color="#197670" />
        </Pressable>
        <Text numberOfLines={1} className="flex-1 text-base font-bold text-foreground">
          {title}
        </Text>
      </View>

      {!isConnected || (!channel && !error) ? (
        <ActivityIndicator className="mt-10" />
      ) : error || !channel ? (
        <Text className="mt-10 text-center text-muted-foreground">{tGlobal('Kunne ikke åbne samtalen.')}</Text>
      ) : (
        <OverlayProvider>
          <Chat client={streamClient}>
            <Channel channel={channel}>
              <MessageList />
              <MessageComposer />
            </Channel>
          </Chat>
        </OverlayProvider>
      )}
    </SafeAreaView>
  );
}
