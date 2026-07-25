'use client';

import { useGlobalTranslation } from '@/hooks/useGlobalTranslation';
import { useState, useMemo, useEffect } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  serverTimestamp, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { 
  Loader2, 
  Phone, 
  FileText, 
  Search, 
  Calendar, 
  ChevronRight, 
  PlusCircle, 
  CheckCircle2,
  XCircle,
  X,
  Moon,
  Sun,
  Info
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useLanguage, type Language } from '@/context/LanguageContext';
import { useMembersData, type CombinedUser } from '@/hooks/use-members-data';
import { getInitials, cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { FullscreenSheet } from '@/components/ui/fullscreen-sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useHaptic } from 'use-haptic';
import type { AbsenceNote } from '@/types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useAbsenceReport } from '@/hooks/use-absence-report';

const translations: Record<string, Record<Language, string>> = {
  absence: { da: 'Fravær', en: 'Absence', ar: 'الغياب' , so: "Maqnaanshaha"},
  weeklyReport: { da: 'Ugentlig Rapport', en: 'Weekly Report', ar: 'التقرير الأسبوعي' , so: "Warbixinta Todobaadlaha"},
  history: { da: 'Historik & Søgning', en: 'History & Search', ar: 'السجل والبحث' , so: "Taariikhda & Raadinta"},
  thisWeek: { da: 'Denne uge', en: 'This week', ar: 'هذا الأسبوع' , so: "Toddobaadkan"},
  lastWeek: { da: 'Sidste uge', en: 'Last week', ar: 'الأسبوع الماضي' , so: "Toddobaadkii Hore"},
  twoWeeksAgo: { da: '2 uger siden', en: '2 weeks ago', ar: 'قبل أسبوعين', so: '2 toddobaad ka hor' },
  searchStudent: { da: 'Søg efter elev...', en: 'Search for student...', ar: 'البحث عن طالب...' , so: "Raadi arday..."},
  noResults: { da: 'Ingen elever fundet.', en: 'No students found.', ar: 'لم يتم العثور على طلاب.' , so: "Arday lama Helin."},
  all: { da: 'Alle', en: 'All', ar: 'الكل' , so: "Dhammaan"},
  men: { da: 'Mænd', en: 'Men', ar: 'رجال' , so: "Rag"},
  women: { da: 'Kvinder', en: 'Kvinder', ar: 'نساء' , so: "Dumar"},
  attended: { da: 'Mødt op', en: 'Attended', ar: 'حضر' , so: "Joogista"},
  absent: { da: 'Ikke mødt', en: 'Absent', ar: 'غائب' , so: "Maqan"},
  callStudent: { da: 'Ring op', en: 'Call Student', ar: 'اتصال بالطالب' , so: "Wac Ardayga"},
  addNote: { da: 'Tilføj Note', en: 'Add Note', ar: 'إضافة ملاحظة' , so: "Kudar Xusid"},
  saveNote: { da: 'Gem Note', en: 'Save Note', ar: 'حفظ الملاحظة' , so: "Kaydi Xusuus-qorka"},
  notes: { da: 'Noter', en: 'Notes', ar: 'ملاحظات' , so: "Notes"},
  noNotes: { da: 'Ingen noter endnu.', en: 'No notes yet.', ar: 'لا توجد ملاحظات بعد.' , so: "Majiraan wax Notes wali ah."},
  fraværDetails: { da: 'Indmeldt Fravær', en: 'Reported Absence', ar: 'الغياب المبلغ عنه', so: 'Maqnaanshaha la soo sheegay' },
  loadingReport: { da: 'Henter ugentlig rapport...', en: 'Fetching weekly report...', ar: 'جاري جلب التقرير...' , so: "Keenista warbixinta todobaadlaha..."},
  studentSummary: { da: 'Overblik for {name}', en: 'Summary for {name}', ar: 'ملخص لـ {name}' , so: "Guudmar ku saabsan {name}"},
  reportDateRange: { da: '{start} til {end}', en: '{start} to {end}', ar: '{start} إلى {end}' , so: "{start} ilaa {end}"},
  lastGrade: { da: 'Sidst læst: {date}', en: 'Last read: {date}', ar: 'آخر قراءة: {date}' , so: "Markii ugu dambaysay ee la akhriyo: {date}"},
  admin: { da: 'Admin', en: 'Admin', ar: 'مسؤول' , so: "Maamule"},
  attendance: { da: 'Fremmøde', en: 'Attendance', ar: 'الحضور' , so: "Imaanshaha"},
  allAttended: { da: 'Alle elever har læst denne uge! 🌟', en: 'All students have read this week! 🌟', ar: 'كل الطلاب قرأوا هذا الأسبوع! 🌟' , so: "Dhammaan ardaydu isbuucan wey akhriyeen! 🌟"},
};

function getWeekBoundaries(offsetWeeks = 0) {
  const now = new Date();
  const day = now.getDay(); 
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); 
  
  const start = new Date(now.setDate(diff - (offsetWeeks * 7)));
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
}

export default function AdminAbsence() {
  const { tGlobal } = useGlobalTranslation();

  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  const { triggerHaptic } = useHaptic();
  const { language } = useLanguage();
  const { members } = useMembersData();
  
  const t = (key: string, params?: Record<string, string | number>) => {
    let text = translations[key]?.[language] || translations[key]?.['en'] || key;
    if (params) {
      Object.keys(params).forEach(pKey => {
        text = text.replace(`{${pKey}}`, String(params[pKey]));
      });
    }
    return text;
  };

  const [activeTab, setActiveTab] = useState<'report' | 'history'>('report');
  const [reportPeriod, setReportPeriod] = useState<1 | 2>(1);
  const [isNoteOpen, setIsEditNoteOpen] = useState(false);
  const [isHistoryDetailOpen, setIsHistoryDetailOpen] = useState(false);
  const [isAbsenceDetailOpen, setIsAbsenceDetailOpen] = useState(false);
  const [genderFilter, setGenderFilter] = useState<'all'|'man'|'woman'>('all');
  
  const [selectedStudent, setSelectedStudent] = useState<CombinedUser | null>(null);
  const [noteText, setNoteText] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');

  // Use the pre-fetched absence report
  const { reportData, isLoading: isReportLoading } = useAbsenceReport();

  const handleCall = (phoneNumber: string | null) => {
    triggerHaptic();
    if (!phoneNumber) {
      toast({ variant: 'destructive', title: 'Intet telefonnummer fundet' });
      return;
    }
    window.location.href = `tel:${phoneNumber}`;
  };

  const handleOpenNote = async (student: CombinedUser) => {
    triggerHaptic();
    setSelectedStudent(student);
    setNoteText('');
    setStudentNotes([]); // Clear previous
    setIsEditNoteOpen(true);
    
    if (!firestore) return;
    
    try {
      const notesRef = collection(firestore, 'students', student.uid, 'absenceNotes');
      const notesSnap = await getDocs(query(notesRef, orderBy('createdAt', 'desc')));
      const notes = notesSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as AbsenceNote))
        .filter(n => n.type !== 'student_report'); // Filter out student reports from normal notes
      setStudentNotes(notes);
    } catch (e) {
      console.error("Error fetching notes for dialog:", e);
    }
  };

  const handleSaveNote = () => {
    if (!selectedStudent || !noteText.trim() || !firestore || !user) return;
    setIsSavingNote(true);
    triggerHaptic();

    const notesRef = collection(firestore, 'students', selectedStudent.uid, 'absenceNotes');
    const data = {
      text: noteText.trim(),
      createdAt: serverTimestamp(),
      authorName: user.displayName || 'Admin'
    };

    addDoc(notesRef, data)
      .then(() => {
        toast({ variant: 'primary', title: 'Note gemt' });
        setIsEditNoteOpen(false);
      })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: notesRef.path,
          operation: 'create',
          requestResourceData: data,
        });
        errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
        setIsSavingNote(false);
      });
  };

  const filteredHistorySearch = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return [];
    return members.filter(m => 
      m.role === 'student' && 
      (m.displayName?.toLowerCase().includes(term) || m.studentNumber?.includes(term))
    );
  }, [searchTerm, members]);

  const [studentHistory, setStudentHistory] = useState<any[]>([]);
  const [studentNotes, setStudentNotes] = useState<AbsenceNote[]>([]);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);

  const fetchStudentHistory = async (student: CombinedUser) => {
    if (!firestore) return;
    triggerHaptic();
    setSelectedStudent(student);
    setIsFetchingHistory(true);
    setIsHistoryDetailOpen(true);

    try {
      const notesRef = collection(firestore, 'students', student.uid, 'absenceNotes');
      const notesSnap = await getDocs(query(notesRef, orderBy('createdAt', 'desc'))).catch(e => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: notesRef.path,
          operation: 'list',
        }));
        throw e;
      });
      const notes = notesSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as AbsenceNote))
        .filter(n => n.type !== 'student_report'); // Filter out student reports from history
      setStudentNotes(notes);

      const historyRows = [];
      for (let i = 0; i < 12; i++) {
        const { start, end } = getWeekBoundaries(i);
        const assignmentsRef = collection(firestore, 'students', student.uid, 'assignments');
        const q = query(
          assignmentsRef, 
          where('assignedAt', '>=', Timestamp.fromDate(start)),
          where('assignedAt', '<=', Timestamp.fromDate(end))
        );
        const snap = await getDocs(q).catch(e => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: assignmentsRef.path,
            operation: 'list',
          }));
          throw e;
        });
        historyRows.push({
          start,
          end,
          attended: !snap.empty,
          weekLabel: i === 0 ? t('thisWeek') : i === 1 ? t('lastWeek') : `${i} uger siden`
        });
      }
      setStudentHistory(historyRows);
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetchingHistory(false);
    }
  };

  const absentStudents = useMemo(() => {
    if (!reportData || !reportData[reportPeriod]) return [];
    const periodData = reportData[reportPeriod];
    
    return members.filter(m => 
      m.role === 'student' && 
      m.status === 'Tilmeldt' && 
      (genderFilter === 'all' || m.gender === genderFilter) &&
      periodData?.[m.uid]?.attended !== true
    );
  }, [members, reportData, reportPeriod, genderFilter]);

  const { start, end } = getWeekBoundaries(reportPeriod);
  const dateRangeLabel = t('reportDateRange', {
    start: start.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' }),
    end: end.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' })
  });

  return (
    <div className="px-4 pt-10 pb-32 sm:px-6 max-w-4xl mx-auto">
      <div className="mb-10">
        <p className="text-lg text-muted-foreground">{t('admin')}</p>
        <h1 className="text-[38px] leading-[1.05] font-semibold tracking-tight text-foreground">
          {t('absence')}
        </h1>
      </div>

      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-8">
        <TabsList className="grid w-full grid-cols-2 h-12 bg-muted p-1 rounded-2xl">
          <TabsTrigger value="report" className="rounded-xl font-bold data-[state=active]:bg-card data-[state=active]:shadow-sm">
            {t('weeklyReport')}
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-xl font-bold data-[state=active]:bg-card data-[state=active]:shadow-sm">
            {t('history')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="report" className="space-y-6 outline-none">
          <div className="flex items-center justify-between gap-4 bg-card p-2 rounded-2xl border border-border shadow-sm">
            <button 
              onClick={() => { triggerHaptic(); setReportPeriod(1); }} 
              className={cn("flex-1 py-2.5 rounded-xl text-sm font-bold transition-all", reportPeriod === 1 ? "bg-[#111214] text-white shadow-md" : "text-muted-foreground hover:bg-muted")}
            >
              {t('lastWeek')}
            </button>
            <button 
              onClick={() => { triggerHaptic(); setReportPeriod(2); }} 
              className={cn("flex-1 py-2.5 rounded-xl text-sm font-bold transition-all", reportPeriod === 2 ? "bg-[#111214] text-white shadow-md" : "text-muted-foreground hover:bg-muted")}
            >
              {t('twoWeeksAgo')}
            </button>
          </div>

          <div className="flex items-center gap-2 bg-card p-1 rounded-xl border border-border shadow-sm">
            <button 
              onClick={() => { triggerHaptic(); setGenderFilter('all'); }} 
              className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all", genderFilter === 'all' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted")}
            >
              {t('all')}
            </button>
            <button 
              onClick={() => { triggerHaptic(); setGenderFilter('man'); }} 
              className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all", genderFilter === 'man' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted")}
            >
              {t('men')}
            </button>
            <button 
              onClick={() => { triggerHaptic(); setGenderFilter('woman'); }} 
              className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all", genderFilter === 'woman' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted")}
            >
              {t('women')}
            </button>
          </div>

          <div className="px-1 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {dateRangeLabel}
            </span>
            {isReportLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </div>

          <div className="space-y-3">
            {isReportLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary/20" />
                <p className="text-sm font-bold text-black/20 uppercase tracking-widest">{t('loadingReport')}</p>
              </div>
            ) : absentStudents.length === 0 ? (
              <div className="py-20 text-center bg-card rounded-3xl border border-border shadow-sm">
                <CheckCircle2 className="mx-auto h-12 w-12 text-primary/40 mb-4" />
                <p className="text-muted-foreground font-medium">{t('allAttended')}</p>
              </div>
                        ) : (
              absentStudents.map(student => {
                return (
                  <Card key={student.uid} className="rounded-[24px] border border-border bg-card shadow-sm overflow-hidden ring-1 ring-red-500/10">
                    <div className="p-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="relative">
                          <Avatar className="h-12 w-12 border border-border">
                            <AvatarImage src={student.photoURL || undefined} />
                            <AvatarFallback className="bg-muted text-xs font-bold">{getInitials(student.displayName)}</AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-2 border-white flex items-center justify-center bg-red-500">
                            <XCircle className="h-3 w-3 text-white" />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[16px] font-bold text-foreground truncate">{student.displayName}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-[11px] font-bold text-red-500 uppercase tracking-tight">
                              {t('absent')}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {reportData?.[reportPeriod]?.[student.uid]?.absenceNote && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                                setSelectedStudent(student);
                                setIsAbsenceDetailOpen(true);
                                triggerHaptic();
                            }} 
                            className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 hover:bg-amber-100"
                          >
                            <Info className="h-4 w-4" />
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleCall(student.phoneNumber)} 
                          className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100"
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleOpenNote(student)} 
                          className="h-10 w-10 rounded-xl bg-muted hover:bg-black/[0.08]"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-6 outline-none">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder={t('searchStudent')} 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              className="h-14 rounded-2xl pl-12 border-border bg-card shadow-sm text-base"
            />
          </div>

          <div className="space-y-3">
            {filteredHistorySearch.length > 0 ? (
              filteredHistorySearch.map(student => (
                <Card 
                  key={student.uid} 
                  onClick={() => fetchStudentHistory(student)}
                  className="rounded-[24px] border border-border bg-card shadow-sm hover:shadow-md transition-all cursor-pointer group active:scale-[0.99]"
                >
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4 min-w-0">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={student.photoURL || undefined} />
                        <AvatarFallback className="bg-muted font-bold">{getInitials(student.displayName)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-[16px] font-bold text-foreground">{student.displayName}</p>
                        <p className="text-xs text-muted-foreground font-medium">#{student.studentNumber || 'Ej tildelt'}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-black/20 group-hover:text-primary transition-colors" />
                  </div>
                </Card>
              ))
            ) : (
              searchTerm && <div className="text-center py-12 text-muted-foreground font-medium">{t('noResults')}</div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <FullscreenSheet 
        open={isNoteOpen} 
        onOpenChange={setIsEditNoteOpen} 
        title={t('addNote')}
        rightSlot={<button onClick={() => setIsEditNoteOpen(false)} className="p-2"><X className="h-6 w-6 opacity-40" /></button>}
      >
        <div className="p-6 space-y-8 pb-32">
          <div className="flex flex-col items-center gap-4 text-center">
            <Avatar className="h-20 w-20 border-4 border-white shadow-sm">
              <AvatarImage src={selectedStudent?.photoURL || undefined} />
              <AvatarFallback className="text-xl font-bold">{getInitials(selectedStudent?.displayName)}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-extrabold font-headline">{selectedStudent?.displayName}</h2>
              <p className="text-sm text-muted-foreground font-medium">{selectedStudent?.email}</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">{t('addNote')}</Label>
              <Textarea 
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder={tGlobal("Hvad sagde de? Fx 'Syvende dag i træk, forældre ikke svaret'") }
                className="min-h-[140px] text-base rounded-[24px] border-border bg-card p-6 focus:bg-card shadow-sm transition-all"
              />
            </div>

            <Button 
              onClick={handleSaveNote} 
              disabled={isSavingNote || !noteText.trim()} 
              className="w-full h-16 rounded-2xl bg-primary text-primary-foreground font-bold text-lg shadow-lg shadow-primary/20"
            >
              {isSavingNote ? <Loader2 className="h-6 w-6 animate-spin" /> : <CheckCircle2 className="h-6 w-6 mr-2" />}
              {t('saveNote')}
            </Button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Tidligere noter</h3>
            </div>
            
            <div className="space-y-3">
              {studentNotes.length > 0 ? studentNotes.map(note => (
                <Card key={note.id} className="rounded-2xl border-none bg-muted shadow-sm overflow-hidden p-5 space-y-3">
                  <p className="text-sm font-medium text-foreground leading-relaxed italic">"{note.text}"</p>
                  <div className="flex items-center justify-between border-t border-black/[0.03] pt-3">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{note.authorName}</span>
                    <span className="text-[10px] font-bold text-black/20">{note.createdAt?.toDate().toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                </Card>
              )) : (
                <div className="py-10 text-center text-muted-foreground italic text-sm border-2 border-dashed border-muted rounded-3xl">{t('noNotes')}</div>
              )}
            </div>
          </div>
        </div>
      </FullscreenSheet>

      <FullscreenSheet
        open={isHistoryDetailOpen}
        onOpenChange={setIsHistoryDetailOpen}
        title={selectedStudent?.displayName || t('history')}
        rightSlot={<button onClick={() => setIsHistoryDetailOpen(false)} className="p-2"><X className="h-6 w-6 opacity-40" /></button>}
      >
        <div className="p-6 space-y-10 pb-32 mx-auto max-w-2xl">
          {isFetchingHistory ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-10 w-10 animate-spin text-primary/20" />
            </div>
          ) : (
            <>
              <section className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('attendance')}</h3>
                </div>
                <div className="grid gap-2">
                  {studentHistory.map((row, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-card rounded-2xl border border-border shadow-sm">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-foreground">{row.weekLabel}</span>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                          {row.start.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' })} - {row.end.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <Badge variant={row.attended ? 'default' : 'destructive'} className="rounded-full px-3 h-7 border-none font-bold uppercase text-[9px] tracking-wider">
                        {row.attended ? t('attended') : t('absent')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t('notes')}</h3>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleOpenNote(selectedStudent!)} className="h-8 px-3 rounded-full bg-primary/5 text-primary font-bold text-xs">
                    <PlusCircle className="h-3.5 w-3.5 mr-1.5" /> {t('addNote')}
                  </Button>
                </div>

                <div className="space-y-3">
                  {studentNotes.length > 0 ? studentNotes.map(note => (
                    <Card key={note.id} className="rounded-2xl border-none bg-card shadow-sm overflow-hidden">
                      <div className="p-5 space-y-3">
                        <p className="text-[15px] font-medium text-foreground leading-relaxed break-words italic">"{note.text}"</p>
                        <div className="flex items-center justify-between border-t border-black/[0.03] pt-3">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">{note.authorName}</span>
                          <span className="text-[10px] font-bold text-black/20">{note.createdAt?.toDate().toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                      </div>
                    </Card>
                  )) : (
                    <div className="py-10 text-center text-muted-foreground italic text-sm">{t('noNotes')}</div>
                  )}
                </div>
              </section>
            </>
          )}
        </div>
      </FullscreenSheet>
      
      {/* Absence Detail Sheet */}
      <FullscreenSheet
        open={isAbsenceDetailOpen}
        onOpenChange={setIsAbsenceDetailOpen}
        title={t('fraværDetails')}
        rightSlot={<button onClick={() => setIsAbsenceDetailOpen(false)} className="p-2"><X className="h-6 w-6 opacity-40" /></button>}
      >
        <div className="p-6 space-y-8 pb-32 mx-auto max-w-lg">
          <div className="flex flex-col items-center text-center gap-4 py-6">
            <div className="h-20 w-20 rounded-[28px] bg-amber-100 flex items-center justify-center shadow-xl shadow-amber-500/10">
              <Calendar className="h-10 w-10 text-amber-600" />
            </div>
            <div>
              <h2 className="text-2xl font-display text-primary">{selectedStudent?.displayName}</h2>
              <p className="text-xs font-black uppercase tracking-widest text-primary/40 mt-1">Indmeldt fravær</p>
            </div>
          </div>

          <div className="glass-card shadow-sm border-white/40">
            <div className="glass-card-inner space-y-6">
              <div className="grid grid-cols-2 gap-8 py-2">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary/40">Fra</p>
                  <p className="text-xl font-display text-primary">
                    {reportData?.[reportPeriod]?.[selectedStudent?.uid || '']?.absenceNote?.startDate?.toDate ? 
                      reportData?.[reportPeriod]?.[selectedStudent?.uid || '']?.absenceNote?.startDate?.toDate().toLocaleDateString('da-DK', { day: 'numeric', month: 'short' }) : 
                      '--'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary/40">Til</p>
                  <p className="text-xl font-display text-primary">
                    {reportData?.[reportPeriod]?.[selectedStudent?.uid || '']?.absenceNote?.endDate?.toDate ? 
                      reportData?.[reportPeriod]?.[selectedStudent?.uid || '']?.absenceNote?.endDate?.toDate().toLocaleDateString('da-DK', { day: 'numeric', month: 'short' }) : 
                      '--'}
                  </p>
                </div>
              </div>

              <div className="h-[1px] w-full bg-primary/5" />

              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary/40">Årsag</p>
                <div className="bg-white/80 rounded-[24px] p-6 text-[15px] font-medium leading-relaxed italic text-primary border border-white/60 shadow-inner">
                  "{reportData?.[reportPeriod]?.[selectedStudent?.uid || '']?.absenceNote?.text || 'Ingen besked angivet'}"
                </div>
              </div>
            </div>
          </div>

          <Button 
            onClick={() => setIsAbsenceDetailOpen(false)}
            className="w-full h-16 rounded-[28px] bg-primary text-primary-foreground font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl mt-8"
          >
            Luk oversigt
          </Button>
        </div>
      </FullscreenSheet>
    </div>
  );
}
