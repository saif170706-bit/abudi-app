'use client';

import { useEffect, useRef } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { useView } from '@/context/ViewContext';
import { getQuranProgress } from '@/hooks/use-quran-progress';
import { streamClient } from '@/lib/streamClient';
import { useChatContext } from 'stream-chat-react';

/**
 * Global preloader to ensure dashboard data (Quran progress, Chat channels)
 * is ready as soon as the user lands, eliminating jarring "pops" and loaders.
 */
export function useDashboardPreloader() {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { savedQuranPage, setSavedQuranPage } = useView();
  const isPreloadingRef = useRef(false);

  // 1. Preload Quran Progress
  useEffect(() => {
    if (!user || !firestore || savedQuranPage !== null || isPreloadingRef.current) return;

    const uid = user.uid;
    async function preloadQuran() {
      isPreloadingRef.current = true;
      try {
        const page = await getQuranProgress(firestore, uid);
        if (page) setSavedQuranPage(page);
      } catch (e) {
        console.error("Failed to preload Quran progress:", e);
      } finally {
        isPreloadingRef.current = false;
      }
    }

    preloadQuran();
  }, [user, firestore, savedQuranPage, setSavedQuranPage]);

  // 2. Preload Stream Chat Channels
  // This populates the internal cache of the Stream client so ChatView displays instantly.
  useEffect(() => {
    if (!user || !user.uid) return;
    const uid = user.uid;
    const preloadChat = async () => {
      try {
        // Query channels with state:true to populate messages and channel state in background
        await streamClient.queryChannels(
          { members: { $in: [uid] }, type: { $in: ['messaging', 'team'] } },
          { last_message_at: -1 },
          { limit: 5, presence: true, state: true, watch: true } 
        );
      } catch (err) {
        // Silent background fail
      }
    };

    preloadChat();
  }, [user?.uid]);
}
