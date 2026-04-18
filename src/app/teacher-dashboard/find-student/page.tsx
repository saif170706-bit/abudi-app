'use client';

import { useState, FormEvent } from 'react';
import { useFirebase } from '@/firebase';
import { collection, query, where, getDocs, DocumentData } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Search, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AssignmentManager from '@/components/teacher/AssignmentManager';
import { useLanguage, type Language } from '@/context/LanguageContext';
import { Label } from '@/components/ui/label';
import { useUserProfile } from '@/hooks/use-user-profile';
import { cn } from '@/lib/utils';
import { useGlobalTranslation } from '@/hooks/useGlobalTranslation';

interface StudentProfile extends DocumentData {
  id: string;
  displayName: string;
  email: string;
  studentNumber: string;
  gender: 'man' | 'woman';
}

interface FindStudentPageProps {
  setView: (view: 'overview' | 'homework-reading' | 'find-student') => void;
  BackButton: React.ComponentType;
}

const translations: Record<string, Record<Language, string>> = {
  findStudent: { da: 'Find Elev', en: 'Find Student', ar: 'البحث عن طالب' , so: "Soo Hel Arday"},
  studentNumberLabel: { da: 'Elevnummer', en: 'Student Number', ar: 'رقم الطالب' , so: "Lambarka Ardayga"},
  studentNumberPlaceholder: { da: 'Indtast elevnummer...', en: 'Enter student number...', ar: 'أدخل رقم الطالب...' , so: "Gali lambarka ardayga..."},
  search: { da: 'Søg', en: 'Search', ar: 'بحث' , so: "Raadi"},
  wrongGender: { da: 'Du kan kun finde elever af samme køn.', en: 'You can only find students of the same gender.', ar: 'يمكنك فقط العثور على طلاب من نفس الجنس.' , so: "Waxaad oo kaliya ka heli kartaa ardayda jinsigooda la midka ah."},
};

import { motion, AnimatePresence } from 'framer-motion';
import { SectionLabel, IslamicDivider } from '@/components/ui/primitives';

export default function FindStudentPage({ setView, BackButton }: FindStudentPageProps) {
  const [studentNumber, setStudentNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [foundStudent, setFoundStudent] = useState<StudentProfile | null>(null);
  const [isNameExpanded, setIsNameExpanded] = useState(false);
  
  const { firestore } = useFirebase();
  const { profile: teacherProfile } = useUserProfile();
  const { toast } = useToast();
  const { language } = useLanguage();
  const { tGlobal } = useGlobalTranslation();
  const t = (key: string) => translations[key]?.[language] || translations[key]?.['en'];

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!studentNumber.trim()) {
      toast({ variant: 'destructive', title: 'Indtast venligst et elevnummer' });
      return;
    }
    if (!teacherProfile) return;

    setIsLoading(true);
    setFoundStudent(null);
    setIsNameExpanded(false);

    try {
      if (!firestore) {
        toast({
          variant: 'destructive',
          title: 'Databasefejl',
          description: 'Kunne ikke oprette forbindelse til databasen.',
        });
        return;
      }

      const studentsRef = collection(firestore, 'students');
      const q = query(studentsRef, where('studentNumber', '==', studentNumber.trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({
          variant: 'destructive',
          title: 'Elev ikke fundet',
          description: 'Ingen elev fundet med dette elevnummer.',
        });
      } else {
        const studentDoc = querySnapshot.docs[0];
        const studentData = { id: studentDoc.id, ...studentDoc.data() } as StudentProfile;
        
        // Enforce gender segregation
        if (studentData.gender !== teacherProfile.gender) {
          toast({
            variant: 'destructive',
            title: 'Adgang nægtet',
            description: t('wrongGender'),
          });
        } else {
          setFoundStudent(studentData);
        }
      }
    } catch (error: any) {
      console.error('Error searching for student:', error);
      toast({
        variant: 'destructive',
        title: 'Søgningsfejl',
        description: 'Der opstod en fejl under søgningen.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (foundStudent) {
      setFoundStudent(null);
      setStudentNumber('');
    } else {
      setView('overview');
    }
  };

  return (
    <div className="min-h-screen bg-transparent px-6 pt-16 pb-28 sm:px-8 w-full max-w-lg mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full"
      >
        <div className="mb-10 flex items-center gap-4">
          <BackButton />
          <div>
            <h1 className="text-3xl font-display text-primary dark:text-accent">{t('findStudent')}</h1>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">
              {foundStudent ? tGlobal('Student Detaljer') : tGlobal('Søg efter elev')}
            </p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!foundStudent ? (
            <motion.div 
              key="search-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-6"
            >
              <div className="glass-card shadow-2xl">
                <form onSubmit={handleSearch} className="glass-card-inner !p-8">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label htmlFor="student-number" className="text-[11px] font-black uppercase tracking-widest text-primary/40 dark:text-white/40 ml-1">
                        {t('studentNumberLabel')}
                      </Label>
                      <Input
                        id="student-number"
                        placeholder={t('studentNumberPlaceholder')}
                        value={studentNumber}
                        autoFocus
                        onChange={(e) => setStudentNumber(e.target.value)}
                        className="h-16 rounded-2xl border-white/40 bg-white/60 dark:bg-white/5 shadow-inner text-xl px-6 font-display placeholder:text-primary/20 dark:placeholder:text-white/20 dark:text-white"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-18 text-xl font-display rounded-3xl bg-primary hover:bg-[#00332B] text-white shadow-2xl shadow-[#004D40]/20 active:scale-[0.98] transition-all"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                      ) : (
                        <Search className="mr-2 h-6 w-6" />
                      )}
                      {t('search')}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="student-results"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="glass-card shadow-2xl">
                <div className="glass-card-inner !p-6 flex items-center justify-between">
                  <div className="min-w-0">
                    <h2 
                      className={cn(
                        "text-2xl font-display text-primary dark:text-accent cursor-pointer",
                        !isNameExpanded && "truncate"
                      )}
                      onClick={() => setIsNameExpanded(!isNameExpanded)}
                    >
                      {foundStudent.displayName}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-black uppercase tracking-widest text-accent">
                        ID: #{foundStudent.studentNumber}
                      </span>
                    </div>
                  </div>
                  
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                        setFoundStudent(null);
                        setStudentNumber('');
                    }}
                    className="h-10 w-10 grid place-items-center rounded-xl bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-white/60 shadow-sm"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </motion.button>
                </div>
              </div>

              <div className="space-y-6">
                <AssignmentManager studentId={foundStudent.id} studentName={foundStudent.displayName} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
