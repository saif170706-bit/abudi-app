import React from 'react';
import { View, Text, Pressable, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useUserProfile } from '@/hooks/use-user-profile';
import { getDailyVerse } from '@/lib/daily-verses';
import { useLanguagePreference } from '@/context/language-context';

const QUICK_ACTIONS = [
  { id: 'find-student', title: 'Find Elev', desc: 'Søg studerende', icon: 'search-outline', color: '#197670' },
  { id: 'chat', title: 'Beskeder', desc: 'Chat med elever', icon: 'chatbubble-outline', color: '#ea580c' },
  { id: 'posts', title: 'Opslag', desc: 'Fælles opslag', icon: 'notifications-outline', color: '#2563eb' },
  { id: 'invite', title: 'Tilføj elev', desc: 'Forhåndsgodkend ny elev', icon: 'person-add-outline', color: '#9333ea' },
] as const;

export function TeacherHomeScreen() {
  const { profile } = useUserProfile();
  const dailyVerse = getDailyVerse();
  const { tGlobal } = useLanguagePreference();

  const handleQuickAction = (id: (typeof QUICK_ACTIONS)[number]['id']) => {
    if (id === 'find-student') router.push('/(teacher)/students' as any);
    else if (id === 'chat') router.push('/chat' as any);
    else if (id === 'posts') router.push('/(teacher)/opslag' as any);
    else if (id === 'invite') router.push('/teacher-invite-student' as any);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView contentContainerClassName="gap-8 px-6 pb-32 pt-6">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="mb-1 text-sm font-bold text-primary/40">Assalamu Alaikum 👋</Text>
            <Text className="text-3xl font-bold tracking-tight text-primary">
              {profile?.displayName?.split(' ')[0] ?? tGlobal('Lærer')}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/(teacher)/mere' as any)}
            className="h-14 w-14 overflow-hidden rounded-[24px] border-4 border-border shadow-lg"
          >
            {profile?.photoURL ? (
              <Image source={{ uri: profile.photoURL }} className="h-full w-full" resizeMode="cover" />
            ) : (
              <View className="h-full w-full items-center justify-center bg-primary/10">
                <Ionicons name="person" size={22} color="#197670" />
              </View>
            )}
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.push('/teacher-queue' as any)}
          className="flex-row items-center justify-between overflow-hidden rounded-[28px] border-2 border-accent/40 bg-card p-6 shadow-sm"
        >
          <View>
            <Text className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{tGlobal('Session')}</Text>
            <Text className="mt-1 text-3xl font-bold text-primary">{tGlobal('Lektiehjælp')}</Text>
            <Text className="mt-1 text-[10px] font-black uppercase tracking-widest text-accent">
              {tGlobal('Administrer din elev kø')}
            </Text>
            <View className="mt-6 flex-row items-center gap-2">
              <Text className="text-[11px] font-black uppercase tracking-widest text-primary">{tGlobal('Åbn Kø')}</Text>
              <View className="h-4 w-4 items-center justify-center rounded-full bg-foreground">
                <Ionicons name="chevron-forward" size={10} color="#fff" />
              </View>
            </View>
          </View>
          <Ionicons name="people" size={56} color="#197670" style={{ opacity: 0.15 }} />
        </Pressable>

        <View className="gap-4">
          <Text className="text-[10px] font-black uppercase tracking-widest text-accent">| {tGlobal('Hurtige handlinger')}</Text>
          <View className="gap-4">
            {[QUICK_ACTIONS.slice(0, 2), QUICK_ACTIONS.slice(2, 4)].map((row, rowIdx) => (
              <View key={rowIdx} className="flex-row gap-4">
                {row.map((action) => (
                  <Pressable
                    key={action.id}
                    onPress={() => handleQuickAction(action.id)}
                    className="flex-1 items-center gap-3 rounded-[28px] border border-border bg-card p-6 shadow-sm"
                  >
                    <View className="rounded-2xl bg-primary/5 p-3">
                      <Ionicons name={action.icon as any} size={24} color={action.color} />
                    </View>
                    <View className="items-center">
                      <Text className="text-sm font-black leading-tight text-foreground">{tGlobal(action.title)}</Text>
                      <Text className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {tGlobal(action.desc)}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        </View>

        <View className="gap-4">
          <Text className="text-[10px] font-black uppercase tracking-widest text-accent">| {tGlobal('Dagens Vers')}</Text>
          <View className="items-center rounded-[28px] border border-border bg-card p-8">
            <Text className="mb-6 text-center text-2xl leading-relaxed text-primary">{dailyVerse.arabic}</Text>
            <Text className="mb-4 text-center text-xs italic leading-relaxed text-primary/60">
              "{dailyVerse.translationKey}"
            </Text>
            <View className="mb-4 h-px w-12 bg-accent/20" />
            <Text className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">
              {tGlobal('surah')} {dailyVerse.reference}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
