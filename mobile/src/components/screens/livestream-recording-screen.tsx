import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useFirebase } from '@/firebase';
import { useLanguagePreference } from '@/context/language-context';
import type { Livestream } from '@/shared/types';

/** Plays a published meeting recording — mirrors the web app's LivestreamPlayerSheet, just native video controls instead of an HTML5 <video> tag. */
export function LivestreamRecordingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { firestore } = useFirebase();
  const { tGlobal } = useLanguagePreference();
  const [livestream, setLivestream] = useState<Livestream | null>(null);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(firestore, 'livestreams', id), (snap) => {
      setLivestream(snap.exists() ? ({ id: snap.id, ...snap.data() } as Livestream) : null);
    });
    return unsub;
  }, [firestore, id]);

  const player = useVideoPlayer(livestream?.recordingUrl || null, (p) => {
    p.play();
  });

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="flex-1 text-base font-bold text-white" numberOfLines={1}>
          {livestream?.title || tGlobal('Optagelse')}
        </Text>
        <Pressable onPress={() => router.back()} className="h-9 w-9 items-center justify-center rounded-full bg-white/10">
          <Ionicons name="close" size={20} color="#fff" />
        </Pressable>
      </View>

      <View className="flex-1 items-center justify-center">
        {livestream?.recordingUrl ? (
          <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="contain" nativeControls />
        ) : (
          <View className="items-center gap-3 px-10">
            <ActivityIndicator color="rgba(255,255,255,0.4)" />
            <Text className="text-center text-sm font-bold uppercase tracking-widest text-white/40">
              {tGlobal('Optagelsen behandles stadig... Prøv igen om et øjeblik.')}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
