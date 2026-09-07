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
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { SurveyQuestionBuilder } from '@/components/ui/survey-question-builder';
import { pickAndUploadBanner } from '@/lib/upload-image';
import { sendPostNotifications } from '@/lib/send-post-notifications';
import { useLanguagePreference } from '@/context/language-context';
import type { Survey, SurveyQuestion } from '@/shared/types';

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Alle' },
  { value: 'teachers', label: 'Lærere' },
  { value: 'students', label: 'Elever' },
  { value: 'man', label: 'Mænd' },
  { value: 'woman', label: 'Kvinder' },
] as const;

export function SurveyForm({ survey, onDone }: { survey?: Survey; onDone: () => void }) {
  const { firestore } = useFirebase();
  const { user } = useAuth();
  const { tGlobal } = useLanguagePreference();
  const [title, setTitle] = useState(survey?.title ?? '');
  const [description, setDescription] = useState(survey?.description ?? '');
  const [hasDeadline, setHasDeadline] = useState(!!survey?.deadline);
  const [deadline, setDeadline] = useState<Date>(
    survey?.deadline?.toDate?.() ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  );
  const [audience, setAudience] = useState<(typeof AUDIENCE_OPTIONS)[number]['value']>(
    (survey?.targetAudience as any) ?? 'all'
  );
  const [questions, setQuestions] = useState<SurveyQuestion[]>(survey?.questions ?? []);
  const [imageUrl, setImageUrl] = useState<string | null>(survey?.imageUrl ?? null);
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
    if (!title.trim() || questions.length === 0 || !user) {
      Alert.alert(tGlobal('Udfyld venligst'), tGlobal('Titel og mindst ét spørgsmål er påkrævet.'));
      return;
    }
    setIsSaving(true);
    try {
      const data = {
        title: title.trim(),
        description: description.trim(),
        type: 'survey' as const,
        authorId: user.uid,
        authorName: 'Ibn Amer Instituttet',
        imageUrl: imageUrl || null,
        deadline: hasDeadline ? deadline : null,
        questions,
        targetAudience: audience,
        targetGender: audience === 'man' || audience === 'woman' ? audience : 'all',
        active: true,
      };
      if (survey) {
        await updateDoc(doc(firestore, 'surveys', survey.id), data);
      } else {
        await addDoc(collection(firestore, 'surveys'), { ...data, createdAt: serverTimestamp() });
        sendPostNotifications({
          targetAudience: data.targetAudience,
          targetGender: data.targetGender,
          specificRecipients: [],
          type: 'survey',
          title: data.title,
        }).catch((err) => console.warn('[survey-form] Notification failed (non-fatal):', err));
      }
      onDone();
    } catch (error) {
      console.error('Failed to save survey:', error);
      Alert.alert(tGlobal('Fejl'), tGlobal('Kunne ikke gemme undersøgelsen.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center justify-between border-b border-border px-4 py-3">
        <Text className="text-lg font-semibold text-foreground">{survey ? tGlobal('Rediger undersøgelse') : tGlobal('Ny Undersøgelse')}</Text>
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
              <Input placeholder={tGlobal('Fx: Trivselsmåling Marts')} value={title} onChangeText={setTitle} />
            </View>
            <View className="gap-2">
              <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{tGlobal('Banner Billede')}</Text>
              {imageUrl && <Image source={{ uri: imageUrl }} className="h-32 w-full rounded-xl" resizeMode="cover" />}
              <Button variant="outline" loading={isUploading} onPress={handlePickImage}>
                {imageUrl ? tGlobal('Skift billede') : tGlobal('Upload Banner')}
              </Button>
            </View>
            <View className="gap-2">
              <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{tGlobal('Beskrivelse')}</Text>
              <RichTextEditor value={description} onChange={setDescription} />
            </View>
            <View className="gap-2">
              <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{tGlobal('Målgruppe')}</Text>
              <ChipPicker options={AUDIENCE_OPTIONS.map((o) => ({ ...o, label: tGlobal(o.label) })) as any} value={audience} onChange={setAudience} />
            </View>
            <Pressable onPress={() => setHasDeadline((v) => !v)} className="flex-row items-center gap-2">
              <View className={`h-4 w-4 rounded ${hasDeadline ? 'bg-primary' : 'border border-border'}`} />
              <Text className="text-sm text-foreground">{tGlobal('Sæt tidsfrist')}</Text>
            </Pressable>
            {hasDeadline && (
              <View className="gap-2">
                <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{tGlobal('Frist')}</Text>
                <DeadlineField value={deadline} onChange={setDeadline} />
              </View>
            )}
            <View className="gap-2">
              <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{tGlobal('Spørgsmål')}</Text>
              <SurveyQuestionBuilder questions={questions} onChange={setQuestions} />
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
