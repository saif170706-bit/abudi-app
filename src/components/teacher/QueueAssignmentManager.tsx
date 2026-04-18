'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { surahs as allSurahs } from '@/app/lib/surahs';
import { useFirebase, useUser } from '@/firebase';
import {
  doc,
  collection,
  serverTimestamp,
  query,
  orderBy,
  getDocs,
  writeBatch,
  deleteField,
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Save, BookOpen, FileText, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { AyahRangeFields } from './AyahRangeFields';
import { SurahSelect } from '@/components/ui/searchable-select';
import { useLanguage, type Language } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { SectionLabel, IslamicDivider } from '@/components/ui/primitives';

interface AssignmentPart {
  surahName: string;
  fromAyah: number;
  toAyah: number;
  endSurahName?: string | null;
}

interface Assignment {
  id: string;
  dueDate: string;
  hifz: AssignmentPart;
  murajara: AssignmentPart;
  gradeHifz?: string | null;
  gradeMurajara?: string | null;
  notes?: string | null;
}

interface QueueAssignmentManagerProps {
  studentId: string;
  studentName: string;
  onCycleComplete: () => void;
}

const formSchema = z.object({
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
});

const translations: Record<string, Record<Language, string>> = {
    title: { da: 'Lektiehjælp', en: 'Homework Reading', ar: 'قراءة الواجب' , so: "Akhriska"},
    studentNameLabel: { da: 'Elev: {name}', en: 'Student: {name}', ar: 'طالب: {name}', so: 'Arday: {name}' },
    gradeCurrent: { da: 'Bedøm nuværende lektie', en: 'Grade Current Homework', ar: 'تقييم الواجب' , so: "Siyo Darajo Shaqagurīga"},
    notSpecified: { da: 'Ikke specificeret', en: 'Not specified', ar: 'غير محدد' , so: "Lama cayimin"},
    hifzLabel: { da: 'Hifz', en: 'Hifz', ar: 'الحفظ' , so: "Xifdi"},
    murajaraLabel: { da: 'Murajara', en: 'Murajara', ar: 'المراجعة' , so: "Muraajaco"},
    gradeHifzLabel: { da: 'Karakter (Hifz)', en: 'Grade (Hifz)', ar: 'درجة (الحفظ)' , so: "Darajo (Xifdi)"},
    gradeMurajaraLabel: { da: 'Karakter (Murajara)', en: 'Grade (Murajara)', ar: 'درجة (المراجعة)' , so: "Darajo (Muraajaco)"},
    selectGrade: { da: 'Vælg karakter...', en: 'Select grade...', ar: 'اختر الدرجة...' , so: "Dooro darajo..."},
    createNew: { da: 'Ny Lektie', en: 'New Homework', ar: 'واجب جديد' , so: "Shaqaguri Cusub"},
    hifzSurah: { da: 'Hifz Surah', en: 'Hifz Surah', ar: 'سورة الحفظ' , so: "Xifdi Suurad"},
    murajaraSurah: { da: 'Murajara Surah', en: 'Murajara Surah', ar: 'سورة المراجعة' , so: "Muraajaco Suurad"},
    notesLabel: { da: 'Noter', en: 'Notes', ar: 'ملاحظات' , so: "Notes"},
    notesPlaceholder: { da: 'Skriv feedback eller hvad eleven skal arbejde på...', en: 'Write feedback or what the student needs to work on...', ar: 'اكتب ملاحظاتك للطالب...' , so: "Qor dhiirigelyn ama aqooon ardaga u baabn"},
    saveAndReturn: { da: 'Gem & Afslut', en: 'Save & Complete', ar: 'حفظ وإنهاء' , so: "Bedbaadi & Dhamayo"},
};

function CurrentAssignmentPart({ part, label, icon }: { part: AssignmentPart, label: string, icon: React.ReactNode }) {
    const { language } = useLanguage();
    if (!part.surahName || !part.fromAyah || !part.toAyah) {
        return (
            <div className="flex items-start gap-3 py-2">
                <div className="mt-1 text-muted-foreground">{icon}</div>
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
                    <p className="text-sm font-medium text-muted-foreground">{translations.notSpecified[language]}</p>
                </div>
            </div>
        );
    }
    
    const startSurahInfo = allSurahs.find(s => s.name === part.surahName);
    const startName = startSurahInfo ? startSurahInfo.englishName : part.surahName;

    // Cross-surah display logic
    const hasEndSurah = part.endSurahName && part.endSurahName !== part.surahName;

    return (
        <div className="flex items-start gap-3 py-2">
            <div className="mt-1 text-primary">{icon}</div>
            <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className="text-[15px] font-bold text-foreground">
                    {hasEndSurah ? (
                        <>
                            {startName} {part.fromAyah} - {allSurahs.find(s => s.name === part.endSurahName)?.englishName || part.endSurahName} {part.toAyah}
                        </>
                    ) : (
                        <>
                            {startName} ({part.fromAyah} - {part.toAyah})
                        </>
                    )}
                </p>
            </div>
        </div>
    );
}

export default function QueueAssignmentManager({ studentId, studentName, onCycleComplete }: QueueAssignmentManagerProps) {
  const { firestore } = useFirebase();
  const { user: teacher } = useUser();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [currentAssignment, setCurrentAssignment] = useState<Assignment | null>(null);
  const [isFetchingAssignment, setIsFetchingAssignment] = useState(true);
  const { language } = useLanguage();

  const t = (key: string, params?: Record<string, string | number>) => {
      let text = translations[key]?.[language] || translations[key]?.['en'] || key;
      if (params) {
          Object.keys(params).forEach(pKey => {
              text = text.replace(`{${pKey}}`, String(params[pKey]));
          });
      }
      return text;
  };

  const {
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      hifzSurahName: null,
      hifzEndSurahName: null,
      hifzFromAyah: null,
      hifzToAyah: null,
      murajaraSurahName: null,
      murajaraEndSurahName: null,
      murajaraFromAyah: null,
      murajaraToAyah: null,
      gradeHifz: null,
      gradeMurajara: null,
      notes: '',
    },
  });
  
  useEffect(() => {
    if (!firestore || !studentId) return;

    const fetchCurrentAssignment = async () => {
        setIsFetchingAssignment(true);
        try {
            const assignmentsRef = collection(firestore, 'students', studentId, 'assignments');
            const q = query(assignmentsRef, orderBy('assignedAt', 'desc'));
            const querySnapshot = await getDocs(q);
            
            let foundAssignment: Assignment | null = null;
            for (const doc of querySnapshot.docs) {
              const assignmentData = { id: doc.id, ...doc.data() } as Assignment;
              if (!assignmentData.gradeHifz && !assignmentData.gradeMurajara) {
                foundAssignment = assignmentData;
                break; 
              }
            }
            
            if (foundAssignment) {
                setCurrentAssignment(foundAssignment);
                reset({
                    gradeHifz: foundAssignment.gradeHifz || null,
                    gradeMurajara: foundAssignment.gradeMurajara || null,
                    notes: foundAssignment.notes || '',
                });
            } else {
                setCurrentAssignment(null);
            }
        } catch (error) {
            console.error("Error fetching current assignment: ", error);
            toast({ variant: 'destructive', title: 'Fejl', description: 'Kunne ikke hnte nuværende lektie.' });
        } finally {
            setIsFetchingAssignment(false);
        }
    };

    fetchCurrentAssignment();
  }, [studentId, firestore, reset, toast]);

  const surahSelectItems = useMemo(() => {
    return allSurahs.map(s => ({
        id: String(s.number),
        number: s.number,
        english: s.englishName,
        arabic: s.name,
    }));
  }, []);

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    if (!firestore || !teacher) return;

    const hasNewAssignment = (data.hifzSurahName && data.hifzFromAyah && data.hifzToAyah) || (data.murajaraSurahName && data.murajaraFromAyah && data.murajaraToAyah);

    if (!currentAssignment && !hasNewAssignment) {
        toast({ variant: 'destructive', title: 'Intet at gemme', description: 'Du skal enten bedømme en lektie eller oprette en ny.' });
        return;
    }
    
    setIsLoading(true);

    const hifzSurah = data.hifzSurahName ? allSurahs.find(s => s.number === parseInt(data.hifzSurahName!, 10)) : null;
    const hifzEndSurah = data.hifzEndSurahName ? allSurahs.find(s => s.number === parseInt(data.hifzEndSurahName!, 10)) : null;
    const murajaraSurah = data.murajaraSurahName ? allSurahs.find(s => s.number === parseInt(data.murajaraSurahName!, 10)) : null;
    const murajaraEndSurah = data.murajaraEndSurahName ? allSurahs.find(s => s.number === parseInt(data.murajaraEndSurahName!, 10)) : null;

    try {
        const batch = writeBatch(firestore);

        if (currentAssignment) {
            const assignmentDocRef = doc(firestore, 'students', studentId, 'assignments', currentAssignment.id);
            batch.update(assignmentDocRef, {
                gradeHifz: data.gradeHifz || null,
                gradeMurajara: data.gradeMurajara || null,
                notes: data.notes || null,
            });
        }
        
        if(hasNewAssignment) {
            const newAssignmentRef = doc(collection(firestore, 'students', studentId, 'assignments'));
            const defaultDueDate = new Date();
            defaultDueDate.setDate(defaultDueDate.getDate() + 7);

            batch.set(newAssignmentRef, {
                studentId: studentId,
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
                // Only assign notes to the new assignment if we weren't grading a current one.
                // This prevents duplication of session feedback into the future plan.
                notes: currentAssignment ? null : (data.notes || null),
                assignedAt: serverTimestamp(),
            });
        }

        // Leaderboard recalculation is now handled automatically by the
        // `onAssignmentWrite` Cloud Function in functions/index.js.
        // This removes ~50+ Firestore reads that previously happened here on every session.
        await batch.commit();
        onCycleComplete();
    } catch (error: any) {
      console.error('Error saving assignment cycle:', error);
      errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: `students/${studentId}/assignments`,
          operation: 'write',
          requestResourceData: { note: "Batch write for grading and creating new assignment failed." },
      }));
      toast({ variant: 'destructive', title: 'Fejl', description: 'Kunne ikke gemme lektien.' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const gradeOptions = ['Perfekt', 'Meget godt', 'Godt', 'Ikke læst'];
  const watchHifzSurahName = watch('hifzSurahName');
  const watchHifzEndSurahName = watch('hifzEndSurahName');
  const watchMurajaraSurahName = watch('murajaraSurahName');
  const watchMurajaraEndSurahName = watch('murajaraEndSurahName');

  const hifzFromAyah = watch('hifzFromAyah');
  const hifzToAyah = watch('hifzToAyah');
  const murajaraFromAyah = watch('murajaraFromAyah');
  const murajaraToAyah = watch('murajaraToAyah');

  if (isFetchingAssignment) {
    return (
        <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="w-full space-y-10 pb-10">
        <AnimatePresence mode="wait">
            <motion.form 
                key={studentId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={handleSubmit(onSubmit)} 
                className="space-y-10 w-full"
            >
                {/* GRADING SECTION */}
                {currentAssignment && (
                    <div className="space-y-6">
                        <SectionLabel>{t('gradeCurrent')}</SectionLabel>
                        <div className="glass-card shadow-2xl border-emerald-500/10">
                            <div className="glass-card-inner !p-8 space-y-10">
                                {/* Hifz Grade */}
                                <div className="space-y-4">
                                    <CurrentAssignmentPart part={currentAssignment.hifz} label={t('hifzLabel')} icon={<BookOpen className="h-6 w-6" />} />
                                    <div className="space-y-3">
                                        <Label className="text-[11px] font-black uppercase tracking-widest text-primary/40 ml-1">{t('gradeHifzLabel')}</Label>
                                        <Controller
                                            name="gradeHifz"
                                            control={control}
                                            render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value || ''}>
                                                <SelectTrigger className="h-14 rounded-2xl border-border bg-card/60 dark:bg-card/20 shadow-inner font-bold text-primary dark:text-emerald-400">
                                                    <SelectValue placeholder={t('selectGrade')} />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-2xl border-border backdrop-blur-xl">
                                                    {gradeOptions.map(grade => (<SelectItem key={grade} value={grade} className="py-3 font-bold">{grade}</SelectItem>))}
                                                </SelectContent>
                                            </Select>
                                            )}
                                        />
                                    </div>
                                </div>

                                <IslamicDivider />

                                {/* Murajara Grade */}
                                <div className="space-y-4">
                                    <CurrentAssignmentPart part={currentAssignment.murajara} label={t('murajaraLabel')} icon={<FileText className="h-6 w-6" />} />
                                    <div className="space-y-3">
                                        <Label className="text-[11px] font-black uppercase tracking-widest text-primary/40 ml-1">{t('gradeMurajaraLabel')}</Label>
                                        <Controller
                                            name="gradeMurajara"
                                            control={control}
                                            render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value || ''}>
                                                <SelectTrigger className="h-14 rounded-2xl border-border bg-card/60 dark:bg-card/20 shadow-inner font-bold text-primary dark:text-emerald-400">
                                                    <SelectValue placeholder={t('selectGrade')} />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-2xl border-border backdrop-blur-xl">
                                                    {gradeOptions.map(grade => (<SelectItem key={grade} value={grade} className="py-3 font-bold">{grade}</SelectItem>))}
                                                </SelectContent>
                                            </Select>
                                            )}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* CREATE NEXT SECTION */}
                <div className="space-y-6">
                    <SectionLabel>{t('createNew')}</SectionLabel>
                    <div className="glass-card shadow-2xl">
                        <div className="glass-card-inner !p-8 space-y-10">
                            {/* Next Hifz */}
                            <div className="space-y-4">
                                <div className="space-y-3">
                                    <Label className="text-[11px] font-black uppercase tracking-widest text-primary/40 ml-1">{t('hifzSurah')}</Label>
                                    <Controller
                                        name="hifzSurahName"
                                        control={control}
                                        render={({ field }) => (
                                            <SurahSelect
                                                surahs={surahSelectItems}
                                                value={field.value}
                                                onChange={(val) => field.onChange(val || null)}
                                            />
                                        )}
                                    />
                                </div>
                                {watchHifzSurahName && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                                        <AyahRangeFields
                                            surahs={allSurahs}
                                            surahName={allSurahs.find(s => String(s.number) === watchHifzSurahName)?.name}
                                            endSurahName={watchHifzEndSurahName}
                                            value={{ from: hifzFromAyah || null, to: hifzToAyah || null }}
                                            onChange={(range) => {
                                                setValue('hifzFromAyah', range.from);
                                                setValue('hifzToAyah', range.to);
                                            }}
                                            onEndSurahChange={(next) => setValue('hifzEndSurahName', next)}
                                            label={t('hifzLabel')}
                                        />
                                    </motion.div>
                                )}
                            </div>

                            <IslamicDivider />

                            {/* Next Murajara */}
                            <div className="space-y-4">
                                <div className="space-y-3">
                                    <Label className="text-[11px] font-black uppercase tracking-widest text-primary/40 ml-1">{t('murajaraSurah')}</Label>
                                    <Controller
                                        name="murajaraSurahName"
                                        control={control}
                                        render={({ field }) => (
                                            <SurahSelect
                                                surahs={surahSelectItems}
                                                value={field.value}
                                                onChange={(val) => field.onChange(val || null)}
                                            />
                                        )}
                                    />
                                </div>
                                {watchMurajaraSurahName && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                                        <AyahRangeFields
                                            surahs={allSurahs}
                                            surahName={allSurahs.find(s => String(s.number) === watchMurajaraSurahName)?.name}
                                            endSurahName={watchMurajaraEndSurahName}
                                            value={{ from: murajaraFromAyah || null, to: murajaraToAyah || null }}
                                            onChange={(range) => {
                                                setValue('murajaraFromAyah', range.from);
                                                setValue('murajaraToAyah', range.to);
                                            }}
                                            onEndSurahChange={(next) => setValue('murajaraEndSurahName', next)}
                                            label={t('murajaraLabel')}
                                        />
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* NOTES SECTION */}
                <div className="space-y-6">
                    <SectionLabel>{t('notesLabel')}</SectionLabel>
                    <div className="glass-card shadow-2xl">
                        <div className="glass-card-inner !p-8">
                            <div className="space-y-3">
                                <Label htmlFor="queue-notes" className="text-[11px] font-black uppercase tracking-widest text-primary/40 ml-1">Session Feedback</Label>
                                <Controller
                                    name="notes"
                                    control={control}
                                    render={({ field }) => (
                                        <Textarea
                                            id="queue-notes"
                                            {...field}
                                            value={field.value || ''}
                                            placeholder={t('notesPlaceholder')}
                                            className="min-h-[140px] rounded-2xl border-border bg-card/60 dark:bg-card/20 shadow-inner text-[16px] p-5 font-medium leading-relaxed outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-primary/40 dark:placeholder:text-emerald-400/40"
                                        />
                                    )}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <Button 
                        type="submit" 
                        className="w-full h-20 rounded-[32px] text-xl font-display bg-primary hover:bg-[#00332B] text-white shadow-2xl shadow-[#004D40]/20 flex items-center justify-center gap-4 group" 
                        disabled={isLoading}
                    >
                        {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform"><CheckCircle2 className="h-5 w-5" /></div>}
                        <span className="tracking-tight">{t('saveAndReturn')}</span>
                    </Button>
                </motion.div>
            </motion.form>
        </AnimatePresence>
    </div>
  );
}
