'use client';

import { useMemo } from 'react';
import { useCollection, useFirebase, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import type { Announcement, UserAnnouncement, Event, Survey, Livestream } from '@/types';
import { useUserProfile } from '@/hooks/use-user-profile';

export function useAnnouncementsFeed() {
  const { user: authUser } = useUser();
  const { profile: user } = useUserProfile();
  const { firestore } = useFirebase();

  const currentUid = authUser?.uid || user?.id;

  const annQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'announcements'), orderBy('createdAt', 'desc'), limit(50)) : null),
    [firestore]
  );
  
  const evtQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'events'), orderBy('createdAt', 'desc'), limit(50)) : null),
    [firestore]
  );

  const surveyQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'surveys'), orderBy('createdAt', 'desc'), limit(30)) : null),
    [firestore]
  );

  const streamQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'livestreams'), orderBy('createdAt', 'desc'), limit(20)) : null),
    [firestore]
  );

  const readQuery = useMemoFirebase(
    () => (currentUid && firestore ? collection(firestore, 'users', currentUid, 'announcements') : null),
    [currentUid, firestore]
  );

  const { data: rawAnn, isLoading: lAnn } = useCollection<Announcement>(annQuery);
  const { data: rawEvt, isLoading: lEvt } = useCollection<Event>(evtQuery);
  const { data: rawSurvey, isLoading: lSurvey } = useCollection<Survey>(surveyQuery);
  const { data: rawStream, isLoading: lStream } = useCollection<Livestream>(streamQuery);
  const { data: rawRead, isLoading: lRead } = useCollection<UserAnnouncement>(readQuery);

  const filteredFeed = useMemo(() => {
    if (!user || (!rawAnn && !rawEvt && !rawSurvey && !rawStream)) return [];

    const readIds = new Set(rawRead?.map((ua: any) => ua.id) ?? []);
    const now = new Date();

    const filterItem = (item: any) => {
      // 1. Check if expired (Surveys & Events)
      if (item.deadline?.toDate) {
        if (item.deadline.toDate() < now && user.role !== 'admin') return false;
      }

      // 2. Role based filtering
      if (user.role === 'admin') return true;
      
      // 3. Targeted audience
      if (item.specificRecipients && item.specificRecipients.length > 0) {
        return item.specificRecipients.includes(user.id);
      }

      const target = item.targetAudience || 'all';
      let audienceMatch = false;
      if (target === 'all') audienceMatch = true;
      else if (user.role === 'teacher' && target === 'teachers') audienceMatch = true;
      else if (user.role === 'student' && target === 'students') audienceMatch = true;
      else if (target === 'man' && user.gender === 'man') audienceMatch = true;
      else if (target === 'woman' && user.gender === 'woman') audienceMatch = true;

      if (!audienceMatch) return false;

      const targetGender = item.targetGender || 'all';
      if (targetGender === 'all') return true;
      return user.gender === targetGender;
    };

    const announcements = (rawAnn || []).filter(filterItem).map((ann: any) => ({ ...ann, type: 'announcement' as const }));
    const events = (rawEvt || []).filter(filterItem).map((evt: any) => ({ ...evt, type: 'event' as const }));
    const surveys = (rawSurvey || []).filter(item => item.active !== false).filter(filterItem).map((s: any) => ({ ...s, type: 'survey' as const }));
    const streams = (rawStream || []).filter(filterItem).map((s: any) => ({ ...s, type: 'livestream' as const }));

    const userCreatedAt = authUser?.metadata?.creationTime 
      ? new Date(authUser.metadata.creationTime).getTime() 
      : 0;

    return [...announcements, ...events, ...surveys, ...streams]
      .map(item => {
        const itemCreatedAt = item.createdAt?.toMillis?.() || 0;
        const isRead = readIds.has(item.id);
        
        // It's new only if it's NOT read AND it was created AFTER the user signed up
        // (We allow a small buffer of 1 hour to account for potential timezone/clock drift)
        const isNew = !isRead && (itemCreatedAt > (userCreatedAt - 3600000));
        
        return { ...item, isNew };
      })
      .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  }, [rawAnn, rawEvt, rawSurvey, rawStream, rawRead, user]);

  return {
    feedItems: filteredFeed,
    allAnnouncements: rawAnn,
    allEvents: rawEvt,
    allSurveys: rawSurvey,
    allStreams: rawStream,
    readStatuses: rawRead,
    isLoading: lAnn || lEvt || lSurvey || lStream || lRead,
  };
}
