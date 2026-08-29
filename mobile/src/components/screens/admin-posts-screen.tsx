import React, { useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, Modal, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { deleteDoc, doc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useAnnouncementsFeed } from '@/hooks/use-announcements-feed';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { htmlToPlainText } from '@/lib/html-text';
import { AnnouncementForm } from './announcement-form';
import { EventForm } from './event-form';
import { SurveyForm } from './survey-form';
import { MeetingForm } from './meeting-form';
import { useLanguagePreference } from '@/context/language-context';
import type { Announcement, Event, Survey, Livestream } from '@/shared/types';

type PostType = 'announcement' | 'event' | 'survey' | 'meeting';

const CREATE_TABS: {
  value: PostType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
}[] = [
  { value: 'announcement', label: 'Meddelelse', icon: 'megaphone-outline', iconBg: '#e7f3ee', iconColor: '#197670' },
  { value: 'event', label: 'Begivenhed', icon: 'calendar-outline', iconBg: '#e6f0fd', iconColor: '#2563eb' },
  { value: 'survey', label: 'Undersøgelse', icon: 'bar-chart-outline', iconBg: '#fdf3e2', iconColor: '#b8860b' },
  { value: 'meeting', label: 'Nyt møde', icon: 'videocam-outline', iconBg: '#f3e8fd', iconColor: '#9333ea' },
];

const TYPE_LABEL: Record<string, string> = {
  announcement: 'Meddelelse',
  event: 'Begivenhed',
  survey: 'Undersøgelse',
  livestream: 'Møde',
};

export function AdminPostsScreen() {
  const { firestore } = useFirebase();
  const { feedItems, isLoading } = useAnnouncementsFeed();
  const { tGlobal } = useLanguagePreference();
  const [creating, setCreating] = useState<PostType | null>(null);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const [editingMeeting, setEditingMeeting] = useState<Livestream | null>(null);

  const handleTabPress = (type: PostType) => {
    setCreating(type);
  };

  const handleItemPress = (item: any) => {
    if (item.type === 'announcement') setEditingAnnouncement(item);
    else if (item.type === 'event') setEditingEvent(item);
    else if (item.type === 'survey') setEditingSurvey(item);
    else if (item.type === 'livestream') setEditingMeeting(item);
  };

  const handleDelete = (item: any) => {
    const collectionName = item.type === 'event' ? 'events' : item.type === 'survey' ? 'surveys' : item.type === 'livestream' ? 'livestreams' : 'announcements';
    Alert.alert(tGlobal('Slet opslag'), `${tGlobal('Er du sikker på at du vil slette')} "${item.title}"?`, [
      { text: tGlobal('Annuller'), style: 'cancel' },
      { text: tGlobal('Slet'), style: 'destructive', onPress: () => deleteDoc(doc(firestore, collectionName, item.id)) },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="gap-3 p-4">
        <Text className="text-2xl font-bold text-foreground">{tGlobal('Opslag')}</Text>
        <View className="flex-row gap-2">
          {CREATE_TABS.map((tab) => (
            <Pressable
              key={tab.value}
              onPress={() => handleTabPress(tab.value)}
              className="flex-1 items-center gap-2 rounded-2xl border border-border bg-card py-4"
            >
              <View
                className="h-9 w-9 items-center justify-center rounded-xl"
                style={{ backgroundColor: tab.iconBg }}
              >
                <Ionicons name={tab.icon} size={18} color={tab.iconColor} />
              </View>
              <Text className="text-center text-[10px] font-bold uppercase tracking-wide text-card-foreground">
                {tGlobal(tab.label)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <FlatList
        data={feedItems}
        keyExtractor={(item) => `${item.type}-${item.id}`}
        contentContainerClassName="gap-3 px-4 pb-4"
        renderItem={({ item }) => (
          <Pressable onPress={() => handleItemPress(item)}>
            <Card>
              {item.imageUrl && (
                <Image source={{ uri: item.imageUrl }} className="mb-3 h-32 w-full rounded-xl" resizeMode="cover" />
              )}
              <Text className="text-xs font-bold uppercase tracking-widest text-accent">
                {tGlobal(TYPE_LABEL[item.type] ?? item.type)}
              </Text>
              <CardTitle>{item.title}</CardTitle>
              {(item.content || item.description) && (
                <CardDescription numberOfLines={2}>{htmlToPlainText(item.content || item.description || '')}</CardDescription>
              )}
              <View className="mt-3 flex-row gap-3">
                <Text className="text-sm font-medium text-primary" onPress={() => handleItemPress(item)}>
                  {tGlobal('Rediger')}
                </Text>
                <Text className="text-sm font-medium text-destructive" onPress={() => handleDelete(item)}>
                  {tGlobal('Slet')}
                </Text>
              </View>
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator className="mt-8" />
          ) : (
            <Text className="mt-8 text-center text-muted-foreground">{tGlobal('Ingen opslag endnu.')}</Text>
          )
        }
      />

      <Modal visible={creating === 'announcement' || editingAnnouncement !== null} animationType="slide" onRequestClose={() => { setCreating(null); setEditingAnnouncement(null); }}>
        <AnnouncementForm
          announcement={editingAnnouncement ?? undefined}
          onDone={() => {
            setCreating(null);
            setEditingAnnouncement(null);
          }}
        />
      </Modal>

      <Modal visible={creating === 'event' || editingEvent !== null} animationType="slide" onRequestClose={() => { setCreating(null); setEditingEvent(null); }}>
        <EventForm
          event={editingEvent ?? undefined}
          onDone={() => {
            setCreating(null);
            setEditingEvent(null);
          }}
        />
      </Modal>

      <Modal visible={creating === 'survey' || editingSurvey !== null} animationType="slide" onRequestClose={() => { setCreating(null); setEditingSurvey(null); }}>
        <SurveyForm
          survey={editingSurvey ?? undefined}
          onDone={() => {
            setCreating(null);
            setEditingSurvey(null);
          }}
        />
      </Modal>

      <Modal visible={creating === 'meeting' || editingMeeting !== null} animationType="slide" onRequestClose={() => { setCreating(null); setEditingMeeting(null); }}>
        <MeetingForm
          meeting={editingMeeting ?? undefined}
          onDone={() => {
            setCreating(null);
            setEditingMeeting(null);
          }}
        />
      </Modal>
    </SafeAreaView>
  );
}
