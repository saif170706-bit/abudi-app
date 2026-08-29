import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { doc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SurahSelect } from '@/components/ui/surah-select';
import { AyahRangeFields } from '@/components/ui/ayah-range-fields';
import { surahs as allSurahs } from '@/shared/surahs';
import { useLanguagePreference } from '@/context/language-context';
import type { Assignment } from '@/shared/types';

const GRADE_OPTIONS = ['Perfekt', 'Meget godt', 'Godt', 'Ikke læst'] as const;

const formSchema = z
  .object({
    hifzSurahName: z.string().optional().nullable(),
    hifzEndSurahName: z.string().optional().nullable(),
    hifzFromAyah: z.number().optional().nullable(),
    hifzToAyah: z.number().optional().nullable(),
    murajaraSurahName: z.string().optional().nullable(),
    murajaraEndSurahName: z.string().optional().nullable(),
    murajaraFromAyah: z.number().optional().nullable(),
    murajaraToAyah: z.number().optional().nullable(),
    gradeHifz: z.string().optional().nullable(),
    gradeMurajara: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  })
  .refine(
    (data) =>
      (data.hifzSurahName && data.hifzFromAyah && data.hifzToAyah) ||
      (data.murajaraSurahName && data.murajaraFromAyah && data.murajaraToAyah),
    { message: 'Udfyld mindst én sektion (Hifz eller Murajara).', path: ['hifzSurahName'] }
  )
  .refine((data) => !data.hifzSurahName || (data.hifzFromAyah && data.hifzToAyah), {
    message: 'Hvis Hifz-surah er valgt, skal Fra og Til Ayah udfyldes.',
    path: ['hifzFromAyah'],
  })
  .refine((data) => !data.murajaraSurahName || (data.murajaraFromAyah && data.murajaraToAyah), {
    message: 'Hvis Murajara-surah er valgt, skal Fra og Til Ayah udfyldes.',
    path: ['murajaraFromAyah'],
  });

type FormValues = z.infer<typeof formSchema>;

function GradePicker({
  value,
  onChange,
  tGlobal,
}: {
  value: string | null | undefined;
  onChange: (v: string) => void;
  tGlobal: (text: string) => string;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {GRADE_OPTIONS.map((g) => (
        <Button
          key={g}
          variant={value === g ? 'primary' : 'outline'}
          onPress={() => onChange(g)}
          className="px-4 py-2"
        >
          {tGlobal(g)}
        </Button>
      ))}
    </View>
  );
}

export function AssignmentForm({
  studentId,
  assignment,
  onDone,
}: {
  studentId: string;
  assignment?: Assignment;
  onDone: () => void;
}) {
  const { firestore } = useFirebase();
  const { user: teacher } = useAuth();
  const { tGlobal } = useLanguagePreference();
  const [isLoading, setIsLoading] = useState(false);

  const initialSurahNumber = (name: string | null | undefined) => {
    const surah = name ? allSurahs.find((s) => s.name === name) : null;
    return surah ? String(surah.number) : null;
  };

  const {
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      hifzSurahName: initialSurahNumber(assignment?.hifz.surahName),
      hifzEndSurahName: initialSurahNumber(assignment?.hifz.endSurahName),
      hifzFromAyah: assignment?.hifz.fromAyah || undefined,
      hifzToAyah: assignment?.hifz.toAyah || undefined,
      murajaraSurahName: initialSurahNumber(assignment?.murajara.surahName),
      murajaraEndSurahName: initialSurahNumber(assignment?.murajara.endSurahName),
      murajaraFromAyah: assignment?.murajara.fromAyah || undefined,
      murajaraToAyah: assignment?.murajara.toAyah || undefined,
      gradeHifz: assignment?.gradeHifz || null,
      gradeMurajara: assignment?.gradeMurajara || null,
      notes: assignment?.notes || '',
    },
  });

  const watchHifzSurahName = watch('hifzSurahName');
  const watchHifzEndSurahName = watch('hifzEndSurahName');
  const watchMurajaraSurahName = watch('murajaraSurahName');
  const watchMurajaraEndSurahName = watch('murajaraEndSurahName');
  const hifzFromAyah = watch('hifzFromAyah');
  const hifzToAyah = watch('hifzToAyah');
  const murajaraFromAyah = watch('murajaraFromAyah');
  const murajaraToAyah = watch('murajaraToAyah');

  const selectedHifzSurahName = useMemo(
    () => (watchHifzSurahName ? allSurahs.find((s) => String(s.number) === watchHifzSurahName)?.name ?? null : null),
    [watchHifzSurahName]
  );
  const selectedMurajaraSurahName = useMemo(
    () =>
      watchMurajaraSurahName ? allSurahs.find((s) => String(s.number) === watchMurajaraSurahName)?.name ?? null : null,
    [watchMurajaraSurahName]
  );

  const onSubmit = async (data: FormValues) => {
    if (!teacher) return;
    setIsLoading(true);

    const hifzSurah = data.hifzSurahName ? allSurahs.find((s) => s.number === parseInt(data.hifzSurahName!, 10)) : null;
    const hifzEndSurah = data.hifzEndSurahName ? allSurahs.find((s) => s.number === parseInt(data.hifzEndSurahName!, 10)) : null;
    const murajaraSurah = data.murajaraSurahName ? allSurahs.find((s) => s.number === parseInt(data.murajaraSurahName!, 10)) : null;
    const murajaraEndSurah = data.murajaraEndSurahName
      ? allSurahs.find((s) => s.number === parseInt(data.murajaraEndSurahName!, 10))
      : null;

    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 7);

    try {
      if (assignment) {
        const updatedAssignmentData = {
          hifz: {
            surahName: hifzSurah?.name || '',
            endSurahName: hifzEndSurah?.name || null,
            fromAyah: data.hifzFromAyah || 0,
            toAyah: data.hifzToAyah || 0,
          },
          murajara: {
            surahName: murajaraSurah?.name || '',
            endSurahName: murajaraEndSurah?.name || null,
            fromAyah: data.murajaraFromAyah || 0,
            toAyah: data.murajaraToAyah || 0,
          },
          gradeHifz: data.gradeHifz || null,
          gradeMurajara: data.gradeMurajara || null,
          notes: data.notes || null,
          gradedAt: data.gradeHifz || data.gradeMurajara ? serverTimestamp() : assignment.gradedAt || null,
        };
        await setDoc(doc(firestore, 'students', studentId, 'assignments', assignment.id), updatedAssignmentData, {
          merge: true,
        });
      } else {
        const newAssignmentData = {
          studentId,
          teacherId: teacher.uid,
          dueDate: defaultDueDate.toISOString().split('T')[0],
          hifz: {
            surahName: hifzSurah?.name || '',
            endSurahName: hifzEndSurah?.name || null,
            fromAyah: data.hifzFromAyah || 0,
            toAyah: data.hifzToAyah || 0,
          },
          murajara: {
            surahName: murajaraSurah?.name || '',
            endSurahName: murajaraEndSurah?.name || null,
            fromAyah: data.murajaraFromAyah || 0,
            toAyah: data.murajaraToAyah || 0,
          },
          gradeHifz: null,
          gradeMurajara: null,
          notes: null,
          assignedAt: serverTimestamp(),
          gradedAt: null,
        };
        await addDoc(collection(firestore, 'students', studentId, 'assignments'), newAssignmentData);
      }
      onDone();
    } catch (error) {
      console.error('Error saving assignment:', error);
      Alert.alert(tGlobal('Fejl'), tGlobal('Kunne ikke gemme lektien.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView contentContainerClassName="gap-8 p-4">
      <View className="gap-4 rounded-2xl border border-border bg-card p-4">
        <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{tGlobal('Memorering (Hifz)')}</Text>
        <Controller
          name="hifzSurahName"
          control={control}
          render={({ field }) => (
            <SurahSelect value={field.value} onChange={(v) => field.onChange(v)} />
          )}
        />
        {watchHifzSurahName && (
          <AyahRangeFields
            surahName={selectedHifzSurahName}
            endSurahName={watchHifzEndSurahName}
            value={{ from: hifzFromAyah || null, to: hifzToAyah || null }}
            onChange={(range) => {
              setValue('hifzFromAyah', range.from);
              setValue('hifzToAyah', range.to);
            }}
            onEndSurahChange={(next) => setValue('hifzEndSurahName', next)}
          />
        )}
        {assignment && (
          <View className="gap-2">
            <Text className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {tGlobal('Karakter (Hifz)')}
            </Text>
            <Controller
              name="gradeHifz"
              control={control}
              render={({ field }) => <GradePicker value={field.value} onChange={field.onChange} tGlobal={tGlobal} />}
            />
          </View>
        )}
      </View>

      <View className="gap-4 rounded-2xl border border-border bg-card p-4">
        <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{tGlobal('Repetition (Murajara)')}</Text>
        <Controller
          name="murajaraSurahName"
          control={control}
          render={({ field }) => (
            <SurahSelect value={field.value} onChange={(v) => field.onChange(v)} />
          )}
        />
        {watchMurajaraSurahName && (
          <AyahRangeFields
            surahName={selectedMurajaraSurahName}
            endSurahName={watchMurajaraEndSurahName}
            value={{ from: murajaraFromAyah || null, to: murajaraToAyah || null }}
            onChange={(range) => {
              setValue('murajaraFromAyah', range.from);
              setValue('murajaraToAyah', range.to);
            }}
            onEndSurahChange={(next) => setValue('murajaraEndSurahName', next)}
          />
        )}
        {assignment && (
          <View className="gap-2">
            <Text className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {tGlobal('Karakter (Murajara)')}
            </Text>
            <Controller
              name="gradeMurajara"
              control={control}
              render={({ field }) => <GradePicker value={field.value} onChange={field.onChange} tGlobal={tGlobal} />}
            />
          </View>
        )}
      </View>

      {assignment && (
        <View className="gap-2 rounded-2xl border border-border bg-card p-4">
          <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            {tGlobal('Rettelse & Feedback')}
          </Text>
          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <Input
                multiline
                numberOfLines={4}
                value={field.value || ''}
                onChangeText={field.onChange}
                placeholder={tGlobal('Skriv feedback...')}
                className="min-h-[100px]"
              />
            )}
          />
        </View>
      )}

      {(errors.hifzSurahName || errors.hifzFromAyah || errors.murajaraFromAyah) && (
        <Text className="text-sm text-destructive">
          {tGlobal(errors.hifzSurahName?.message || errors.hifzFromAyah?.message || errors.murajaraFromAyah?.message || '')}
        </Text>
      )}

      <Button onPress={handleSubmit(onSubmit)} loading={isLoading}>
        {assignment ? tGlobal('Gem ændring') : tGlobal('Opret lektie')}
      </Button>
    </ScrollView>
  );
}
