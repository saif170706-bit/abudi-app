'use client';

import { useGlobalTranslation } from '@/hooks/useGlobalTranslation';

import { useState, useEffect } from 'react';
import { useView } from '@/context/ViewContext';
import { useUser, useFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FullscreenSheet } from '@/components/ui/fullscreen-sheet';
import { X, ChevronRight, ChevronLeft, CheckCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { useHaptic } from 'use-haptic';
import type { Survey, SurveyQuestion } from '@/types';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface Props {
  survey: Survey;
  isOpen: boolean;
  onClose: () => void;
}

export default function SurveyResponseSheet({ survey, isOpen, onClose }: Props) {
  const { tGlobal } = useGlobalTranslation();
  const { setIsSubView } = useView();

  const { user } = useUser();
  const { firestore } = useFirebase();
  const { language } = useLanguage();
  const { triggerHaptic } = useHaptic();

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const questions = survey.questions || [];
  const currentQuestion = questions[currentStep];
  const progress = ((currentStep + 1) / questions.length) * 100;

  const handleAnswer = (val: any) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: val }));
  };

  const handleNext = () => {
    triggerHaptic();
    if (currentStep < questions.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      submit();
    }
  };

  const handlePrev = () => {
    triggerHaptic();
    if (currentStep > 0) setCurrentStep(s => s - 1);
  };

  const submit = async () => {
    if (!user || !firestore) return;
    setIsSubmitting(true);
    triggerHaptic();

    // ANONYMOUS: We only use user.uid as the doc ID to enforce "one response per user"
    // but we do NOT store identifying fields like userName, email, etc. in the doc body.
    const resRef = doc(firestore, 'surveys', survey.id, 'responses', user.uid);
    const payload = {
      surveyId: survey.id,
      submittedAt: serverTimestamp(),
      answers,
      // PII removed for anonymity
    };

    try {
      await setDoc(resRef, payload);
      setIsSuccess(true);
      triggerHaptic();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = !currentQuestion?.required || (answers[currentQuestion?.id] !== undefined && answers[currentQuestion?.id] !== '');

  const scaleValues = [1, 2, 3, 4, 5];
  const scaleLabels = {
    1: { da: 'Meget uenig', en: 'Strongly Disagree' , so: "Strongly Disagree"},
    5: { da: 'Meget enig', en: 'Strongly Agree' , so: "Strongly Agree"}
  };

  return (
    <FullscreenSheet 
      open={isOpen} 
      onOpenChange={onClose}
      title={survey.title}
      rightSlot={<button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors"><X className="h-6 w-6 opacity-40" /></button>}
    >
      <div className="flex flex-col h-full bg-card max-w-2xl mx-auto">
        {!isSuccess && (
          <div className="px-6 pt-4">
            <Progress value={progress} className="h-1.5 bg-muted" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-2">
              Spørgsmål {currentStep + 1} af {questions.length}
            </p>
          </div>
        )}

        <div className="flex-grow overflow-y-auto px-6 py-10 overscroll-contain">
          {isSuccess ? (
            <div className="flex flex-col items-center text-center space-y-10 py-10 animate-in zoom-in-95 duration-500">
              <div className="grid h-24 w-24 place-items-center rounded-[32px] bg-green-50 text-green-600 shadow-inner">
                <CheckCircle className="h-12 w-12" />
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-extrabold font-headline text-foreground">Tak for din feedback!</h2>
                <p className="text-muted-foreground text-lg leading-relaxed max-w-xs mx-auto">
                  Dine svar hjælper os med at gøre Ibn Amer Instituttet til et endnu bedre sted.
                </p>
              </div>
              <Button onClick={onClose} className="w-full h-16 rounded-[24px] bg-black text-white font-bold text-lg">
                Færdig
              </Button>
            </div>
          ) : (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground leading-tight font-headline">
                {currentQuestion?.text}
              </h2>

              {currentQuestion?.type === 'scale' && (
                <div className="space-y-8">
                  <div className="flex justify-between items-center px-2">
                    {scaleValues.map(val => (
                      <button
                        key={val}
                        onClick={() => { triggerHaptic(); handleAnswer(val); }}
                        className={cn(
                          "w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 transition-all flex items-center justify-center font-bold text-lg",
                          answers[currentQuestion.id] === val 
                            ? "bg-amber-600 border-amber-600 text-white shadow-lg shadow-amber-600/20 scale-110" 
                            : "border-border bg-muted text-muted-foreground hover:border-amber-200"
                        )}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    <span>{scaleLabels[1][language as 'da' | 'en'] || scaleLabels[1].en}</span>
                    <span>{scaleLabels[5][language as 'da' | 'en'] || scaleLabels[5].en}</span>
                  </div>
                </div>
              )}

              {currentQuestion?.type === 'text' && (
                <Textarea 
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleAnswer(e.target.value)}
                  placeholder={tGlobal("Skriv dit svar her...")}
                  className="min-h-[200px] text-lg rounded-[24px] border-border bg-muted p-6 focus:bg-card transition-all"
                />
              )}

              {currentQuestion?.type === 'radio' && (
                <RadioGroup 
                  value={answers[currentQuestion.id] || ''}
                  onValueChange={handleAnswer}
                  className="grid gap-3"
                >
                  {currentQuestion.options?.map((opt) => (
                    <div 
                      key={opt} 
                      onClick={() => { triggerHaptic(); handleAnswer(opt); }}
                      className={cn(
                        "flex items-center space-x-3 p-5 rounded-[20px] border transition-all cursor-pointer",
                        answers[currentQuestion.id] === opt 
                          ? "bg-amber-50 border-amber-600 shadow-sm" 
                          : "border-border bg-muted hover:bg-muted"
                      )}
                    >
                      <RadioGroupItem value={opt} id={opt} className="sr-only" />
                      <div className={cn(
                        "h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors",
                        answers[currentQuestion.id] === opt ? "border-amber-600 bg-amber-600" : "border-border"
                      )}>
                        {answers[currentQuestion.id] === opt && <div className="h-2 w-2 rounded-full bg-card" />}
                      </div>
                      <Label htmlFor={opt} className="text-[17px] font-bold text-foreground flex-1 cursor-pointer">{opt}</Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </div>
          )}
        </div>

        {!isSuccess && (
          <div className="p-6 border-t border-border bg-card flex items-center justify-between gap-4">
            <Button 
              variant="ghost" 
              onClick={handlePrev} 
              disabled={currentStep === 0}
              className="h-14 rounded-2xl px-6 font-bold gap-2"
            >
              <ChevronLeft className="h-5 w-5" />
              Forrige
            </Button>

            <Button 
              onClick={handleNext} 
              disabled={!canProceed || isSubmitting}
              className="flex-1 h-14 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-lg shadow-lg shadow-amber-500/20"
            >
              {isSubmitting ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <>
                  {currentStep === questions.length - 1 ? 'Indsend besvarelse' : 'Næste'}
                  <ChevronRight className="ml-2 h-5 w-5 opacity-40" />
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </FullscreenSheet>
  );
}
