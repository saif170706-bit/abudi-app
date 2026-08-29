import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

// Stream Chat's RN SDK imports native-only codegen components that Metro can't
// bundle for web — this is what every /chat/* route renders on web (`.web.tsx`
// files), so the library is never statically imported into the web bundle.
// The real thing works fine on iOS/Android via Expo Go / a native build.
export function ChatUnavailableOnWeb() {
  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-background px-8">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Ionicons name="phone-portrait-outline" size={28} color="#9ca3af" />
      </View>
      <Text className="mt-4 text-lg font-bold text-foreground">Kun tilgængelig i appen</Text>
      <Text className="mt-1 text-center text-sm text-muted-foreground">
        Beskeder virker ikke i browser-forhåndsvisningen. Åbn appen på din telefon for at chatte.
      </Text>
      <Pressable
        onPress={() => router.replace('/')}
        className="mt-6 rounded-full bg-primary px-6 py-3"
      >
        <Text className="text-sm font-bold text-primary-foreground">Tilbage til forsiden</Text>
      </Pressable>
    </SafeAreaView>
  );
}
