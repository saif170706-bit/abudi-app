'use client';

import { useGlobalTranslation } from '@/hooks/useGlobalTranslation';

import { useMemo, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirebase, useUser } from '@/firebase';
import { doc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { AyahRangeFields } from './AyahRangeFields';
import { SurahSelect } from '@/components/ui/searchable-select';
import { surahs as allSurahs } from '@/app/lib/surahs';
import { Label } from '@/components/ui/label';
import { useAwardPoints } from '@/hooks/use-award-points';
import { motion, AnimatePresence } from 'framer-motion';
import { SectionLabel, IslamicDivider } from '@/components/ui/primitives';

interface Assignment {
  id: string;
  dueDate: string;
  hifz: { 
    surahName: string; 
    fromAyah: number; 
    toAyah: number;
    endSurahName?: string | null; 
  };
  murajara: { 
    surahName: string; 
    fromAyah: number; 
    toAyah: number;
    endSurahName?: string | null;
  };
  gradeHifz?: string | null;
  gradeMurajara?: string | null;
  notes?: string | null;
  assignedAt: any;
  gradedAt?: any;
}

interface AssignmentFormProps {
  studentId: string;
  studentName?: string;   // For leaderboard display name
  studentPhoto?: string;  // For leaderboard avatar
  assignment?: Assignment;
  onFormSubmit: () => void;
}

const formSchema = z
  .object({
    hifzSurahName: z.string().optional().nullable(),
    hifzEndSurahName: z.string().optional().nullable(),
    hifzFromAyah: z.coerce.number().optional().nullable(),
    hifzToAyah: z.coerce.number().optional().nullable(),

    murajaraSurahName: z.string().optional().nullable(),
    murajaraEndSurahName: z.string().optional().nullable(),
    murajaraFromAyah: z.coerce.number().optional().nullable(),
    murajaraToAyah: z.coerce.number().optional().nullable(),

    gradeHifz: z.string().optional().nullable(),
    gradeMurajara: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  })
  .refine(
    (data) =>
      (data.hifzSurahName && data.hifzFromAyah && data.hifzToAyah) ||
      (data.murajaraSurahName && data.murajaraFromAyah && data.murajaraToAyah),
    {
      message: 'Du skal udfylde mindst én sektion (Hifz eller Murajara).',
      path: ['hifzSurahName'],
    }
  )
  .refine(
    (data) => !data.hifzSurahName || (data.hifzFromAyah && data.hifzToAyah),
    {
      message: 'Hvis Hifz Surah er valgt, skal Fra og Til Ayah udfyldes.',
      path: ['hifzFromAyah'],
    }
  )
  .refine(
    (data) => !data.murajaraSurahName || (data.murajaraFromAyah && data.murajaraToAyah),
    {
      message: 'Hvis Murajara Surah er valgt, skal Fra og Til Ayah udfyldes.',
      path: ['murajaraFromAyah'],
    }
  );

export default function AssignmentForm({ studentId, studentName, studentPhoto, assignment, onFormSubmit }: AssignmentFormProps) {
  const { tGlobal } = useGlobalTranslation();
  const { firestore } = useFirebase();
  const { user: teacher } = useUser();
  const { toast } = useToast();
  const { awardPoints } = useAwardPoints();
  const [isLoading, setIsLoading] = useState(false);

  const surahSelectItems = useMemo(
    () =>
      allSurahs.map((s) => ({
        id: String(s.number),
        number: s.number,
        english: s.englishName,
        arabic: s.name,
      })),
    []
  );

  const initialHifzSurah = useMemo(() => {
    if (!assignment?.hifz.surahName) return null;
    const surah = allSurahs.find((s) => s.name === assignment.hifz.surahName);
    return surah ? String(surah.number) : null;
  }, [assignment]);

  const initialHifzEndSurah = useMemo(() => {
    if (!assignment?.hifz.endSurahName) return null;
    const surah = allSurahs.find((s) => s.name === assignment.hifz.endSurahName);
    return surah ? String(surah.number) : null;
  }, [assignment]);

  const initialMurajaraSurah = useMemo(() => {
    if (!assignment?.murajara.surahName) return null;
    const surah = allSurahs.find((s) => s.name === assignment.murajara.surahName);
    return surah ? String(surah.number) : null;
  }, [assignment]);

  const initialMurajaraEndSurah = useMemo(() => {
    if (!assignment?.murajara.endSurahName) return null;
    const surah = allSurahs.find((s) => s.name === assignment.murajara.endSurahName);
    return surah ? String(surah.number) : null;
  }, [assignment]);

  const {
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      hifzSurahName: initialHifzSurah,
      hifzEndSurahName: initialHifzEndSurah,
      hifzFromAyah: assignment?.hifz.fromAyah || undefined,
      hifzToAyah: assignment?.hifz.toAyah || undefined,

      murajaraSurahName: initialMurajaraSurah,
      murajaraEndSurahName: initialMurajaraEndSurah,
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

  const selectedHifzSurahName = watchHifzSurahName
    ? allSurahs.find((s) => String(s.number) === watchHifzSurahName)?.name ?? null
    : null;

  const selectedMurajaraSurahName = watchMurajaraSurahName
    ? allSurahs.find((s) => String(s.number) === watchMurajaraSurahName)?.name ?? null
    : null;

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!firestore || !teacher) {
      toast({
        variant: 'destructive',
        title: 'Ikke klar endnu',
        description: 'Firebase/login er ikke klar. Prøv igen om et øjeblik.',
      });
      return;
    }

    setIsLoading(true);

    const hifzSurah = data.hifzSurahName
      ? allSurahs.find((s) => s.number === parseInt(data.hifzSurahName!, 10))
      : null;

    const hifzEndSurah = data.hifzEndSurahName
      ? allSurahs.find((s) => s.number === parseInt(data.hifzEndSurahName!, 10))
      : null;

    const murajaraSurah = data.murajaraSurahName
      ? allSurahs.find((s) => s.number === parseInt(data.murajaraSurahName!, 10))
      : null;

    const murajaraEndSurah = data.murajaraEndSurahName
      ? allSurahs.find((s) => s.number === parseInt(data.murajaraEndSurahName!, 10))
      : null;

    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 7);

    try {
      if (assignment) {
        // 1. Save grades + note + updated lektie back to the OLD (graded) assignment
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
          gradedAt: (data.gradeHifz || data.gradeMurajara) ? serverTimestamp() : (assignment.gradedAt || null),
        };

        const oldDocRef = doc(firestore, 'students', studentId, 'assignments', assignment.id);
        await setDoc(oldDocRef, updatedAssignmentData, { merge: true });

        // Award points for grading — non-blocking
        if (data.gradeHifz || data.gradeMurajara) {
          awardPoints({
            studentId,
            studentName: studentName || 'Elev',
            photoURL: studentPhoto || null,
            gradeHifz: data.gradeHifz,
            gradeMurajara: data.gradeMurajara,
            previousGradeHifz: assignment.gradeHifz,
            previousGradeMurajara: assignment.gradeMurajara,
          });
        }
      } else {
        // Pure create: no existing assignment to grade
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
        const collectionRef = collection(firestore, 'students', studentId, 'assignments');
        await addDoc(collectionRef, newAssignmentData);
      }
      onFormSubmit();
    } catch (error: any) {
      const path = assignment
        ? `students/${studentId}/assignments/${assignment.id}`
        : `students/${studentId}/assignments`;
      const operation = assignment ? 'update' : 'create';

      const requestResourceData = assignment ? { ...data } : { hifzSurah: hifzSurah?.name };
      errorEmitter.emit(
        'permission-error',
        new FirestorePermissionError({
          path,
          operation,
          requestResourceData,
        })
      );

      console.error('Error saving assignment:', error);
      toast({
        variant: 'destructive',
        title: 'Fejl',
        description: 'Kunne ikke gemme lektien.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const gradeOptions = ['Perfekt', 'Meget godt', 'Godt', 'Ikke læst'];

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 pb-10">
      {/* HIFZ */}
      <div className="glass-card shadow-xl">
        <div className="glass-card-inner !p-6 space-y-6">
          <SectionLabel>Memorering (Hifz)</SectionLabel>

          <div className="space-y-4">
            <Controller
              name="hifzSurahName"
              control={control}
              render={({ field }) => (
                <SurahSelect
                  surahs={surahSelectItems}
                  value={field.value}
                  onChange={(val) => field.onChange(val === '' ? null : val)}
                  placeholder={tGlobal("Vælg surah…")}
                />
              )}
            />

            {watchHifzSurahName && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
              >
                <AyahRangeFields
                  surahs={allSurahs}
                  surahName={selectedHifzSurahName}
                  endSurahName={watchHifzEndSurahName}
                  value={{ from: hifzFromAyah || null, to: hifzToAyah || null }}
                  onChange={(range) => {
                    setValue('hifzFromAyah', range.from);
                    setValue('hifzToAyah', range.to);
                  }}
                  onEndSurahChange={(next) => setValue('hifzEndSurahName', next)}
                  label="Hifz-interval"
                />
              </motion.div>
            )}

            {assignment && (
              <div className="space-y-3">
                <Label className="text-[11px] font-black uppercase tracking-widest text-primary/40 ml-1">Karakter (Hifz)</Label>
                <Controller
                  name="gradeHifz"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <SelectTrigger className="h-14 rounded-2xl border-white/40 bg-white/60 dark:bg-white/5 shadow-inner text-lg px-6 font-display">
                        <SelectValue placeholder={tGlobal("Vælg...")} />
                      </SelectTrigger>
                      <SelectContent>
                        {gradeOptions.map((g) => (
                          <SelectItem key={g} value={g}>
                            {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MURAJARA */}
      <div className="glass-card shadow-xl">
        <div className="glass-card-inner !p-6 space-y-6">
          <SectionLabel>Repetition (Murajara)</SectionLabel>

          <div className="space-y-4">
            <Controller
              name="murajaraSurahName"
              control={control}
              render={({ field }) => (
                <SurahSelect
                  surahs={surahSelectItems}
                  value={field.value}
                  onChange={(val) => field.onChange(val === '' ? null : val)}
                  placeholder={tGlobal("Vælg surah…")}
                />
              )}
            />

            {watchMurajaraSurahName && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
              >
                <AyahRangeFields
                  surahs={allSurahs}
                  surahName={selectedMurajaraSurahName}
                  endSurahName={watchMurajaraEndSurahName}
                  value={{ from: murajaraFromAyah || null, to: murajaraToAyah || null }}
                  onChange={(range) => {
                    setValue('murajaraFromAyah', range.from);
                    setValue('murajaraToAyah', range.to);
                  }}
                  onEndSurahChange={(next) => setValue('murajaraEndSurahName', next)}
                  label="Murajara-interval"
                />
              </motion.div>
            )}

            {assignment && (
              <div className="space-y-3">
                <Label className="text-[11px] font-black uppercase tracking-widest text-primary/40 ml-1">Karakter (Murajara)</Label>
                <Controller
                  name="gradeMurajara"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <SelectTrigger className="h-14 rounded-2xl border-white/40 bg-white/60 dark:bg-white/5 shadow-inner text-lg px-6 font-display">
                        <SelectValue placeholder={tGlobal("Vælg...")} />
                      </SelectTrigger>
                      <SelectContent>
                        {gradeOptions.map((g) => (
                          <SelectItem key={g} value={g}>
                            {g}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* NOTES — only shown when grading an existing assignment */}
      {assignment && (
      <div className="glass-card shadow-xl">
        <div className="glass-card-inner !p-6 space-y-6">
          <SectionLabel>Rettelse & Feedback</SectionLabel>
          <div className="space-y-3">
            <Label htmlFor="notes" className="text-[11px] font-black uppercase tracking-widest text-primary/40 ml-1">Besked om den lektie der er bedømt i dag</Label>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <Textarea
                  id="notes"
                  {...field}
                  value={field.value || ''}
                  placeholder={tGlobal("Skriv feedback, rettelse eller hvad eleven skal arbejde på...")}
                  className="min-h-[120px] rounded-2xl border-white/40 bg-white/60 dark:bg-white/5 shadow-inner text-lg p-6 font-display placeholder:text-primary/20 dark:placeholder:text-white/20"
                />
              )}
            />
          </div>
        </div>
      </div>
      )}

      {(errors.hifzSurahName || errors.murajaraSurahName || errors.hifzFromAyah || errors.murajaraFromAyah) && (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-sm space-y-2"
        >
          <p className="font-black uppercase tracking-widest">Der er fejl i formularen:</p>
          <ul className="list-disc list-inside font-medium opacity-80">
            {errors.hifzSurahName && <li>{errors.hifzSurahName.message}</li>}
            {errors.hifzFromAyah && <li>{errors.hifzFromAyah.message}</li>}
            {errors.murajaraFromAyah && <li>{errors.murajaraFromAyah.message}</li>}
          </ul>
        </motion.div>
      )}

      <Button
        type="submit"
        className="w-full h-18 text-xl font-display rounded-3xl bg-primary hover:bg-[#00332B] text-white shadow-2xl shadow-[#004D40]/20 active:scale-[0.98] transition-all"
        disabled={isLoading}
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-6 w-6 animate-spin" />
        ) : (
          <Save className="mr-2 h-6 w-6" />
        )}
        {assignment ? 'Gem ændring' : 'Opret lektie'}
      </Button>
    </form>

  );
}
