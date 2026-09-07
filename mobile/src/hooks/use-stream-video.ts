import { useEffect, useRef, useState } from 'react';
import { getStreamVideoClient, fetchStreamVideoToken, disconnectStreamVideoClient } from '@/lib/stream-video-client';
import { useAuth } from './use-auth';
import { useUserProfile } from './use-user-profile';

/**
 * Connects to Stream Video on demand — unlike useStreamChat (connected
 * globally for badges/notifications), a video client is only created when a
 * call screen actually mounts, and disconnected when it unmounts, since it
 * touches native WebRTC. Mirrors the web app's StreamVideoProvider.
 */
export function useStreamVideo() {
  const { user, loading: authLoading } = useAuth();
  const { profile } = useUserProfile();
  const [client, setClient] = useState<ReturnType<typeof getStreamVideoClient> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const connectingRef = useRef(false);

  useEffect(() => {
    if (authLoading || !user || !profile || connectingRef.current) return;
    connectingRef.current = true;
    setError(null);

    try {
      const c = getStreamVideoClient(
        { id: user.uid, name: profile.displayName || undefined, image: profile.photoURL || undefined },
        () => user.getIdToken().then(fetchStreamVideoToken)
      );
      setClient(c);
    } catch (e: any) {
      console.error('[stream-video] Failed to create client:', e);
      setError(e?.message || 'Kunne ikke oprette forbindelse til opkaldet.');
    } finally {
      connectingRef.current = false;
    }

    return () => {
      disconnectStreamVideoClient().catch(() => {});
    };
  }, [authLoading, user, profile]);

  return { client, error };
}
