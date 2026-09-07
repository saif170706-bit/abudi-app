import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { useLanguagePreference } from '@/context/language-context';

/**
 * Thin banner shown when the device has no internet connection. Firestore's
 * own offline persistence keeps the app usable (cached reads, queued
 * writes), but nothing told the user *why* things looked stale — this is
 * purely a visibility fix, not a functional one.
 */
export function OfflineBanner() {
  const { tGlobal } = useLanguagePreference();
  const insets = useSafeAreaInsets();
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsOffline(state.isConnected === false);
    });
    return unsub;
  }, []);

  if (!isOffline) return null;

  return (
    <View
      pointerEvents="none"
      style={{ paddingTop: insets.top }}
      className="absolute left-0 right-0 top-0 z-50 bg-destructive"
    >
      <Text className="py-1.5 text-center text-[11px] font-bold uppercase tracking-widest text-destructive-foreground">
        {tGlobal('Ingen internetforbindelse')}
      </Text>
    </View>
  );
}
