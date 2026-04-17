'use client';

import { useMemo, useState } from 'react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Loader2, Calendar, PlusCircle, X, History, Sparkles, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import AssignmentForm from './AssignmentForm';
import { useToast } from '@/hooks/use-toast';
import { surahs } from '@/app/lib/surahs';
import { useLanguage, type Language } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';
import { FullscreenSheet } from '@/components/ui/fullscreen-sheet';
import { motion, AnimatePresence } from 'framer-motion';
import { SectionLabel, IslamicDivider } from '@/components/ui/primitives';
import { useGlobalTranslation } from '@/hooks/useGlobalTranslation';

interface AssignmentPart {
  surahName: string;
  fromAyah: number;
  toAyah: number;
  endSurahName?: string | null;
}

interface Assignment {
  id: string;
  dueDate: string; // YYYY-MM-DD
  hifz: AssignmentPart;
  murajara: AssignmentPart;
  gradeHifz?: string | null;
  gradeMurajara?: string | null;
  assignedAt: any; // Firestore Timestamp
}

const translations: Record<string, Record<Language, string>> = {
  notSpecified: { da: 'Ikke valgt', en: 'Not specified', ar: 'غير محدد' , so: "Lama cayimin"},
  notGraded: { da: 'Mangler bedømmelse', en: 'Not graded yet', ar: 'لم يتم التقييم بعد' , so: "Wali lamadhiginin buuxiyo"},
  homework: { da: 'Lektie', en: 'Homework', ar: 'واجب' , so: "Shaqada Guriga"},
  created: { da: 'Oprettet', en: 'Created', ar: 'تم الإنشاء' , so: "Abuuray"},
  hifz: { da: 'Memorering', en: 'Memorization', ar: 'حفظ' , so: "Xifdin"},
  murajara: { da: 'Repetition', en: 'Revision', ar: 'مراجعة' , so: "Dib-u-eegis"},
  studentHomework: { da: 'Lektier', en: 'Homework', ar: 'الالواجبات' , so: "Shaqada Guriga"},
  createHomework: { da: 'Ny Lektie', en: 'New Homework', ar: 'واجب جديد' , so: "Shaqaguri Cusub"},
  activeHomeworkExists: { da: 'Aktiv lektie', en: 'Active homework', ar: 'واجب نشط' , so: "Shaqaguri Furan"},
  gradeCurrentHomework: {
    da: 'Bedøm nuværende lektie før du opretter en ny.',
    en: 'Grade the current homework before creating a new one.',
    ar: 'يجب تقييم الواجب الحالي قبل إنشاء واجب جديد.', so: "Siyo buuxiyna shaqadaada guriga kahor intaatan furin midcusub."},
  upcomingHomework: { da: 'Kommende', en: 'Upcoming', ar: 'الواجبات القادمة' , so: "Soosocda"},
  noUpcoming: { da: 'Ingen planlagte lektier.', en: 'No upcoming homework found.', ar: 'لم يتم العثور على واجبات قادمة.' , so: "Lama Helin Shaqaguri dhaw."},
  previousHomework: { da: 'Tidligere', en: 'Previous', ar: 'الواجبات السابقة' , so: "Hore"},
  noPrevious: { da: 'Ingen historik fundet.', en: 'No previous homework found.', ar: 'لم يتم العثور على واجبات سابقة.' , so: "Lama Hali Shaqaguri hore."},
  editHomework: { da: 'Rediger Lektie', en: 'Edit Homework', ar: 'تعديل الواجب' , so: "Wax Bedel Shaqaguriga"},
  newHomework: { da: 'Opret Ny Lektie', en: 'Create New Homework', ar: 'إنشاء واجب جديد' , so: "Samaysasho Shaqaguri cusub"},
};

const gradeTranslations: Record<string, Record<Language, string>> = {
  Perfekt: { da: 'Perfekt', en: 'Perfect', ar: 'ممتاز' , so: "Wanaagsan!"},
  'Meget godt': { da: 'Meget godt', en: 'Very good', ar: 'جيد جدًا' , so: "Aad U Wanaagsan"},
  Godt: { da: 'Godt', en: 'Good', ar: 'جيد' , so: "Fiican"},
  'Ikke læst': { da: 'Ikke læst', en: 'Not read', ar: 'لم تتم القراءة' , so: "Lama akhrin"},
};

function getGradeBadgeVariant(
  grade: string | null | undefined
): 'default' | 'secondary' | 'outline' | 'destructive' | 'info' {
  if (!grade) return 'secondary';
  switch (grade) {
    case 'Perfekt':
      return 'default';
    case 'Meget godt':
      return 'info';
    case 'Godt':
      return 'outline';
    case 'Ikke læst':
      return 'destructive';
    default:
      return 'secondary';
  }
}

function AssignmentDisplayCompact({
  part,
  t,
  language,
}: {
  part: AssignmentPart;
  t: (key: string) => string;
  language: Language;
}) {
  if (!part?.surahName) return <span className="text-muted-foreground">{t('notSpecified')}</span>;
  
  const startSurahInfo = surahs.find((s) => s.name === part.surahName || s.englishName === part.surahName);
  const startName = startSurahInfo ? (language === 'ar' ? startSurahInfo.name : startSurahInfo.englishName) : part.surahName;
  
  // Cross-surah check
  const hasEndSurah = part.endSurahName && part.endSurahName !== part.surahName;
  
  if (hasEndSurah) {
    const endSurahInfo = surahs.find((s) => s.name === part.endSurahName || s.englishName === part.endSurahName);
    const endName = endSurahInfo ? (language === 'ar' ? endSurahInfo.name : endSurahInfo.englishName) : part.endSurahName;
    return (
      <span className="truncate">
        {startName} {part.fromAyah} - {endName} {part.toAyah}
      </span>
    );
  }

  return (
    <span className={cn("truncate", language === 'ar' && "font-quran text-lg")}>
      {startName} ({part.fromAyah}-{part.toAyah})
    </span>
  );
}

function AssignmentCard({
  assignment,
  onEdit,
  isUpcoming,
  t,
  language,
}: {
  assignment: Assignment;
  onEdit: () => void;
  isUpcoming?: boolean;
  t: (key: string) => string;
  language: Language;
}) {
  const { tGlobal } = useGlobalTranslation();
  const dateStr = assignment.assignedAt?.toDate?.()
    ? assignment.assignedAt.toDate().toLocaleDateString('da-DK', {
        day: 'numeric',
        month: 'short',
      })
    : '...';

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onEdit}
      className={cn(
        'group relative overflow-visible cursor-pointer w-full',
        isUpcoming ? 'z-10' : 'z-0'
      )}
    >
      <div className={cn(
        "glass-card transition-all duration-300 shadow-xl",
        isUpcoming ? "ring-2 ring-[#DEA93E] shadow-[#DEA93E]/10" : "hover:border-[#004D40]/20"
      )}>
        <div className="glass-card-inner !p-5">
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#004D40]/5 border border-[#004D40]/10 text-[10px] font-black uppercase tracking-widest text-[#004D40]">
                    <Calendar className="h-3 w-3" />
                    {dateStr}
                </div>
                {isUpcoming && (
                    <div className="px-3 py-1 rounded-full bg-[#DEA93E]/10 border border-[#DEA93E]/20 text-[10px] font-black uppercase tracking-widest text-[#B4841F]">
                        {tGlobal('Næste lektie')}
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#004D40]/40 mb-1">{t('hifz')}</p>
                        <h4 className="text-sm font-bold text-[#004D40] truncate">
                            <AssignmentDisplayCompact part={assignment.hifz} t={t} language={language} />
                        </h4>
                    </div>
                    <Badge className={cn(
                        "shrink-0 h-6 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest border-none text-white",
                        assignment.gradeHifz === 'Perfekt' ? 'bg-[#004D40]' : 
                        assignment.gradeHifz === 'Meget godt' ? 'bg-[#DEA93E]' :
                        assignment.gradeHifz === 'Godt' ? 'bg-emerald-500' :
                        assignment.gradeHifz === 'Ikke læst' ? 'bg-rose-500' : 'bg-slate-200 text-slate-500'
                    )}>
                        {assignment.gradeHifz
                            ? gradeTranslations[assignment.gradeHifz]?.[language] || assignment.gradeHifz
                            : t('notGraded')}
                    </Badge>
                </div>

                <div className="h-px w-full bg-[#004D40]/5" />

                <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#004D40]/40 mb-1">{t('murajara')}</p>
                        <h4 className="text-sm font-bold text-[#004D40] truncate">
                            <AssignmentDisplayCompact part={assignment.murajara} t={t} language={language} />
                        </h4>
                    </div>
                    <Badge className={cn(
                        "shrink-0 h-6 px-3 rounded-lg text-[10px] font-black uppercase tracking-widest border-none text-white",
                        assignment.gradeMurajara === 'Perfekt' ? 'bg-[#004D40]' : 
                        assignment.gradeMurajara === 'Meget godt' ? 'bg-[#DEA93E]' :
                        assignment.gradeMurajara === 'Godt' ? 'bg-emerald-500' :
                        assignment.gradeMurajara === 'Ikke læst' ? 'bg-rose-500' : 'bg-slate-200 text-slate-500'
                    )}>
                        {assignment.gradeMurajara
                            ? gradeTranslations[assignment.gradeMurajara]?.[language] || assignment.gradeMurajara
                            : t('notGraded')}
                    </Badge>
                </div>
            </div>
        </div>
      </div>
    </motion.div>
  );
}


export default function AssignmentManager({
  studentId,
  studentName,
}: {
  studentId: string;
  studentName: string;
}) {
  const { firestore } = useFirebase();
  const { toast } = useToast();
  const { language } = useLanguage();
  const { tGlobal } = useGlobalTranslation();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | undefined>(undefined);

  const t = (key: string, params?: Record<string, string>) => {
    let text = translations[key]?.[language] || translations[key]?.['en'] || key;
    if (params) {
      Object.keys(params).forEach((pKey) => {
        text = text.replace(`{${pKey}}`, String(params[pKey]));
      });
    }
    return text;
  };

  const assignmentsQuery = useMemoFirebase(() => {
    if (!studentId || !firestore) return null;
    return query(
      collection(firestore, 'students', studentId, 'assignments'),
      orderBy('assignedAt', 'desc')
    );
  }, [studentId, firestore]);

  const { data: assignments, isLoading: areAssignmentsLoading } =
    useCollection<Assignment>(assignmentsQuery);

  const { upcomingAssignment, previousAssignments } = useMemo(() => {
    let upcoming: Assignment | null = null;
    const previous: Assignment[] = [];

    if (assignments?.length) {
      const firstUngradedIndex = assignments.findIndex((a) => !a.gradeHifz && !a.gradeMurajara);
      if (firstUngradedIndex !== -1) {
        upcoming = assignments[firstUngradedIndex];
        assignments.forEach((a, idx) => {
          if (idx !== firstUngradedIndex) previous.push(a);
        });
      } else {
        previous.push(...assignments);
      }
    }

    return { upcomingAssignment: upcoming, previousAssignments: previous };
  }, [assignments]);

  const openCreate = () => {
    if (upcomingAssignment) {
      toast({
        variant: 'destructive',
        title: t('activeHomeworkExists'),
        description: t('gradeCurrentHomework'),
      });
      return;
    }
    setEditingAssignment(undefined);
    setIsFormOpen(true);
  };

  const openEdit = (a: Assignment) => {
    setEditingAssignment(a);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingAssignment(undefined);
  };

  if (areAssignmentsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-12 w-full">
      <div className="flex items-center justify-between gap-4 w-full">
        <div>
            <h2 className="text-2xl font-display text-[#004D40]">
                {t('studentHomework')}
            </h2>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#DEA93E] mt-1">{tGlobal('Lektie historik')}</p>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="inline-flex">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={openCreate}
                  disabled={!!upcomingAssignment}
                  className={cn(
                    "flex-shrink-0 h-14 px-6 rounded-2xl font-display text-sm shadow-xl transition-all flex items-center gap-2",
                    !!upcomingAssignment 
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                        : "bg-[#004D40] text-white hover:bg-[#00332B]"
                  )}
                >
                  <PlusCircle className="h-5 w-5" />
                  {t('createHomework')}
                </motion.button>
              </div>
            </TooltipTrigger>
            {!!upcomingAssignment && (
              <TooltipContent className="bg-[#004D40] text-white border-none rounded-xl p-3">
                <p className="text-xs font-bold">{t('gradeCurrentHomework')}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="space-y-10 w-full">
        <section className="w-full">
            <SectionLabel className="mb-6">{t('upcomingHomework')}</SectionLabel>

          {upcomingAssignment ? (
            <AssignmentCard
              assignment={upcomingAssignment}
              onEdit={() => openEdit(upcomingAssignment)}
              isUpcoming
              t={t}
              language={language}
            />
          ) : (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card rounded-[32px] border-dashed border-[#004D40]/20 py-16 text-center w-full bg-[#004D40]/5"
            >
              <Sparkles className="h-8 w-8 text-[#004D40]/10 mx-auto mb-4" />
              <p className="text-sm font-bold text-[#004D40]/40 tracking-wide uppercase">{t('noUpcoming')}</p>
            </motion.div>
          )}
        </section>

        <section className="w-full">
            <SectionLabel className="mb-6">{t('previousHomework')}</SectionLabel>

          {previousAssignments.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 w-full">
              {previousAssignments.map((a, idx) => (
                <AssignmentCard
                  key={a.id}
                  assignment={a}
                  onEdit={() => openEdit(a)}
                  t={t}
                  language={language}
                />
              ))}
            </div>
          ) : (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card rounded-[32px] border-dashed border-[#004D40]/20 py-16 text-center w-full"
            >
              <History className="h-8 w-8 text-[#004D40]/10 mx-auto mb-4" />
              <p className="text-sm font-bold text-[#004D40]/40 tracking-wide uppercase">{t('noPrevious')}</p>
            </motion.div>
          )}
        </section>
      </div>

      <FullscreenSheet
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingAssignment(undefined);
        }}
        title={
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[#004D40]/5 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-[#004D40]" />
                </div>
                <div className="text-left">
                    <div className="text-base font-display text-[#004D40]">
                        {editingAssignment ? t('editHomework') : t('newHomework')}
                    </div>
                </div>
            </div>
        }
        rightSlot={
          <motion.button
            whileTap={{ scale: 0.9 }}
            type="button"
            onClick={closeForm}
            className="h-10 w-10 grid place-items-center rounded-xl bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
            aria-label="Luk"
          >
            <X className="h-5 w-5" />
          </motion.button>
        }
      >
        <div className="p-6 w-full max-w-lg mx-auto">
          <AssignmentForm
            studentId={studentId}
            assignment={editingAssignment}
            onFormSubmit={closeForm}
          />
        </div>
      </FullscreenSheet>
    </div>

  );
}
