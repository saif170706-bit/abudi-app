import { useEffect, useRef, useState } from 'react';
import { streamClient } from '@/lib/stream-client';
import { fetchStreamToken } from '@/lib/stream-chat-actions';
import { useAuth } from './use-auth';
import { useUserProfile } from './use-user-profile';

/**
 * Connects the current user to Stream Chat in the background, mirroring the
 * web app's StreamUserProvider. Non-blocking — returns isConnected so screens
 * can show a loading state, but never delays rendering the rest of the app.
 */
export function useStreamChat() {
  const { user, loading: authLoading } = useAuth();
  const { profile } = useUserProfile();
  const [isConnected, setIsConnected] = useState(false);
  const connectingRef = useRef(false);

  const uid = user?.uid ?? null;

  useEffect(() => {
    if (authLoading || !uid || !user || !profile) {
      if (!uid && !authLoading && streamClient.userID) {
        streamClient.disconnectUser().catch(() => {});
        setIsConnected(false);
      }
      return;
    }

    if (streamClient.userID === uid) {
      setIsConnected(true);
      return;
    }

    if (connectingRef.current) return;
    connectingRef.current = true;

    (async () => {
      try {
        const idToken = await user.getIdToken();
        const streamToken = await fetchStreamToken(idToken);
        await streamClient.connectUser({ id: uid, name: profile.displayName, image: profile.photoURL || undefined }, streamToken);
        setIsConnected(true);
      } catch (error) {
        console.error('Stream connection failed:', error);
        setIsConnected(false);
      } finally {
        connectingRef.current = false;
      }
    })();
  }, [uid, user, profile, authLoading]);

  return { isConnected, client: streamClient };
}
