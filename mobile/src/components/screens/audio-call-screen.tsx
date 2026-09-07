import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, Redirect } from 'expo-router';
import { doc, arrayUnion, deleteDoc, getDoc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import {
  StreamCall,
  CallingState,
  useCallStateHooks,
  useCall,
  type Call,
  type StreamVideoParticipant,
} from '@stream-io/video-react-native-sdk';
import { useFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useStreamVideo } from '@/hooks/use-stream-video';
import { useLanguagePreference } from '@/context/language-context';

function initials(name?: string) {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

function ParticipantCard({ participant }: { participant: StreamVideoParticipant }) {
  return (
    <View className="items-center gap-3">
      <View
        className={`h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-card bg-muted shadow-lg ${participant.isSpeaking ? 'border-primary' : ''}`}
      >
        <Text className="text-2xl font-bold text-foreground/40">{initials(participant.name)}</Text>
      </View>
      <Text className="max-w-[140px] text-center text-base font-bold text-foreground" numberOfLines={1}>
        {participant.name}
      </Text>
    </View>
  );
}

/** Joins/creates the Stream call with camera+mic forced off before join (audio-only queue call), mirrors the web app's audio/[id]/layout.tsx. */
function CallJoiner({ callId, children }: { callId: string; children: (call: Call) => React.ReactNode }) {
  const { client } = useStreamVideo();
  const [call, setCall] = useState<Call | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { tGlobal } = useLanguagePreference();
  const joiningRef = useRef(false);
  const joinedRef = useRef(false);

  useEffect(() => {
    if (!client || joiningRef.current) return;
    let cancelled = false;
    joiningRef.current = true;
    setError(null);

    const c = client.call('default', callId);

    (async () => {
      try {
        await Promise.allSettled([c.camera.disable(), c.microphone.disable()]);
        await c.microphone.disableSpeakingWhileMutedNotification?.().catch(() => {});
        if (cancelled) return;
        await c.join({ create: true });
        if (cancelled) {
          await c.leave().catch(() => {});
          return;
        }
        joinedRef.current = true;
        setCall(c);
      } catch (e: any) {
        console.error('[audio-call] join failed:', e);
        setError(e?.message || tGlobal('Kunne ikke starte lydopkaldet. Kontroller din forbindelse.'));
      } finally {
        joiningRef.current = false;
      }
    })();

    return () => {
      cancelled = true;
      joiningRef.current = false;
      void (async () => {
        try {
          await Promise.allSettled([c.camera.disable(), c.microphone.disable()]);
          if (joinedRef.current) await c.leave().catch(() => {});
        } finally {
          joinedRef.current = false;
        }
      })();
    };
  }, [client, callId, tGlobal]);

  if (error) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background p-6">
        <Text className="text-center text-lg font-bold text-foreground">{tGlobal('Fejl ved opkald')}</Text>
        <Text className="mt-2 text-center text-sm text-muted-foreground">{error}</Text>
        <Pressable onPress={() => router.replace('/')} className="mt-6 rounded-2xl bg-primary px-6 py-3">
          <Text className="font-bold text-primary-foreground">{tGlobal('Tilbage til forsiden')}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!client || !call) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
        <Text className="mt-4 text-sm font-medium text-muted-foreground">{tGlobal('Forbinder til lydrum...')}</Text>
      </SafeAreaView>
    );
  }

  return <StreamCall call={call}>{children(call)}</StreamCall>;
}

function AudioCallContent({ callId }: { callId: string }) {
  const { firestore } = useFirebase();
  const { user } = useAuth();
  const { role } = useUserProfile();
  const { tGlobal } = useLanguagePreference();
  const call = useCall();
  const { useParticipants, useMicrophoneState, useCallCallingState } = useCallStateHooks();
  const participants = useParticipants();
  const { microphone, isMute } = useMicrophoneState();
  const callingState = useCallCallingState();
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (!firestore || !callId) return;
    const callDocRef = doc(firestore, 'activeCalls', callId);
    const unsub = onSnapshot(callDocRef, (snap) => {
      if (!snap.exists()) router.replace('/');
    });
    return unsub;
  }, [firestore, callId]);

  // Registering as a member here (not just via IncomingCallListener's Accept
  // button) means tapping the push notification straight into this screen
  // still marks the call as answered — the caller's "ringing" screen watches
  // activeCalls.members.length via this same doc.
  useEffect(() => {
    if (!firestore || !user?.uid || !callId) return;
    setDoc(doc(firestore, 'activeCalls', callId), { members: arrayUnion(user.uid) }, { merge: true }).catch(() => {});
    deleteDoc(doc(firestore, 'callInvites', user.uid)).catch(() => {});
  }, [firestore, user?.uid, callId]);

  const uniqueParticipants = useMemo(() => {
    const map = new Map<string, StreamVideoParticipant>();
    participants.forEach((p) => map.set(p.userId, p));
    return Array.from(map.values());
  }, [participants]);

  const handleLeave = async () => {
    if (isLeaving) return;
    setIsLeaving(true);
    try {
      if (firestore && user?.uid && callId) {
        const callDocRef = doc(firestore, 'activeCalls', callId);
        if (participants.length <= 2) {
          await deleteDoc(callDocRef).catch(() => {});
        } else {
          const snap = await getDoc(callDocRef).catch(() => null);
          if (snap?.exists()) {
            const members = (snap.data().members || []).filter((m: string) => m !== user.uid);
            if (members.length === 0) await deleteDoc(callDocRef).catch(() => {});
            else await updateDoc(callDocRef, { members }).catch(() => {});
          }
        }
      }
      if (call) {
        await call.microphone.disable().catch(() => {});
        const state = call.state.callingState;
        if (state !== CallingState.LEFT && state !== CallingState.OFFLINE) {
          await call.leave().catch(() => {});
        }
      }
    } finally {
      router.replace('/');
    }
  };

  const toggleMic = async () => {
    if (isMute) await microphone.enable();
    else await microphone.disable();
  };

  if (isLeaving) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
        <Text className="mt-4 text-sm font-medium text-muted-foreground">{tGlobal('Afslutter opkald...')}</Text>
      </SafeAreaView>
    );
  }

  if (callingState !== CallingState.JOINED) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
        <Text className="mt-4 text-sm font-medium text-muted-foreground">{tGlobal('Forbinder til lydrum...')}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="items-center px-6 pb-8 pt-10">
        <Text className="text-3xl font-extrabold text-foreground">{tGlobal('Lydopkald')}</Text>
        <Text className="mt-2 text-sm font-medium text-muted-foreground">
          {callingState === CallingState.JOINED ? tGlobal('Forbundet') : tGlobal('Forbinder...')}
        </Text>
      </View>

      <View className="flex-1 flex-row flex-wrap items-center justify-center gap-8 p-6">
        {uniqueParticipants.map((p) => (
          <ParticipantCard key={p.sessionId} participant={p} />
        ))}
      </View>

      <View className="items-center px-6 pb-12 pt-6">
        <View className="flex-row items-center gap-4 rounded-3xl border border-border bg-card p-4 shadow-2xl">
          <Pressable
            onPress={toggleMic}
            className={`h-16 w-16 items-center justify-center rounded-3xl ${isMute ? 'bg-red-50' : 'bg-muted'}`}
          >
            <Ionicons name={isMute ? 'mic-off' : 'mic'} size={26} color={isMute ? '#ef4444' : '#374151'} />
          </Pressable>
          <Pressable
            onPress={handleLeave}
            className="h-16 w-16 items-center justify-center rounded-3xl bg-[#E24B4B] shadow-lg"
          >
            <Ionicons name="call" size={26} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

export function AudioCallScreen() {
  const { cid } = useLocalSearchParams<{ cid: string }>();
  if (!cid) return <Redirect href="/" />;
  return <CallJoiner callId={cid}>{() => <AudioCallContent callId={cid} />}</CallJoiner>;
}
