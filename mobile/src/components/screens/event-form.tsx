import React, { useState } from 'react';
import { View, Text, Pressable, Alert, Image, FlatList, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChipPicker } from '@/components/ui/chip-picker';
import { DeadlineField } from '@/components/ui/deadline-field';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { EventFieldBuilder } from '@/components/ui/event-field-builder';
import { pickAndUploadBanner } from '@/lib/upload-image';
import type { Event, EventFormField } from '@/shared/types';

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Alle' },
  { value: 'teachers', label: 'Lærere' },
  { value: 'students', label: 'Elever' },
  { value: 'man', label: 'Mænd' },
  { value: 'woman', label: 'Kvinder' },
] as const;

export function EventForm({ event, onDone }: { event?: Event; onDone: () => void }) {
  const { firestore } = useFirebase();
  const { user } = useAuth();
  const [title, setTitle] = useState(event?.title ?? '');
  const [description, setDescription] = useState(event?.description ?? '');
  const [capacity, setCapacity] = useState(String(event?.capacity ?? 0));
  const [deadline, setDeadline] = useState<Date>(
    event?.registrationDeadline?.toDate?.() ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  );
  const [audience, setAudience] = useState<(typeof AUDIENCE_OPTIONS)[number]['value']>(
    (event?.targetAudience as any) ?? 'all'
  );
  const [allowExternal, setAllowExternal] = useState(event?.allowExternalRegistrations ?? false);
  const [formFields, setFormFields] = useState<EventFormField[]>(event?.formFields ?? []);
  const [imageUrl, setImageUrl] = useState<string | null>(event?.imageUrl ?? null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handlePickImage = async () => {
    setIsUploading(true);
    try {
      const url = await pickAndUploadBanner('announcements');
      if (url) setImageUrl(url);
    } catch (error) {
      console.error('Image upload failed:', error);
      Alert.alert('Fejl', 'Kunne ikke uploade billedet.');
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
        registrationDeadline: deadline,
        capacity: Number(capacity) || 0,
        allowExternalRegistrations: allowExternal,
        formFields,
        imageUrl: imageUrl || null,
        authorId: user.uid,
        authorName: 'Ibn Amer Instituttet',
        targetAudience: audience,
        targetGender: audience === 'man' || audience === 'woman' ? audience : 'all',
      };
      if (event) {
        await updateDoc(doc(firestore, 'events', event.id), data);
      } else {
        await addDoc(collection(firestore, 'events'), { ...data, registrationCount: 0, createdAt: serverTimestamp() });
      }
      onDone();
    } catch (error) {
      console.error('Failed to save event:', error);
      Alert.alert('Fejl', 'Kunne ikke gemme eventet.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
        <Text className="text-lg font-semibold text-foreground">{event ? 'Rediger event' : 'Nyt event'}</Text>
        <Pressable onPress={onDone} className="px-2 py-1">
          <Text className="text-muted-foreground">Luk</Text>
        </Pressable>
      </View>
      <FlatList
        data={[1]}
        keyExtractor={() => 'form'}
        contentContainerClassName="gap-4 p-4"
        renderItem={() => (
          <View className="gap-4">
            <View className="gap-2">
              <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Titel</Text>
              <Input value={title} onChangeText={setTitle} />
            </View>
            <View className="gap-2">
              <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Beskrivelse</Text>
              <RichTextEditor value={description} onChange={setDescription} />
            </View>
            <View className="gap-2">
              <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tilmeldingsfrist</Text>
              <DeadlineField value={deadline} onChange={setDeadline} />
            </View>
            <View className="gap-2">
              <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Kapacitet (0 = ubegrænset)
              </Text>
              <Input keyboardType="number-pad" value={capacity} onChangeText={setCapacity} />
            </View>
            <View className="gap-2">
              <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Målgruppe</Text>
              <ChipPicker options={AUDIENCE_OPTIONS as any} value={audience} onChange={setAudience} />
            </View>
            <View className="flex-row items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
              <Text className="flex-1 pr-3 font-semibold text-card-foreground">Tillad eksterne tilmeldinger</Text>
              <Switch value={allowExternal} onValueChange={setAllowExternal} />
            </View>
            <View className="gap-2">
              <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Billede</Text>
              {imageUrl && <Image source={{ uri: imageUrl }} className="h-32 w-full rounded-xl" resizeMode="cover" />}
              <Button variant="outline" loading={isUploading} onPress={handlePickImage}>
                {imageUrl ? 'Skift billede' : 'Vælg billede'}
              </Button>
            </View>
            <View className="gap-2">
              <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tilmeldingsformular</Text>
              <EventFieldBuilder fields={formFields} onChange={setFormFields} />
            </View>
            <Button loading={isSaving} onPress={handleSave}>
              Gem
            </Button>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
