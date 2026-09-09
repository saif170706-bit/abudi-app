import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import {
  StreamCall,
  useCallStateHooks,
  useCall,
  type Call,
} from '@stream-io/video-react-native-sdk';
import { useFirebase } from '@/firebase';
import { useStreamVideo } from '@/hooks/use-stream-video';
import { sendPostNotifications } from '@/lib/send-post-notifications';
import { useLanguagePreference } from '@/context/language-context';
import type { Livestream } from '@/shared/types';

/** Joins/creates the "livestream" call with camera+mic on — mirrors the web app's LivestreamBroadcastSheet init. */
function BroadcastJoiner({ callId, children }: { callId: string; children: (call: Call) => React.ReactNode }) {
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
        await c.camera.enable().catch(() => {});
        await new Promise((r) => setTimeout(r, 500));
        await c.microphone.enable().catch(() => {});
        await c.join({ create: true });
        if (!cancelled) setCall(c);
      } catch (e: any) {
        if (!cancelled) {
          console.error('[livestream-broadcast] join failed:', e);
          setError(e?.message || tGlobal('Kunne ikke starte mødet.'));
        }
      }
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
        <Text className="mt-4 text-center text-lg font-bold text-white">{tGlobal('Kunne ikke starte studio')}</Text>
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
        <Text className="mt-4 text-sm font-bold uppercase tracking-widest text-white/40">{tGlobal('Forbereder...')}</Text>
      </SafeAreaView>
    );
  }

  return <StreamCall call={call}>{children(call)}</StreamCall>;
}

function BroadcastContent({ livestream }: { livestream: Livestream }) {
  const { firestore } = useFirebase();
  const { tGlobal } = useLanguagePreference();
  const call = useCall();
  const { useCameraState, useMicrophoneState, useParticipantCount, useIsCallLive, useLocalParticipant } =
    useCallStateHooks();
  const { camera, isEnabled: isCamEnabled } = useCameraState();
  const { microphone, isEnabled: isMicEnabled } = useMicrophoneState();
  const participantCount = useParticipantCount();
  const isLive = useIsCallLive();
  const localParticipant = useLocalParticipant();
  const [isUpdating, setIsUpdating] = useState(false);
  const deviceOpRef = useRef<Promise<void>>(Promise.resolve());

  const queueDeviceOp = (fn: () => Promise<void>) => {
    deviceOpRef.current = deviceOpRef.current.then(fn).catch((err) => console.error('Device op failed:', err));
  };

  useEffect(() => {
    if (!firestore || !livestream.id) return;
    updateDoc(doc(firestore, 'livestreams', livestream.id), { isActive: isLive }).catch(() => {});
  }, [isLive, firestore, livestream.id]);

  const handleToggleLive = async () => {
    if (!call || !firestore) return;
    setIsUpdating(true);
    try {
      if (isLive) {
        await call.stopRecording().catch(() => {});
        await updateDoc(doc(firestore, 'livestreams', livestream.id), { isActive: false }).catch(() => {});
        await call.stopLive().catch(() => {});
        Alert.alert(tGlobal('Mødet er afsluttet'), tGlobal('Optagelsen kan udgives fra webappen.'));
        router.back();
      } else {
        await call.goLive();
        await new Promise((r) => setTimeout(r, 1000));
        await call.startRecording().catch(() => {});
        sendPostNotifications({
          targetAudience: livestream.targetAudience || 'all',
          targetGender: livestream.targetGender || 'all',
          specificRecipients: livestream.specificRecipients || [],
          type: 'livestream_start',
          title: livestream.title,
        }).catch((err) => console.warn('[livestream-broadcast] Start notification failed (non-fatal):', err));
      }
    } catch (e) {
      console.error('Failed to toggle live state:', e);
      Alert.alert(tGlobal('Fejl'), tGlobal('Kunne ikke starte mødet.'));
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#111214]" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between border-b border-white/5 bg-black/40 px-4 py-3">
        <View className="flex-row items-center gap-3">
          <View className={`flex-row items-center gap-2 rounded-full px-3 py-1 ${isLive ? 'bg-red-600' : 'bg-white/10'}`}>
            <Ionicons name="radio" size={12} color="#fff" />
            <Text className="text-[10px] font-black uppercase tracking-widest text-white">
              {isLive ? tGlobal('Live') : tGlobal('Studio')}
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
        {localParticipant && isCamEnabled ? (
          <VideoParticipantView participant={localParticipant} />
        ) : localParticipant ? (
          <View className="items-center gap-3">
            <Ionicons name="videocam-off" size={40} color="rgba(255,255,255,0.2)" />
            <Text className="text-sm font-bold uppercase tracking-widest text-white/40">{tGlobal('Kamera er slået fra')}</Text>
          </View>
        ) : (
          <ActivityIndicator color="rgba(255,255,255,0.2)" size="large" />
        )}
        {isCamEnabled && localParticipant && (
          <Pressable
            onPress={() => queueDeviceOp(() => camera.flip())}
            className="absolute bottom-6 left-6 h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-black/40"
          >
            <Ionicons name="camera-reverse" size={22} color="rgba(255,255,255,0.8)" />
          </Pressable>
        )}
      </View>

      <View className="items-center gap-6 border-t border-white/5 bg-black px-6 py-6">
        <View className="items-center">
          <Text className="text-lg font-bold text-white" numberOfLines={1}>{livestream.title}</Text>
          <Text className="text-xs font-medium uppercase tracking-wider text-white/40">{tGlobal('Ibn Amer Studio')}</Text>
        </View>
        <View className="flex-row items-center gap-6">
          <Pressable
            onPress={() => queueDeviceOp(() => camera.toggle())}
            style={{ backgroundColor: isCamEnabled ? 'rgba(255,255,255,0.1)' : 'rgba(239,68,68,0.2)' }}
            className="h-14 w-14 items-center justify-center rounded-full border border-white/5"
          >
            <Ionicons name={isCamEnabled ? 'videocam' : 'videocam-off'} size={22} color={isCamEnabled ? '#fff' : '#ef4444'} />
          </Pressable>
          <Pressable
            onPress={handleToggleLive}
            disabled={isUpdating}
            className={`h-16 items-center justify-center rounded-3xl px-8 shadow-2xl ${isLive ? 'bg-red-600' : 'bg-primary'}`}
          >
            {isUpdating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-base font-extrabold text-white">{isLive ? tGlobal('Afslut Møde') : tGlobal('Start Møde')}</Text>
            )}
          </Pressable>
          <Pressable
            onPress={() => queueDeviceOp(() => microphone.toggle())}
            style={{ backgroundColor: isMicEnabled ? 'rgba(255,255,255,0.1)' : 'rgba(239,68,68,0.2)' }}
            className="h-14 w-14 items-center justify-center rounded-full border border-white/5"
          >
            <Ionicons name={isMicEnabled ? 'mic' : 'mic-off'} size={22} color={isMicEnabled ? '#fff' : '#ef4444'} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

function VideoParticipantView({ participant }: { participant: any }) {
  const { ParticipantView } = require('@stream-io/video-react-native-sdk');
  return <ParticipantView participant={participant} style={{ flex: 1, width: '100%' }} />;
}

export function LivestreamBroadcastScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { firestore } = useFirebase();
  const [livestream, setLivestream] = useState<Livestream | null>(null);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(firestore, 'livestreams', id), (snap) => {
      if (!snap.exists()) {
        router.back();
        return;
      }
      setLivestream({ id: snap.id, ...snap.data() } as Livestream);
    });
    return unsub;
  }, [firestore, id]);

  if (!livestream) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#111214]">
        <ActivityIndicator color="#fff" size="large" />
      </SafeAreaView>
    );
  }

  return (
    <BroadcastJoiner callId={livestream.callId}>{() => <BroadcastContent livestream={livestream} />}</BroadcastJoiner>
  );
}
