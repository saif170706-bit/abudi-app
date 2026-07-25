'use client';

import React, { useState } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Calendar, Loader2, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useLanguage, type Language } from '@/context/LanguageContext';
import { FullscreenSheet } from '@/components/ui/fullscreen-sheet';
import { motion, AnimatePresence } from 'framer-motion';

const translations: Record<string, Record<Language, string>> = {
  title: { da: 'Meld Fravær', en: 'Report Absence', ar: 'تبيغ عن غياب' , so: "Warbixi Maqnaanshaha"},
  buttonLabel: { da: 'Registrer Fravær', en: 'Register Absence', ar: 'تسجيل غياب' , so: "Diiwaangeli Maqnaanshaha"},
  fromDate: { da: 'Fra dato', en: 'From date', ar: 'من تاريخ' , so: "Laga bilaabo tariikhda"},
  toDate: { da: 'Til dato', en: 'To date', ar: 'إلى تاريخ' , so: "Ilaa tariikhda"},
  reason: { da: 'Årsag til fravær', en: 'Reason for absence', ar: 'سبب الغياب' , so: "Sababta maqnaanshaha"},
  reasonPlaceholder: { da: 'Skriv hvorfor du ikke kan komme (fx sygdom, ferie)...', en: 'Write why you cannot come (e.g., sickness, vacation)...', ar: 'اكتب سبب الغياب...' , so: "Qor sababta aad u imaan weyday..."},
  save: { da: 'Indsend', en: 'Submit', ar: 'إرسال' , so: "Gudbi"},
  success: { da: 'Fravær registreret', en: 'Absence registered', ar: 'تم تسجيل الغياب' , so: "Maqnaanshaha waa la diiwaangeliyey"},
  error: { da: 'Der skete en fejl', en: 'An error occurred', ar: 'حدث خطأ' , so: "Khalad ayaa dhacay"},
};

export default function AbsenceRegistration({ 
  studentId, 
  studentName,
  trigger,
  defaultOpen = false
}: { 
  studentId: string; 
  studentName: string;
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isLoading, setIsLoading] = useState(false);

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  const t = (key: string) => translations[key]?.[language] || translations[key]?.['en'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user || !startDate || !endDate || !reason.trim()) return;

    setIsLoading(true);
    try {
      const notesRef = collection(firestore, 'students', studentId, 'absenceNotes');
      await addDoc(notesRef, {
        type: 'student_report',
        startDate: Timestamp.fromDate(new Date(startDate)),
        endDate: Timestamp.fromDate(new Date(endDate)),
        text: reason.trim(),
        authorName: studentName,
        createdAt: serverTimestamp(),
      });

      toast({
        variant: 'primary',
        title: t('success'),
      });
      setIsOpen(false);
      setStartDate('');
      setEndDate('');
      setReason('');
    } catch (error) {
      console.error('Absence registration error:', error);
      toast({
        variant: 'destructive',
        title: t('error'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {trigger ? (
        <div onClick={() => setIsOpen(true)} className="w-full cursor-pointer">
          {trigger}
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary/5 hover:bg-primary/10 text-primary rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95"
        >
          <Calendar className="h-4 w-4" />
          {t('buttonLabel')}
        </button>
      )}

      <FullscreenSheet
        open={isOpen}
        onOpenChange={setIsOpen}
        title={t('title')}
        rightSlot={<button onClick={() => setIsOpen(false)} className="p-2"><X className="h-6 w-6 opacity-40" /></button>}
      >
        <div className="p-6 space-y-10 pb-32">

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label className="text-[11px] font-black uppercase tracking-widest text-primary/40 ml-1">
                  {t('fromDate')}
                </Label>
                <div className="relative">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="h-14 rounded-2xl border-border bg-card/60 dark:bg-card/20 shadow-inner px-4 font-bold text-primary dark:text-foreground appearance-none"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label className="text-[11px] font-black uppercase tracking-widest text-primary/40 ml-1">
                  {t('toDate')}
                </Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="h-14 rounded-2xl border-border bg-card/60 dark:bg-card/20 shadow-inner px-4 font-bold text-primary dark:text-foreground appearance-none"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-[11px] font-black uppercase tracking-widest text-primary/40 ml-1">
                {t('reason')}
              </Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('reasonPlaceholder')}
                required
                className="min-h-[140px] rounded-2xl border-border bg-card/60 dark:bg-card/20 shadow-inner p-5 font-medium leading-relaxed resize-none text-primary dark:text-foreground"
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-16 rounded-[24px] bg-primary hover:bg-primary/90 text-primary-foreground font-display text-lg shadow-xl shadow-primary/10 flex items-center justify-center gap-3"
            >
              {isLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="h-6 w-6" />
                  {t('save')}
                </>
              )}
            </Button>
          </form>
        </div>
      </FullscreenSheet>
    </>
  );
}
