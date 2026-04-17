'use client';

import { useCallback } from "react";
import { useChatContext } from "stream-chat-react";
import { useUnread } from "@/context/UnreadContext";

/**
 * Hook til at synkronisere antallet af ulæste beskeder direkte med Stream-serveren.
 * Dette er kilden til sandhed for MessageBadge.
 */
export function useUnreadSync() {
  const { client } = useChatContext();
  const { setTotalUnread } = useUnread();

  return useCallback(async () => {
    // SIKRING: Kald kun hvis klienten er fuldt initialiserer og forbundet
    if (!client || !client.userID) return;

    try {
      const res: any = await (client as any).getUnreadCount?.();
      
      const unreadCount = (typeof res?.total_unread_count === "number") 
        ? res.total_unread_count 
        : Number(client.user?.total_unread_count ?? 0);

      setTotalUnread(unreadCount);
    } catch (e) {
      // Stay on current value in case of network failures
    }
  }, [client, setTotalUnread]);
}
