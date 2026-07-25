'use client';

import { useMemo } from 'react';
import { useUser } from '@/firebase';
import { Loader2, BookOpen, ArrowLeft, Calendar, FileText, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { surahs } from '@/app/lib/surahs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useView } from '@/context/ViewContext';
import { findPageForVerse, cn } from '@/lib/utils';
import { useLanguage, type Language } from '@/context/LanguageContext';
import { useHaptic } from 'use-haptic';
import type { Assignment, AssignmentPart } from '@/types';
import IslamicDivider from '@/components/ui/IslamicDivider';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { useGlobalTranslation } from '@/hooks/useGlobalTranslation';

function getGradeColor(grade: string | null | undefined) {
  if (!grade) return "#DEA93E";
  switch (grade) {
    case "Perfekt": return "#2E9D63";
    case "Meget godt": return "#DEA93E";
    case "Godt": return "#004D40";
    case "Ikke læst": return "#E24B4B";
    default: return "#004D40";
  }
}

function AssignmentSection({ title, part, grade, onReadClick }: { title: string; part: AssignmentPart; grade: string | null | undefined; onReadClick: (part: AssignmentPart) => void; }) {
  const { language } = useLanguage();
  const { tGlobal } = useGlobalTranslation();
  const gradeText = grade ? tGlobal(grade) : null;
  
  const startSurahInfo = surahs.find((s) => s.name === part.surahName || s.englishName === part.surahName);
  const startName = language === 'ar' && startSurahInfo ? startSurahInfo.name : (startSurahInfo?.englishName || part.surahName || tGlobal('notSpecified'));

  const hasEndSurah = part.endSurahName && part.endSurahName !== part.surahName;
  const endSurahInfo = hasEndSurah ? surahs.find((s) => s.name === part.endSurahName || s.englishName === part.endSurahName) : null;
  const endName = language === 'ar' && endSurahInfo ? endSurahInfo.name : (endSurahInfo?.englishName || part.endSurahName);

  const ayahLabel = language === 'ar' ? 'آية' : 'Ayah';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <span className="text-[10px] font-black uppercase tracking-widest text-primary/30">{tGlobal(title)}</span>
        {gradeText && (
          <span style={{ color: getGradeColor(grade), backgroundColor: `${getGradeColor(grade)}10` }} className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
            {gradeText}
          </span>
        )}
      </div>

      <div className="glass-card shadow-sm group">
        <div className="glass-card-inner !p-5 flex items-center justify-between gap-4">
           <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/5 flex items-center justify-center">
                 <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                 <h4 className={cn("font-bold text-primary text-lg leading-tight", language === 'ar' && "font-quran")}>
                    {hasEndSurah ? `${startName} - ${endName}` : startName}
                 </h4>
                 <p className="text-[11px] font-bold text-primary/40">
                    {hasEndSurah 
                      ? `${startName} ${part.fromAyah || 0} → ${endName} ${part.toAyah || 0}`
                      : `${ayahLabel} ${part.fromAyah || 0} - ${part.toAyah || 0}`
                    }
                 </p>
              </div>
           </div>
           <motion.button whileTap={{ scale: 0.9 }} onClick={() => onReadClick(part)} disabled={!(part.surahName && part.fromAyah)} className="h-12 w-12 rounded-2xl bg-foreground text-background flex items-center justify-center shadow-lg disabled:opacity-20 transition-all">
              <ChevronRight className="h-5 w-5" />
           </motion.button>
        </div>
      </div>
    </div>
  );
}

export default function ViewHomeworkPage({ BackButton, assignments, isLoading }: { BackButton: React.ComponentType; assignments: Assignment[] | null; isLoading: boolean; }) {
  const { user, loading: isUserLoading } = useUser();
  const { toast } = useToast();
  const { triggerHaptic } = useHaptic();
  const { navigateToQuranPage, setView: setParentView } = useView() as any;
  const { language } = useLanguage();
  const { tGlobal } = useGlobalTranslation();

  const localeMap: Record<Language, string> = { da: 'da-DK', en: 'en-US', ar: 'ar-SA', so: 'so-SO' };
  const currentLocale = localeMap[language];

  const { upcomingAssignment, previousAssignments } = useMemo(() => {
    let upcoming: Assignment | null = null;
    const previous: Assignment[] = [];
    if (assignments) {
      const idx = assignments.findIndex((a) => !a.gradeHifz && !a.gradeMurajara);
      if (idx !== -1) { upcoming = assignments[idx]; assignments.forEach((a, k) => { if (k !== idx) previous.push(a); }); }
      else previous.push(...assignments);
    }
    return { upcomingAssignment: upcoming, previousAssignments: previous };
  }, [assignments]);

  const handleRead = (part: AssignmentPart) => {
    triggerHaptic();
    if (!part.surahName || !part.fromAyah) { toast({ variant: 'destructive', title: tGlobal('Data mangler') }); return; }
    const s = surahs.find(x => x.name === part.surahName || x.englishName === part.surahName);
    if (!s) return;
    const p = findPageForVerse(s.number, part.fromAyah);
    if (p) navigateToQuranPage(p);
  };

  if (isUserLoading || (isLoading && !assignments)) {
    // ... skeleton ...
// ... skeleton inside render ...
  }

  return (
    <div className="min-h-screen pt-12 pb-32 px-6 w-full max-w-lg mx-auto space-y-12">
       <div className="flex items-center gap-4">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setParentView('overview')} className="h-14 w-14 rounded-2xl bg-card dark:bg-white/10 backdrop-blur-md flex items-center justify-center shadow-lg border border-border cursor-pointer">
             <ChevronRight className="h-6 w-6 text-primary rotate-180" />
          </motion.button>
          <div>
              <h1 className="text-4xl font-display text-primary tracking-tight">{tGlobal('Lektie Liste')}</h1>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">{tGlobal('Følg dine fremskridt')}</p>
          </div>
       </div>

       <div className="space-y-12">
          {upcomingAssignment ? (
            <div className="space-y-6">
              <div className="section-label flex items-center gap-2">
                 <div className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                 {tGlobal('Næste Lektie')}
              </div>
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-card shadow-2xl relative overflow-visible">
                 <div className="absolute -top-3 -right-3 px-4 py-1.5 bg-primary text-primary-foreground rounded-full text-[9px] font-black uppercase tracking-widest shadow-xl border-4 border-background z-10">{tGlobal('Kommende')}</div>
                 <div className="glass-card-inner !p-8 space-y-10">
                    <div className="flex items-center gap-3 text-[10px] font-black text-primary/30 uppercase tracking-widest">
                       <Calendar className="h-3 w-3" />
                       {upcomingAssignment.assignedAt?.toDate()?.toLocaleDateString(currentLocale, { day: 'numeric', month: 'long' })}
                    </div>
                    <div className="space-y-8">
                       <AssignmentSection title={'Hifz'} part={upcomingAssignment.hifz} grade={upcomingAssignment.gradeHifz} onReadClick={handleRead} />
                       <AssignmentSection title={'Mura\'jah'} part={upcomingAssignment.murajara} grade={upcomingAssignment.gradeMurajara} onReadClick={handleRead} />
                    </div>
                 </div>
              </motion.div>
            </div>
          ) : !isLoading && (
            <p className="text-sm font-bold text-primary/40 uppercase tracking-widest text-center py-10">{tGlobal('Du har ingen kommende lektier.')}</p>
          )}

          {previousAssignments.length > 0 ? (
            <div className="space-y-6">
               <div className="section-label">{tGlobal('Historik')}</div>
               <div className="space-y-6">
                  {previousAssignments.map((a, idx) => (
                    <motion.div key={a.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} className="glass-card shadow-sm">
                       <div className="glass-card-inner !p-6 space-y-6">
                          <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2 text-[10px] font-black text-primary/30 uppercase tracking-widest">
                                <Calendar className="h-3 w-3" />
                                {a.assignedAt?.toDate()?.toLocaleDateString(currentLocale, { day: 'numeric', month: 'short' })}
                             </div>
                             {a.notes && <div className="h-8 w-8 bg-accent/10 rounded-xl flex items-center justify-center"><FileText className="h-4 w-4 text-accent" /></div>}
                          </div>
                          <div className="space-y-6">
                             <AssignmentSection title={'Hifz'} part={a.hifz} grade={a.gradeHifz} onReadClick={handleRead} />
                             <AssignmentSection title={'Mura\'jah'} part={a.murajara} grade={a.gradeMurajara} onReadClick={handleRead} />
                          </div>
                          {a.notes && (
                            <div className="p-4 rounded-2xl bg-accent/5 border border-accent/10 text-xs font-bold text-primary/60 italic leading-relaxed">
                                "{a.notes}"
                            </div>
                          )}
                       </div>
                    </motion.div>
                  ))}
               </div>
            </div>
          ) : !isLoading && (
            <div className="text-center py-20 opacity-20">
              <FileText className="h-12 w-12 mx-auto mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest">{tGlobal('Du har ingen tidligere lektier.')}</p>
            </div>
          )}
       </div>
       <IslamicDivider />
    </div>
  );
}
