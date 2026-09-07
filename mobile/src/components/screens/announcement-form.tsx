import React, { useState } from 'react';
import { View, Text, Pressable, Alert, Image, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChipPicker } from '@/components/ui/chip-picker';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { pickAndUploadBanner } from '@/lib/upload-image';
import { sendPostNotifications } from '@/lib/send-post-notifications';
import { useLanguagePreference } from '@/context/language-context';
import type { Announcement } from '@/shared/types';

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Alle' },
  { value: 'teachers', label: 'Lærere' },
  { value: 'students', label: 'Elever' },
  { value: 'man', label: 'Mænd' },
  { value: 'woman', label: 'Kvinder' },
] as const;

export function AnnouncementForm({ announcement, onDone }: { announcement?: Announcement; onDone: () => void }) {
  const { firestore } = useFirebase();
  const { user } = useAuth();
  const { tGlobal } = useLanguagePreference();
  const [title, setTitle] = useState(announcement?.title ?? '');
  const [content, setContent] = useState(announcement?.content ?? '');
  const [audience, setAudience] = useState<(typeof AUDIENCE_OPTIONS)[number]['value']>(
    (announcement?.targetAudience as any) ?? 'all'
  );
  const [imageUrl, setImageUrl] = useState<string | null>(announcement?.imageUrl ?? null);
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
    if (!title.trim() || !content.trim() || !user) return;
    setIsSaving(true);
    try {
      const data = {
        title: title.trim(),
        content: content.trim(),
        authorId: user.uid,
        authorName: 'Ibn Amer Instituttet',
        imageUrl: imageUrl || null,
        targetAudience: audience,
        targetGender: audience === 'man' || audience === 'woman' ? audience : 'all',
      };
      if (announcement) {
        await updateDoc(doc(firestore, 'announcements', announcement.id), data);
      } else {
        await addDoc(collection(firestore, 'announcements'), { ...data, createdAt: serverTimestamp() });
        sendPostNotifications({
          targetAudience: data.targetAudience,
          targetGender: data.targetGender,
          specificRecipients: [],
          type: 'announcement',
          title: data.title,
        }).catch((err) => console.warn('[announcement-form] Notification failed (non-fatal):', err));
      }
      onDone();
    } catch (error) {
      console.error('Failed to save announcement:', error);
      Alert.alert(tGlobal('Fejl'), tGlobal('Kunne ikke gemme opslaget.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
        <Text className="text-lg font-semibold text-foreground">{announcement ? tGlobal('Rediger opslag') : tGlobal('Nyt opslag')}</Text>
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
              <Input value={title} onChangeText={setTitle} />
            </View>
            <View className="gap-2">
              <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{tGlobal('Indhold')}</Text>
              <RichTextEditor value={content} onChange={setContent} />
            </View>
            <View className="gap-2">
              <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{tGlobal('Målgruppe')}</Text>
              <ChipPicker options={AUDIENCE_OPTIONS.map((o) => ({ ...o, label: tGlobal(o.label) })) as any} value={audience} onChange={setAudience} />
            </View>
            <View className="gap-2">
              <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{tGlobal('Billede')}</Text>
              {imageUrl && <Image source={{ uri: imageUrl }} className="h-32 w-full rounded-xl" resizeMode="cover" />}
              <Button variant="outline" loading={isUploading} onPress={handlePickImage}>
                {imageUrl ? tGlobal('Skift billede') : tGlobal('Vælg billede')}
              </Button>
            </View>
            <Button loading={isSaving} onPress={handleSave}>
              {tGlobal('Gem')}
            </Button>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
