import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { doc, onSnapshot, deleteDoc, setDoc, arrayUnion } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useLanguagePreference } from '@/context/language-context';

interface IncomingCallInfo {
  callId: string;
  from: string;
  fromName: string;
  fromPhoto?: string;
  type: 'video' | 'audio';
}

function initials(name?: string) {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

/**
 * Listens on `callInvites/{uid}` for an incoming queue call and shows an
 * accept/decline sheet — the mobile equivalent of the web app's
 * IncomingCallListener.tsx. Shares the same Firestore documents
 * (callInvites/activeCalls) so a teacher on web can call a student on mobile
 * and vice versa. Mounted once near the app root, gated on auth.
 */
export function IncomingCallListener() {
  const { firestore } = useFirebase();
  const { user } = useAuth();
  const { tGlobal } = useLanguagePreference();
  const [incoming, setIncoming] = useState<IncomingCallInfo | null>(null);

  useEffect(() => {
    if (!user || !firestore) {
      setIncoming(null);
      return;
    }
    const inviteRef = doc(firestore, 'callInvites', user.uid);
    const unsub = onSnapshot(inviteRef, (snap) => {
      setIncoming(snap.exists() ? (snap.data() as IncomingCallInfo) : null);
    });
    return unsub;
  }, [user, firestore]);

  const clearInvite = async () => {
    if (!user) return;
    await deleteDoc(doc(firestore, 'callInvites', user.uid)).catch(() => {});
  };

  const handleAccept = async () => {
    if (!incoming || !user) return;
    const { callId, type } = incoming;
    try {
      await setDoc(doc(firestore, 'activeCalls', callId), { members: arrayUnion(user.uid) }, { merge: true });
      await clearInvite();
      setIncoming(null);
      router.push(`/${type === 'video' ? 'video' : 'audio'}/${callId}` as any);
    } catch (error) {
      console.error('Failed to accept call:', error);
    }
  };

  const handleDecline = async () => {
    await clearInvite();
    setIncoming(null);
  };

  if (!incoming) return null;

  const isVideo = incoming.type === 'video';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={handleDecline}>
      <View className="flex-1 items-center justify-center bg-black/50 px-8">
        <View className="w-full max-w-sm items-center gap-8 rounded-[40px] bg-card p-8 shadow-2xl">
          <View className="h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-background bg-muted shadow-xl">
            <Text className="text-3xl font-bold text-foreground">{initials(incoming.fromName)}</Text>
          </View>

          <View className="items-center gap-2">
            <Text className="text-2xl font-extrabold text-foreground">{incoming.fromName || tGlobal('Nogen')}</Text>
            <Text className="text-sm font-bold uppercase tracking-widest text-primary">
              {isVideo ? tGlobal('Indgående Videoopkald') : tGlobal('Indgående Lydopkald')}
            </Text>
          </View>

          <View className="flex-row items-center justify-center gap-10 pt-2">
            <View className="items-center gap-2">
              <Pressable
                onPress={handleDecline}
                className="h-20 w-20 items-center justify-center rounded-full bg-[#E24B4B] shadow-xl"
              >
                <Ionicons name={isVideo ? 'videocam-off' : 'call'} size={32} color="#fff" style={!isVideo ? { transform: [{ rotate: '135deg' }] } : undefined} />
              </Pressable>
              <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{tGlobal('Afvis')}</Text>
            </View>
            <View className="items-center gap-2">
              <Pressable
                onPress={handleAccept}
                className="h-20 w-20 items-center justify-center rounded-full bg-[#2E9D63] shadow-xl"
              >
                <Ionicons name={isVideo ? 'videocam' : 'call'} size={32} color="#fff" />
              </Pressable>
              <Text className="text-xs font-bold uppercase tracking-widest text-[#2E9D63]">{tGlobal('Besvar')}</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
