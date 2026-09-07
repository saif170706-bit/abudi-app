import React, { useEffect } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, onSnapshot } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useLanguagePreference } from '@/context/language-context';

/**
 * Outgoing "ringing" state shown to the caller while a queue virtual call
 * invite is pending — mobile equivalent of the web app's CallingDialog.tsx.
 * Watches the same `activeCalls/{callId}` doc for a second member joining.
 */
export function CallingModal({
  visible,
  callId,
  onCancel,
  onConnected,
}: {
  visible: boolean;
  callId: string | null;
  onCancel: (reason: 'cancelled' | 'timeout') => void;
  onConnected: () => void;
}) {
  const { firestore } = useFirebase();
  const { tGlobal } = useLanguagePreference();

  useEffect(() => {
    if (!visible || !callId) return;
    const callDocRef = doc(firestore, 'activeCalls', callId);
    const unsub = onSnapshot(callDocRef, (snap) => {
      const members = snap.data()?.members;
      if (Array.isArray(members) && members.length > 1) onConnected();
    });
    const timeout = setTimeout(() => onCancel('timeout'), 30000);
    return () => {
      unsub();
      clearTimeout(timeout);
    };
  }, [visible, callId, firestore, onCancel, onConnected]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => onCancel('cancelled')}>
      <View className="flex-1 items-center justify-center bg-black/50 px-8">
        <View className="w-full max-w-sm items-center gap-8 rounded-[40px] bg-card p-8 shadow-2xl">
          <View className="items-center gap-2">
            <Text className="text-2xl font-extrabold text-foreground">{tGlobal('Ringer op...')}</Text>
            <Text className="text-sm font-medium text-muted-foreground">{tGlobal('Venter på svar')}</Text>
          </View>

          <View className="h-28 w-28 items-center justify-center rounded-full bg-primary/10">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-primary shadow-xl">
              <Ionicons name="call" size={32} color="#fff" />
            </View>
          </View>

          <Pressable
            onPress={() => onCancel('cancelled')}
            className="w-full flex-row items-center justify-center gap-2 rounded-3xl bg-[#E24B4B] py-4 shadow-lg"
          >
            <Ionicons name="call" size={18} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
            <Text className="font-bold text-white">{tGlobal('Afbryd')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
