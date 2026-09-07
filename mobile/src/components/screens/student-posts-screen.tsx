import React from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { doc } from 'firebase/firestore';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useAnnouncementsFeed } from '@/hooks/use-announcements-feed';
import { Card, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { htmlToPlainText } from '@/lib/html-text';
import { useLanguagePreference, LOCALE_MAP } from '@/context/language-context';

const TYPE_META: Record<string, { label: string; bg: string; text: string }> = {
  announcement: { label: 'Meddelelse', bg: 'bg-primary/10', text: 'text-primary' },
  event: { label: 'Begivenhed', bg: 'bg-blue-50', text: 'text-blue-600' },
  survey: { label: 'Undersøgelse', bg: 'bg-amber-50', text: 'text-amber-700' },
  livestream: { label: 'Møde', bg: 'bg-purple-50', text: 'text-purple-600' },
};

function formatMeetingTime(item: any, locale: string) {
  const raw = item.scheduledAt?.toDate ? item.scheduledAt.toDate() : item.createdAt?.toDate?.();
  if (!raw) return '...';
  return raw
    .toLocaleDateString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    .toUpperCase();
}

function MeetingCta({ item, tGlobal }: { item: any; tGlobal: (s: string) => string }) {
  if (item.isActive) {
    return (
      <Pressable
        onPress={() => router.push(`/livestream-view/${item.id}` as any)}
        className="mt-4 flex-row items-center justify-between rounded-2xl bg-red-600 px-5 py-4"
      >
        <View className="flex-row items-center gap-3">
          <Ionicons name="play-circle" size={22} color="#fff" />
          <Text className="font-black text-white">{tGlobal('Join møde')}</Text>
        </View>
        <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.4)" />
      </Pressable>
    );
  }
  if (item.isRecordingAvailable) {
    return (
      <Pressable
        onPress={() => Alert.alert(tGlobal('Kommer snart'), tGlobal('Optagelser er ikke tilgængelige i appen endnu.'))}
        className="mt-4 flex-row items-center justify-between rounded-2xl bg-foreground px-5 py-4"
      >
        <View className="flex-row items-center gap-3">
          <Ionicons name="videocam" size={20} color="#fff" />
          <Text className="font-black text-background">{tGlobal('Se møde')}</Text>
        </View>
        <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.4)" />
      </Pressable>
    );
  }
  return (
    <View className="mt-4 flex-row items-center justify-center gap-3 rounded-2xl bg-muted/60 px-5 py-4">
      <Ionicons name="time-outline" size={18} color="#9ca3af" />
      <Text className="font-black text-muted-foreground/50">{tGlobal('Møde ikke startet')}</Text>
    </View>
  );
}

function SurveyCta({ item, tGlobal }: { item: any; tGlobal: (s: string) => string }) {
  const { firestore } = useFirebase();
  const { user } = useAuth();
  const responseRef = useMemoFirebase(
    () => (user ? doc(firestore, 'surveys', item.id, 'responses', user.uid) : null),
    [firestore, item.id, user?.uid]
  );
  const { data: response } = useDoc(responseRef);

  if (response) {
    return (
      <Button disabled className="mt-4 bg-amber-500/10" textClassName="text-amber-600">
        {tGlobal('Besvaret')}
      </Button>
    );
  }
  return (
    <Pressable
      onPress={() => router.push(`/surveys/${item.id}` as any)}
      className="mt-4 flex-row items-center justify-between rounded-2xl bg-amber-600 px-5 py-4"
    >
      <Text className="font-black text-white">{tGlobal('Start undersøgelse')}</Text>
      <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.4)" />
    </Pressable>
  );
}

export function StudentPostsScreen() {
  const { feedItems, isLoading } = useAnnouncementsFeed();
  const { tGlobal, language } = useLanguagePreference();
  const locale = LOCALE_MAP[language];
  const today = new Date()
    .toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
    .toUpperCase();

  const handlePress = (item: any) => {
    if (item.type === 'event') router.push(`/events/${item.id}` as any);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <FlatList
        data={feedItems}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        contentContainerClassName="gap-4 p-4"
        ListHeaderComponent={
          <View className="mb-2 flex-row items-end justify-between">
            <View>
              <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{today}</Text>
              <Text className="text-4xl font-bold tracking-tight text-foreground">{tGlobal('Opslag')}</Text>
            </View>
            <View className="h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-accent/20">
              <Text className="text-[10px] font-bold text-accent">{feedItems.length}</Text>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const meta = TYPE_META[item.type] ?? TYPE_META.announcement;
          const text = htmlToPlainText((item as any).content || (item as any).description || '');
          return (
            <Pressable onPress={() => handlePress(item)}>
              <Card className="overflow-hidden rounded-[28px]">
                {(item as any).imageUrl && (
                  <Image
                    source={{ uri: (item as any).imageUrl }}
                    className="mb-3 h-36 w-full rounded-2xl"
                    resizeMode="cover"
                  />
                )}
                <View className={`self-start rounded-full px-3 py-1 ${meta.bg}`}>
                  <Text className={`text-[9px] font-black uppercase tracking-widest ${meta.text}`}>{tGlobal(meta.label)}</Text>
                </View>
                <CardTitle className="mt-2">{item.title}</CardTitle>
                {text ? <Text className="mt-2 leading-relaxed text-muted-foreground">{text}</Text> : null}

                {item.type === 'livestream' ? (
                  <>
                    <View className="mt-3 flex-row items-center gap-2">
                      <Ionicons name="time-outline" size={14} color="#9ca3af" />
                      <Text className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/60">
                        {formatMeetingTime(item, locale)}
                      </Text>
                    </View>
                    <MeetingCta item={item} tGlobal={tGlobal} />
                  </>
                ) : item.type === 'survey' ? (
                  <SurveyCta item={item} tGlobal={tGlobal} />
                ) : null}
              </Card>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator className="mt-10" />
          ) : (
            <View className="items-center rounded-[32px] border border-border bg-card/50 p-12">
              <Text style={{ fontSize: 28 }}>📢</Text>
              <Text className="mt-3 font-bold text-foreground">{tGlobal('Ingen Opslag')}</Text>
              <Text className="mt-1 text-center text-muted-foreground">{tGlobal('Der er ingen nye opslag i øjeblikket.')}</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}
