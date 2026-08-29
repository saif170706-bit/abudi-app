import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useAuth } from '@/hooks/use-auth';
import { useUserProfile } from '@/hooks/use-user-profile';
import { InviteUserForm } from './invite-user-form';
import { LanguageMenu } from '@/components/ui/language-menu';

function HeaderIconButton({ name, color, onPress }: { name: keyof typeof Ionicons.glyphMap; color?: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="h-11 w-11 items-center justify-center rounded-full border border-border bg-card shadow-sm"
    >
      <Ionicons name={name} size={20} color={color ?? '#374151'} />
    </Pressable>
  );
}

export function AdminHubScreen() {
  const { logout } = useAuth();
  const { profile } = useUserProfile();
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerClassName="gap-6 p-4">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-sm text-muted-foreground">Admin</Text>
            <Text className="text-3xl font-bold leading-tight text-foreground">
              Assalamu alaikum {profile?.displayName ?? ''} 👋
            </Text>
          </View>
          <View className="flex-row gap-2">
            <HeaderIconButton
              name={colorScheme === 'dark' ? 'sunny-outline' : 'moon-outline'}
              onPress={toggleColorScheme}
            />
            <HeaderIconButton name="language-outline" onPress={() => setLanguageMenuOpen(true)} />
            <HeaderIconButton name="log-out-outline" color="#ef4444" onPress={logout} />
          </View>
        </View>

        <View className="flex-row gap-3">
          <Pressable onPress={() => router.push('/terminal/queue')} className="flex-1 rounded-2xl border-2 border-border p-4">
            <Text className="font-bold text-foreground">Terminal: Træk Nummer</Text>
            <Text className="mt-1 text-xs text-muted-foreground">Kø-skærm for iPad</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/terminal/tv')} className="flex-1 rounded-2xl border-2 border-border p-4">
            <Text className="font-bold text-foreground">Terminal: TV Visning</Text>
            <Text className="mt-1 text-xs text-muted-foreground">Oversigt for infoskærm</Text>
          </Pressable>
        </View>

        <InviteUserForm />
      </ScrollView>

      <LanguageMenu visible={languageMenuOpen} onClose={() => setLanguageMenuOpen(false)} />
    </SafeAreaView>
  );
}
