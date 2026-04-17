'use client';

import { ReactNode, useEffect, useState, useRef } from "react";
import { Chat } from "stream-chat-react";
import { streamClient } from "@/lib/streamClient";
import "stream-chat-react/dist/css/v2/index.css";

import { useUser } from "@/firebase";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useTheme } from "next-themes";

/**
 * StreamUserProvider — NON-BLOCKING
 *
 * Renders children immediately regardless of Stream Chat connection state.
 * Stream connects in the background after auth + profile are available.
 * This eliminates the largest source of startup latency.
 */
export default function StreamUserProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useUser();
  const { profile } = useUserProfile();
  const [isConnected, setIsConnected] = useState(false);
  const { resolvedTheme } = useTheme();
  const connectingRef = useRef(false);

  const uid = user?.uid ?? null;

  useEffect(() => {
    if (authLoading || !uid || !user || !profile) {
      // If logged out, disconnect cleanly
      if (!uid && !authLoading && streamClient.userID) {
        streamClient.disconnectUser().catch(() => {});
        setIsConnected(false);
      }
      return;
    }

    // Already connected as the right user
    if (streamClient.userID === uid) {
      setIsConnected(true);
      return;
    }

    // Prevent concurrent connection attempts
    if (connectingRef.current) return;
    connectingRef.current = true;

    const connect = async () => {
      try {
        const idToken = await user.getIdToken();
        const res = await fetch("/api/stream/token", {
          method: "POST",
          headers: { Authorization: `Bearer ${idToken}` },
        });

        if (!res.ok) throw new Error("Stream token fetch failed");

        const { token: streamToken } = await res.json();

        await streamClient.connectUser(
          { id: uid, name: profile.displayName, image: profile.photoURL || undefined },
          streamToken
        );

        setIsConnected(true);
      } catch (e: any) {
        console.error("Stream connection failed:", e.message);
        // Still mark as "attempted" so we don't retry loop endlessly
        setIsConnected(true);
      } finally {
        connectingRef.current = false;
      }
    };

    connect();
  }, [uid, user, profile, authLoading]);

  // ✅ ALWAYS render children — Stream connects in the background
  // The <Chat> wrapper is only needed when the client is ready (for ChatView)
  // Other pages work fine without it
  return (
    <Chat
      client={streamClient}
      theme={resolvedTheme === 'dark' ? 'str-chat__theme-dark' : 'str-chat__theme-light'}
    >
      {children}
    </Chat>
  );
}