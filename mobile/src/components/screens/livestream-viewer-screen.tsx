import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  StreamCall,
  useCallStateHooks,
  type Call,
} from '@stream-io/video-react-native-sdk';
import { useFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useStreamVideo } from '@/hooks/use-stream-video';
import { useLanguagePreference } from '@/context/language-context';
import type { Livestream } from '@/shared/types';

/** Joins the "livestream" call as a silent viewer — camera/mic off, mirrors the web app's LivestreamViewSheet. */
function ViewerJoiner({ callId, children }: { callId: string; children: (call: Call) => React.ReactNode }) {
  const { client } = useStreamVideo();
  const [call, setCall] = useState<Call | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { tGlobal } = useLanguagePreference();

  useEffect(() => {
    if (!client) return;
    let cancelled = false;
    const c = client.call('livestream', callId);

    (async () => {
      try {
        await c.join({ create: false });
      } catch (e: any) {
        // Backstage / not-live-yet errors are expected while waiting for the host.
        if (e?.code !== 17 && !cancelled) {
          console.error('[livestream-viewer] join failed:', e);
          setError(e?.message || tGlobal('Kunne ikke deltage i mødet.'));
          return;
        }
      }
      if (!cancelled) setCall(c);
    })();

    return () => {
      cancelled = true;
      c.leave().catch(() => {});
    };
  }, [client, callId, tGlobal]);

  if (error) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#111214] p-6">
        <Ionicons name="alert-circle" size={48} color="#ef4444" />
        <Text className="mt-4 text-center text-lg font-bold text-white">{tGlobal('Kunne ikke deltage')}</Text>
        <Text className="mt-2 text-center text-sm text-white/40">{error}</Text>
        <Pressable onPress={() => router.back()} className="mt-6 rounded-2xl border border-white/20 px-6 py-3">
          <Text className="font-bold text-white">{tGlobal('Luk')}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!client || !call) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#111214]">
        <ActivityIndicator color="#fff" size="large" />
        <Text className="mt-4 text-sm font-bold uppercase tracking-widest text-white/40">{tGlobal('Deltager i møde...')}</Text>
      </SafeAreaView>
    );
  }

  return <StreamCall call={call}>{children(call)}</StreamCall>;
}

function ViewerContent({ livestream }: { livestream: Livestream }) {
  const { tGlobal } = useLanguagePreference();
  const { useParticipantCount, useIsCallLive, useParticipants } = useCallStateHooks();
  const participantCount = useParticipantCount();
  const isLive = useIsCallLive();
  const participants = useParticipants();

  const host = useMemo(
    () => participants.find((p) => p.userId === livestream.authorId) || participants[0] || null,
    [participants, livestream.authorId]
  );

  return (
    <SafeAreaView className="flex-1 bg-[#111214]" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between border-b border-white/5 bg-black/40 px-4 py-3">
        <View className="flex-row items-center gap-3">
          <View className={`flex-row items-center gap-2 rounded-full px-3 py-1 ${isLive ? 'bg-red-600' : 'bg-white/10'}`}>
            <Ionicons name="radio" size={12} color="#fff" />
            <Text className="text-[10px] font-black uppercase tracking-widest text-white">
              {isLive ? tGlobal('Live') : tGlobal('Venter')}
            </Text>
          </View>
          <View className="flex-row items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
            <Ionicons name="people" size={12} color="rgba(255,255,255,0.6)" />
            <Text className="text-[10px] font-bold uppercase tracking-widest text-white/60">{participantCount}</Text>
          </View>
        </View>
        <Pressable onPress={() => router.back()} className="h-9 w-9 items-center justify-center rounded-full">
          <Ionicons name="close" size={22} color="rgba(255,255,255,0.6)" />
        </Pressable>
      </View>

      <View className="flex-1 items-center justify-center bg-black">
        {isLive && host ? (
          <VideoParticipantView participant={host} />
        ) : (
          <View className="max-w-sm items-center gap-6 px-8">
            <View className="h-20 w-20 items-center justify-center rounded-[32px] bg-white/5">
              <Ionicons name="play" size={32} color="rgba(255,255,255,0.2)" />
            </View>
            <View className="items-center gap-2">
              <Text className="text-lg font-bold text-white">{tGlobal('Mødet er ikke startet')}</Text>
              <Text className="text-center text-sm text-white/40">
                {tGlobal('Læreren er ved at gøre klar. Bliv hængende, streamen starter automatisk så snart der er signal.')}
              </Text>
            </View>
            <View className="flex-row items-center gap-2 rounded-full border border-white/5 bg-white/5 px-4 py-2">
              <ActivityIndicator color="#197670" size="small" />
              <Text className="text-[10px] font-bold uppercase tracking-widest text-white/60">{tGlobal('Forbinder...')}</Text>
            </View>
          </View>
        )}
      </View>

      <View className="items-center gap-1 border-t border-white/5 bg-black px-6 py-4">
        <Text className="text-lg font-extrabold text-white" numberOfLines={1}>{livestream.title}</Text>
        <Text className="text-xs font-medium uppercase tracking-wider text-white/40">
          {tGlobal('Ibn Amer Instituttet')} • {tGlobal('Live Møde')}
        </Text>
      </View>
    </SafeAreaView>
  );
}

// Kept as a tiny wrapper so we can lazily require the video-rendering component —
// avoids pulling video track rendering into this file's import graph on first paint.
function VideoParticipantView({ participant }: { participant: any }) {
  const { ParticipantView } = require('@stream-io/video-react-native-sdk');
  return <ParticipantView participant={participant} style={{ flex: 1, width: '100%' }} />;
}

export function LivestreamViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { firestore } = useFirebase();
  const { loading: authLoading } = useAuth();
  const { isLoading: profileLoading } = useUserProfile();
  const [livestream, setLivestream] = useState<Livestream | null>(null);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(firestore, 'livestreams', id), (snap) => {
      if (!snap.exists()) {
        router.back();
        return;
      }
      const data = { id: snap.id, ...snap.data() } as Livestream;
      setLivestream(data);
      if (data.isActive === false) router.back();
    });
    return unsub;
  }, [firestore, id]);

  if (authLoading || profileLoading || !livestream) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#111214]">
        <ActivityIndicator color="#fff" size="large" />
      </SafeAreaView>
    );
  }

  return <ViewerJoiner callId={livestream.callId}>{() => <ViewerContent livestream={livestream} />}</ViewerJoiner>;
}
