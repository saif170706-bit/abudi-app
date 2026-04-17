'use client';

import { useState } from 'react';
import { useUser, useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart2, CheckCircle2, ArrowRight, X, Clock, Loader2, Calendar } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { cn } from '@/lib/utils';
import { useHaptic } from 'use-haptic';
import type { Survey } from '@/types';
import SurveyResponseSheet from './SurveyResponseSheet';
import { useGlobalTranslation } from '@/hooks/useGlobalTranslation';

interface SurveyCardProps {
  survey: Survey;
  isNew?: boolean;
}

export default function SurveyCard({ survey, isNew }: SurveyCardProps) {
  const { user } = useUser();
  const { firestore } = useFirebase();
  const { triggerHaptic } = useHaptic();
  const { language } = useLanguage();
  const { tGlobal } = useGlobalTranslation();

  const [isOpen, setIsOpen] = useState(false);

  const responseRef = useMemoFirebase(
    () => (user && firestore ? doc(firestore, 'surveys', survey.id, 'responses', user.uid) : null),
    [firestore, survey.id, user?.uid]
  );
  const { data: response } = useDoc(responseRef);

  const isResponded = !!response;

  const handleOpen = () => {
    triggerHaptic();
    setIsOpen(true);
  };

  const formatDate = (date: any) => {
    if (!date?.toDate) return '';
    return date.toDate().toLocaleDateString(language, { day: 'numeric', month: 'short' });
  };

  return (
    <>
      <Card className={cn(
        "group relative border-none bg-card/60 dark:bg-zinc-900/60 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] overflow-hidden transition-all duration-500",
        "rounded-[40px] p-1 flex flex-col active:scale-[0.98]",
        isNew ? "before:absolute before:inset-0 before:p-[1px] before:rounded-[40px] before:bg-gradient-to-br before:from-amber-500 before:to-transparent before:-z-10" : ""
      )}>
        <div className="bg-card dark:bg-zinc-950/40 rounded-[39px] h-full flex flex-col overflow-hidden">
        {survey.imageUrl && (
          <div className="relative w-full overflow-hidden bg-amber-50/30">
            <img src={survey.imageUrl} alt={survey.title} className="w-full h-auto object-contain block" />
          </div>
        )}

        <CardHeader className="pb-2 pt-8 px-8">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-none font-black px-3 h-6 uppercase tracking-wider text-[9px]">
                {tGlobal('Undersøgelse')}
              </Badge>
              {isNew && (
                <Badge className="bg-amber-500 text-white border-none font-black px-3 h-6 uppercase tracking-wider text-[9px]">
                  {tGlobal('Ny')}
                </Badge>
              )}
            </div>
            <CardTitle className="text-2xl font-display font-bold leading-tight text-foreground dark:text-white pt-1 break-words">
              {survey.title}
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 pb-6 px-8">
          <div className="text-base text-foreground/75 dark:text-white/70 leading-relaxed break-words font-medium" dangerouslySetInnerHTML={{ __html: survey.description }} />
          
          <div className="flex flex-wrap gap-y-3 gap-x-6">
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground/60">
              <BarChart2 className="h-4 w-4 text-amber-500/60" />
              <span>{survey.questions?.length || 0} {tGlobal('spørgsmål')}</span>
            </div>
            {survey.deadline && (
              <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground/60">
                <Calendar className="h-4 w-4 text-blue-500/40" />
                <span>{tGlobal('Udløber')}: {formatDate(survey.deadline)}</span>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className="px-8 pb-8 pt-0">
          {isResponded ? (
            <Button disabled className="w-full h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border-none shadow-none font-black text-[15px] gap-3">
              <CheckCircle2 className="h-5 w-5" />
              {tGlobal('Besvaret')}
            </Button>
          ) : (
            <Button 
              onClick={handleOpen} 
              className="w-full h-14 rounded-2xl bg-amber-600 hover:bg-amber-600/90 text-white font-black text-[16px] shadow-lg shadow-amber-500/10 flex items-center justify-between px-6 transition-all"
            >
              <span>{tGlobal('Start undersøgelse')}</span>
              <ArrowRight className="h-5 w-5 opacity-40" />
            </Button>
          )}
        </CardFooter>
      </div>
    </Card>

      <SurveyResponseSheet 
        survey={survey} 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
    </>
  );
}
