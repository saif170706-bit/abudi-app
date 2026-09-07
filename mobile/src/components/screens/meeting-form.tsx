import React, { useState } from 'react';
import { View, Text, Pressable, Alert, Image, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChipPicker } from '@/components/ui/chip-picker';
import { DeadlineField } from '@/components/ui/deadline-field';
import { pickAndUploadBanner } from '@/lib/upload-image';
import { sendPostNotifications } from '@/lib/send-post-notifications';
import { useLanguagePreference } from '@/context/language-context';
import type { Livestream } from '@/shared/types';

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Alle' },
  { value: 'teachers', label: 'Lærere' },
  { value: 'students', label: 'Elever' },
  { value: 'man', label: 'Mænd' },
  { value: 'woman', label: 'Kvinder' },
] as const;

export function MeetingForm({ meeting, onDone }: { meeting?: Livestream; onDone: () => void }) {
  const { firestore } = useFirebase();
  const { user } = useAuth();
  const { tGlobal } = useLanguagePreference();
  const [title, setTitle] = useState(meeting?.title ?? '');
  const [description, setDescription] = useState(meeting?.description ?? '');
  const [scheduledAt, setScheduledAt] = useState<Date>(
    meeting?.scheduledAt?.toDate?.() ?? new Date(Date.now() + 60 * 60 * 1000)
  );
  const [audience, setAudience] = useState<(typeof AUDIENCE_OPTIONS)[number]['value']>(
    (meeting?.targetAudience as any) ?? 'all'
  );
  const [imageUrl, setImageUrl] = useState<string | null>(meeting?.imageUrl ?? null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handlePickImage = async () => {
    setIsUploading(true);
    try {
      const url = await pickAndUploadBanner('announcements');
      if (url) setImageUrl(url);
    } catch (error) {
      console.error('Image upload failed:', error);
      Alert.alert(tGlobal('Fejl'), tGlobal('Kunne ikke uploade billedet.'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !user) return;
    setIsSaving(true);
    try {
      const data = {
        title: title.trim(),
        description: description.trim(),
        type: 'livestream' as const,
        scheduledAt,
        authorId: user.uid,
        authorName: 'Ibn Amer Instituttet',
        imageUrl: imageUrl || null,
        targetAudience: audience,
        targetGender: audience === 'man' || audience === 'woman' ? audience : 'all',
        isActive: meeting?.isActive ?? false,
      };
      if (meeting) {
        await updateDoc(doc(firestore, 'livestreams', meeting.id), data);
      } else {
        await addDoc(collection(firestore, 'livestreams'), {
          ...data,
          callId: `meeting-${Date.now()}`,
          createdAt: serverTimestamp(),
        });
        sendPostNotifications({
          targetAudience: data.targetAudience,
          targetGender: data.targetGender,
          specificRecipients: [],
          type: 'livestream',
          title: data.title,
        }).catch((err) => console.warn('[meeting-form] Notification failed (non-fatal):', err));
      }
      onDone();
    } catch (error) {
      console.error('Failed to save meeting:', error);
      Alert.alert(tGlobal('Fejl'), tGlobal('Kunne ikke gemme mødet.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
        <Text className="text-lg font-semibold text-foreground">{meeting ? tGlobal('Rediger møde') : tGlobal('Nyt Møde')}</Text>
        <Pressable onPress={onDone} className="px-2 py-1">
          <Text className="text-muted-foreground">{tGlobal('Luk')}</Text>
        </Pressable>
      </View>
      <FlatList
        data={[1]}
        keyExtractor={() => 'form'}
        contentContainerClassName="gap-4 p-4"
        renderItem={() => (
          <View className="gap-4">
            <View className="gap-2">
              <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{tGlobal('Titel')}</Text>
              <Input placeholder={tGlobal('Mødets navn')} value={title} onChangeText={setTitle} />
            </View>
            <View className="gap-2">
              <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{tGlobal('Banner Billede')}</Text>
              {imageUrl && <Image source={{ uri: imageUrl }} className="h-32 w-full rounded-xl" resizeMode="cover" />}
              <Button variant="outline" loading={isUploading} onPress={handlePickImage}>
                {imageUrl ? tGlobal('Skift billede') : tGlobal('Upload Banner')}
              </Button>
            </View>
            <View className="gap-2">
              <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{tGlobal('Mødetidspunkt')}</Text>
              <DeadlineField value={scheduledAt} onChange={setScheduledAt} mode="datetime" />
            </View>
            <View className="gap-2">
              <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{tGlobal('Beskrivelse')}</Text>
              <Input
                multiline
                numberOfLines={3}
                placeholder={tGlobal('Kort beskrivelse af mødets indhold...')}
                value={description}
                onChangeText={setDescription}
                className="min-h-[80px]"
              />
            </View>
            <View className="gap-2">
              <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{tGlobal('Målgruppe')}</Text>
              <ChipPicker options={AUDIENCE_OPTIONS.map((o) => ({ ...o, label: tGlobal(o.label) })) as any} value={audience} onChange={setAudience} />
            </View>
            <Button loading={isSaving} onPress={handleSave}>
              {meeting ? tGlobal('Gem ændring') : tGlobal('Opret Møde')}
            </Button>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
