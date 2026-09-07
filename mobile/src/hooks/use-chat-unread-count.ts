import { useEffect, useState } from 'react';
import type { Event as StreamEvent } from 'stream-chat';
import { streamClient } from '@/lib/stream-client';
import { useStreamChat } from './use-stream-chat';

/**
 * Total unread message count across all of the user's Stream Chat channels,
 * for the "Beskeder" tab badge. Safe to call from multiple components —
 * useStreamChat() is idempotent (no-ops if already connected as this user).
 */
export function useChatUnreadCount() {
  const { isConnected } = useStreamChat();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isConnected) return;
    // Once connected, streamClient.user is always the own (fuller) user
    // response — the field just isn't on the narrower shared union type.
    setCount((streamClient.user as { total_unread_count?: number } | undefined)?.total_unread_count ?? 0);

    const handler = (event: StreamEvent) => {
      if (typeof event.total_unread_count === 'number') setCount(event.total_unread_count);
    };
    streamClient.on(handler);
    return () => {
      streamClient.off(handler);
    };
  }, [isConnected]);

  return count;
}
