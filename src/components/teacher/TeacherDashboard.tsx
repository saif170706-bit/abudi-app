'use client';

import { useState, useEffect } from 'react';
import { useFirebase, useUser } from '@/firebase';
import {
  doc,
  updateDoc,
  writeBatch,
  serverTimestamp,
  deleteField,
  getDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  runTransaction,
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Bell, Users, Check, LogOut, Phone, ArrowLeft, X, Lock, Unlock, MapPin, UserPlus, Maximize2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Switch } from '@/components/ui/switch';
import QueueAssignmentManager from './QueueAssignmentManager';
import TeacherFilterGroupManager from './TeacherFilterGroupManager';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import Image from 'next/image';
import { sendTeacherCall } from '@/lib/send-teacher-call';
import { useLanguage, type Language } from '@/context/LanguageContext';
import { useHaptic } from 'use-haptic';
import { getInitials, cn } from '@/lib/utils';
import { useView } from '@/context/ViewContext';
import { useUserProfile } from '@/hooks/use-user-profile';
import type { QueueStudent } from '@/types';
import CallingDialog from '@/components/calls/CallingDialog';
import { useTeacherReadingData } from '@/hooks/use-teacher-reading-data';
import { motion, AnimatePresence } from 'framer-motion';
import { SectionLabel } from '@/components/ui/primitives';

interface TeacherDashboardProps {
  BackButton: React.ComponentType;
}

interface Teacher {
  id: string;
  room?: string;
  availablePhysical?: boolean;
  availableVirtual?: boolean;
  queueLetter?: string;
  queueLocked?: boolean;
  displayName?: string;
  photoURL?: string;
  gender?: string;
  currentlyCalling?: any;
  lastCalledTicket?: any;
  savedFilters?: { id: string; name: string; studentIds: string[] }[];
  activeFilterId?: string | null;
}

const translations: Record<string, Record<Language, string>> = {
    homeworkReadingTitle: { da: 'Lektiehjælp', en: 'Homework Reading', ar: 'قراءة الواجبات' , so: "Akhriska"},
    backToFrontpage: { da: 'Tilbage til forside', en: 'Back to Frontpage', ar: 'العودة إلى الصفحة الرئيسية' , so: "Dib ugusonoqo Bogga Hore"},
    makeAvailable: { da: 'Gør dig tilgængelig', en: 'Make Yourself Available', ar: 'اجعل نفسك متاحًا' , so: "Hubiso inaa helio karo"},
    availabilityDesc: { da: 'Indtast dit lokale og vælg tilgængelighed.', en: 'Enter your room and choose availability.', ar: 'أدخل غرفtek واختر التوفر.' , so: "Gal qaybooga oo ka dooro helida."},
    availability: { da: 'Tilgængelighed', en: 'Availability', ar: 'التوفر' , so: "Helida"},
    physicalHelp: { da: 'Fysisk hjælp', en: 'Physical Help', ar: 'مساعدة حضورية' , so: "Caawinta Joog"},
    virtualHelp: { da: 'Virtuel hjælp', en: 'Virtual Help', ar: 'مساعدة عن بعد' , so: "Caawinta Internet"},
    room: { da: 'Lokale', en: 'Room', ar: 'غرفة' , so: "Qol"},
    roomPlaceholder: { da: 'Lokale nummer', en: 'Room number', ar: 'رقم الغرفة' , so: "Nambarka qolka"},
    confirmAvailability: { da: 'Bekræft tilgængelighed', en: 'Confirm availability', ar: 'تأكيد التوفر' , so: "Hubso helido"},
    dashboardTitle: { da: 'Kø Oversigt', en: 'Queue Dashboard', ar: 'لوحة التحكم' , so: "Daashboodhka Safraan"},
    queueDescription: { da: '{count} studerende venter', en: '{count} students waiting', ar: '{count} طالب في الانتظار' , so: "{count} arday ayaa sugeysa" },
    roomInfo: { da: 'Lokale: {room}', en: 'Room: {room}', ar: 'الغرفة: {room}', so: "Qolka: {room}" },
    virtualInfo: { da: 'Virtuelt tilgængelig', en: 'Virtually available', ar: 'متاح عن بعد' , so: "Internet-ka in ladiio karo"},
    unlockQueue: { da: 'Lås op', en: 'Unlock', ar: 'فتح' , so: "Qufulfurid"},
    lockQueue: { da: 'Lås kø', en: 'Lock Queue', ar: 'قفل الانتظار' , so: "Xiro Safraanka"},
    makeUnavailable: { da: 'Afslut session', en: 'End Session', ar: 'إنهاء الجلسة' , so: "Gabo Seshiga"},
    call: { da: 'Kald', en: 'Call', ar: 'استدعاء' , so: "Weec"},
    ring: { da: 'Ring', en: 'Ring', ar: 'اتصال' , so: "Gambaley"},
    queueEmpty: { da: 'Køen er tom!', en: 'The queue is empty!', ar: 'قائمة الانتظار فارغة!' , so: "Safraankan wuu madhan yahay!"},
    noStudentsInQueue: { da: 'Der er ingen studerende i din kø lige nu.', en: 'There are no students in your queue right now.', ar: 'لا يوجد طلاب في الانتظار حالياً.' , so: "Xilagan ardado safraankoga majiron."},
    backToQueue: { da: 'Tilbage til kø', en: 'Back to Queue', ar: 'العودة إلى الانتظار' , so: "Noqo Safraankoodga"},
    viewPhoto: { da: 'Se billede', en: 'View Photo', ar: 'عرض الصورة' , so: "Firi Sawirka"},
};

export default function TeacherDashboard({ BackButton }: TeacherDashboardProps) {
  const { user } = useUser();
  const { profile } = useUserProfile();
  const { firestore } = useFirebase();
  const { servingStudent, setServingStudent } = useView();
  const { toast } = useToast();
  const router = useRouter();
  const { language } = useLanguage();
  const { triggerHaptic } = useHaptic();

  // Use pre-fetched background data
  const { teacher: rawTeacher, queue, isLoading: fetchingData } = useTeacherReadingData();
  const teacher = rawTeacher as Teacher | null;

  const [isLoading, setIsLoading] = useState(false);
  const [room, setRoom] = useState('');
  const [isAvailablePhysical, setIsAvailablePhysical] = useState(false);
  const [isAvailableVirtual, setIsAvailableVirtual] = useState(false);
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  
  const [savedFilters, setSavedFilters] = useState<{ id: string; name: string; studentIds: string[] }[]>([]);
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);
  
  const [callingState, setCallingState] = useState<{
    open: boolean;
    callId: string | null;
    recipientId: string | null;
    type: 'video' | 'audio' | null;
  }>({ open: false, callId: null, recipientId: null, type: null });

  // Sync internal state with fetched teacher object once when data arrives
  useEffect(() => {
    if (teacher && !hasLoadedInitial) {
      setRoom(teacher.room || '');
      setIsAvailablePhysical(teacher.availablePhysical || false);
      setIsAvailableVirtual(teacher.availableVirtual || false);
      setSavedFilters(teacher.savedFilters || []);
      setActiveFilterId(teacher.activeFilterId || null);
      
      // Self-repair: If physically available but no letter, assign one
      if (teacher.availablePhysical && !teacher.queueLetter && user && firestore) {
        const repairLetter = async () => {
          try {
            const q = query(collection(firestore, 'teachers'), where('availablePhysical', '==', true));
            const snap = await getDocs(q);
            const existing = new Set(snap.docs.map(d => (d.data() as any).queueLetter).filter(l => !!l));
            for (let i = 0; i < 26; i++) {
              const L = String.fromCharCode(65 + i);
              if (!existing.has(L)) {
                await updateDoc(doc(firestore, 'teachers', user.uid), { queueLetter: L });
                break;
              }
            }
          } catch (err) {
            console.warn('[TeacherDashboard] Failed to repair queue letter:', err);
          }
        };
        repairLetter();
      }
      
      setHasLoadedInitial(true);
    }
  }, [teacher, hasLoadedInitial, user, firestore]);

  const t = (key: string, params?: Record<string, string | number>) => {
    let text = translations[key]?.[language] || translations[key]?.['en'] || key;
    if (params) {
        Object.keys(params).forEach(pKey => {
            text = text.replace(`{${pKey}}`, String(params[pKey]));
        });
    }
    return text;
  };

  const isAnythingAvailable =
    teacher?.availablePhysical || teacher?.availableVirtual;

  const isButtonDisabled =
    (!isAvailablePhysical && !isAvailableVirtual) || 
    (isAvailablePhysical && !room.trim());

  const handleAvailability = async () => {
    if (!user || !firestore) return;
    const teacherDocRef = doc(firestore, 'teachers', user.uid);
    
    setIsLoading(true);
    try {
      let repairLetterStr = '';
      if (isAvailablePhysical) {
        const q = query(collection(firestore, 'teachers'), where('availablePhysical', '==', true));
        const snap = await getDocs(q);
        const existingLetters = new Set(snap.docs.map(d => (d.data() as any).queueLetter).filter(l => !!l));
        
        for (let i = 0; i < 26; i++) {
          const L = String.fromCharCode(65 + i);
          if (!existingLetters.has(L)) {
            repairLetterStr = L;
            break;
          }
        }
        if (!repairLetterStr) repairLetterStr = 'Z';
      }

      await runTransaction(firestore, async (transaction) => {
        const tSnap = await transaction.get(teacherDocRef);
        const tData = tSnap.data() as any;
        let queueLetter = tData?.queueLetter || '';

        if (isAvailablePhysical && !queueLetter) {
          queueLetter = repairLetterStr;
        }

        let newAllowedStudentIds: string[] | null = null;
        if (activeFilterId) {
            const filter = savedFilters.find(f => f.id === activeFilterId);
            if (filter) newAllowedStudentIds = filter.studentIds;
        }

        transaction.update(teacherDocRef, {
          room: isAvailablePhysical ? room : '',
          availablePhysical: isAvailablePhysical,
          availableVirtual: isAvailableVirtual,
          queueLetter: isAvailablePhysical ? queueLetter : '',
          queueLocked: false,
          activeFilterId: activeFilterId || null,
          allowedStudentIds: newAllowedStudentIds,
          savedFilters: savedFilters
        });
      });
      
      triggerHaptic();
    } catch (e) {
      console.error("Availability update failed:", e);
      toast({ variant: 'destructive', title: 'Fejl', description: 'Kunne ikke opdatere din status.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMakeUnavailable = async () => {
    if (!user || !firestore) return;
    const teacherDocRef = doc(firestore, 'teachers', user.uid);
    await updateDoc(teacherDocRef, {
      room: '',
      availablePhysical: false,
      availableVirtual: false,
      queueLocked: false,
      activeFilterId: null,
      allowedStudentIds: null
    });
    // Reset local state to match the new unavailable status
    setIsAvailablePhysical(false);
    setIsAvailableVirtual(false);
    setRoom('');
    setActiveFilterId(null);
    setHasLoadedInitial(false); // Enable re-syncing if the dashboard is refreshed
  };

  const toggleQueueLock = async () => {
    if (!user || !firestore || !teacher) return;
    triggerHaptic();
    const teacherDocRef = doc(firestore, 'teachers', user.uid);
    await updateDoc(teacherDocRef, {
      queueLocked: !teacher.queueLocked,
    });
  };

  const callStudent = async (student: QueueStudent) => {
    if (!user || !firestore || !teacher) return;

    const isVirtual = student.type === 'virtual';
    const batch = writeBatch(firestore);
    const studentDocRef = doc(firestore, 'students', student.id);
    batch.update(studentDocRef, { 
        calledBy: {
            teacherId: user.uid,
            calledAt: serverTimestamp(),
            type: isVirtual ? 'virtual' : 'physical'
        } 
    });

    const queueDocRef = doc(firestore, 'queues', user.uid);
    batch.update(queueDocRef, {
      [`studentsById.${student.id}`]: deleteField()
    });

    // Safety: If student doesn't have a ticket number, assign them one now
    let ticketToUse = student.ticketNumber;
    
    if (!isVirtual && !ticketToUse) {
      const queueDoc = await getDoc(queueDocRef);
      const nextTicket = (queueDoc.data()?.lastTicketNumber || 0) + 1;
      ticketToUse = nextTicket;
      // Update the counter so the next join doesn't overlap
      batch.update(queueDocRef, { lastTicketNumber: nextTicket });
    }

    const teacherDocRef = doc(firestore, 'teachers', user.uid);
    
    const currentlyCallingData: any = {
      studentId: student.id,
      studentName: student.name,
      studentNumber: student.studentNumber || null,
      studentType: isVirtual ? 'virtual' : ((student as any).source === 'ipad' ? 'physical' : 'phone'),
      calledAt: serverTimestamp()
    };

    if (!isVirtual) {
      currentlyCallingData.ticketNumber = ticketToUse;
      currentlyCallingData.announcementId = crypto.randomUUID();
    }

    const updates: any = {
      currentlyCalling: currentlyCallingData
    };

    if (!isVirtual) {
      updates.lastCalledTicket = {
        ticketNumber: ticketToUse,
        queueLetter: teacher?.queueLetter || 'A',
        studentNumber: student.studentNumber || null
      };
    }

    batch.update(teacherDocRef, updates);

    if (student.type === 'virtual') {
        const callId = `q-${user.uid.slice(0, 12)}-${student.id.slice(0, 12)}-${Date.now()}`;
        const inviteRef = doc(firestore, 'callInvites', student.id);
        batch.set(inviteRef, {
            callId,
            from: user.uid,
            fromName: teacher.displayName || user.displayName || 'En lærer',
            fromPhoto: teacher.photoURL || user.photoURL || '',
            type: 'audio',
        });
        const callDocRef = doc(firestore, 'activeCalls', callId);
        batch.set(callDocRef, { members: [user.uid], type: 'audio' });

        setCallingState({ open: true, callId, recipientId: student.id, type: 'audio' });
    }

    try {
        await batch.commit();
        await sendTeacherCall({
            studentId: student.id,
            fcmToken: student.fcmToken,
            type: student.type,
            teacherName: teacher.displayName || user.displayName || 'En lærer',
            room: teacher.room,
            callId: `call-${Date.now()}`
        });
    } catch (error) {
        console.error("Call operation failed:", error);
    }
    
    setServingStudent(student);
  };
  
  const cancelCall = async (reason: 'cancelled' | 'timeout') => {
    if (!callingState.callId || !callingState.recipientId || !firestore) return;
    const inviteDocRef = doc(firestore, 'callInvites', callingState.recipientId);
    await getDoc(inviteDocRef).then((snap) => {
        if (snap.exists()) deleteDoc(inviteDocRef).catch(() => {});
    });
    setCallingState({ open: false, callId: null, recipientId: null, type: null });
  };

  const onCallConnected = () => {
    if (!callingState.callId || !callingState.type) return;
    const { callId, type } = callingState;
    setCallingState({ open: false, callId: null, recipientId: null, type: null });
    router.push(`/${type}/${callId}`);
  };

  const handleBackToQueue = async () => {
    if (!user || !firestore || !servingStudent) return;
    const studentDocRef = doc(firestore, 'students', servingStudent.id);
    const teacherDocRef = doc(firestore, 'teachers', user.uid);
    try {
        const batch = writeBatch(firestore);
        batch.update(studentDocRef, { calledBy: deleteField() });
        batch.update(teacherDocRef, { currentlyCalling: deleteField() });
        await batch.commit();
    } catch (error) {}
    setServingStudent(null);
  };

  const toggleNameExpansion = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (servingStudent) {
    return (
      <>
        <CallingDialog
          isOpen={callingState.open}
          callId={callingState.callId || ''}
          type={callingState.type}
          onCancel={cancelCall}
          onConnected={onCallConnected}
        />
        <div className="min-h-screen bg-transparent px-6 pt-16 pb-28 sm:px-8 w-full max-w-lg mx-auto">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full"
            >
                <div className="mb-10 flex items-center gap-4">
                    <button 
                        onClick={handleBackToQueue}
                        className="h-12 w-12 rounded-2xl bg-white/80 backdrop-blur-md flex items-center justify-center shadow-lg border border-white active:scale-95 transition-transform"
                    >
                        <ArrowLeft className="h-6 w-6 text-[#004D40]" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-display text-[#004D40]">Afhøring</h1>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#DEA93E]">Nuværende Elev</p>
                    </div>
                </div>
                
                <QueueAssignmentManager 
                    studentId={servingStudent.id} 
                    studentName={servingStudent.name}
                    onCycleComplete={() => setServingStudent(null)}
                />
            </motion.div>
        </div>
      </>
    );
  }

  if (!isAnythingAvailable) {
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
                <h1 className="text-3xl font-display text-[#004D40]">{t('makeAvailable')}</h1>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#DEA93E]">Vælg din status</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass-card shadow-2xl">
              <div className="glass-card-inner !p-8 space-y-8">
                <div className="flex items-center justify-between gap-4">
                    <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#004D40]/30">{t('availability')}</p>
                    <TeacherFilterGroupManager 
                        teacherId={user?.uid || ''}
                        teacherGender={profile?.gender || 'man'}
                        savedFilters={savedFilters}
                        activeFilterId={activeFilterId}
                        onFilterChange={setActiveFilterId}
                        onSaveFilters={async (fs: any[]) => {
                            setSavedFilters(fs);
                            if (firestore && user) {
                            await updateDoc(doc(firestore, 'teachers', user.uid), { savedFilters: fs });
                            }
                        }}
                        iconOnly
                    />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-5 rounded-[24px] bg-white/40 border border-white shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-inner">
                        <MapPin className="h-6 w-6" />
                      </div>
                      <Label htmlFor="physical-switch" className="text-[17px] font-bold text-[#004D40]">{t('physicalHelp')}</Label>
                    </div>
                    <Switch
                      id="physical-switch"
                      checked={isAvailablePhysical}
                        className="data-[state=checked]:bg-[#DEA93E]"
                      onCheckedChange={(checked) => {
                        triggerHaptic();
                        setIsAvailablePhysical(checked);
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between p-5 rounded-[24px] bg-white/40 border border-white shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-600 shadow-inner">
                        <Phone className="h-6 w-6" />
                      </div>
                      <Label htmlFor="virtual-switch" className="text-[17px] font-bold text-[#004D40]">{t('virtualHelp')}</Label>
                    </div>
                    <Switch
                      id="virtual-switch"
                      checked={isAvailableVirtual}
                        className="data-[state=checked]:bg-[#004D40]"
                      onCheckedChange={(checked) => {
                        triggerHaptic();
                        setIsAvailableVirtual(checked);
                      }}
                    />
                  </div>
                </div>

                {isAvailablePhysical && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="space-y-3 pt-6 px-2 pb-4"
                  >
                    <Label htmlFor="room" className="text-[11px] font-black uppercase tracking-widest text-[#004D40]/40 ml-1">{t('room')}</Label>
                    <Input
                      id="room"
                      value={room}
                      onChange={(e) => setRoom(e.target.value)}
                      placeholder={t('roomPlaceholder')}
                      className="h-16 rounded-2xl border-white bg-white/60 shadow-inner text-xl px-6 font-display focus-visible:ring-[#004D40] outline-none"
                    />
                  </motion.div>
                )}


                <Button
                  className="w-full h-18 text-xl font-display rounded-3xl bg-[#004D40] hover:bg-[#00332B] text-white shadow-2xl shadow-[#004D40]/20 active:scale-[0.98] transition-all"
                  onClick={handleAvailability}
                  disabled={isButtonDisabled}
                >
                  {t('confirmAvailability')}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent px-6 pt-16 pb-28 sm:px-8 w-full max-w-lg mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full"
      >
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <BackButton />
            <div>
                <h1 className="text-3xl font-display text-[#004D40]">{t('dashboardTitle')}</h1>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#DEA93E]">Administrer din session</p>
            </div>
          </div>
          <div className="flex gap-3">
            <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleQueueLock} 
                className={cn(
                    "grid h-12 w-12 place-items-center rounded-2xl shadow-lg transition-all border",
                    teacher.queueLocked 
                        ? 'bg-rose-500 text-white border-rose-400' 
                        : 'bg-white/80 backdrop-blur-md text-[#004D40] border-white'
                )}
            >
              {teacher.queueLocked ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
            </motion.button>
            <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleMakeUnavailable} 
                className="grid h-12 w-12 place-items-center rounded-2xl bg-white/80 backdrop-blur-md text-rose-500 shadow-lg border border-white"
            >
              <LogOut className="h-5 w-5" />
            </motion.button>
          </div>
        </div>

        <div className="mb-10 flex flex-wrap gap-4">
          <div className="px-4 py-2 rounded-2xl bg-[#DEA93E]/10 border border-[#DEA93E]/20 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#DEA93E] animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-widest text-[#B4841F]">
                {t('queueDescription', {count: queue.length})}
            </span>
          </div>
          
          {teacher.availablePhysical && (
            <div className="px-4 py-2 rounded-2xl bg-[#004D40]/5 border border-[#004D40]/10 flex items-center gap-2">
                <MapPin className="h-3 w-3 text-[#004D40]" />
                <span className="text-[11px] font-black uppercase tracking-widest text-[#004D40]">
                    {t('roomInfo', { room: teacher.room || '' })}
                </span>
            </div>
          )}
          
          {teacher.availableVirtual && (
            <div className="px-4 py-2 rounded-2xl bg-[#004D40]/5 border border-[#004D40]/10 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-black uppercase tracking-widest text-[#004D40]">
                    {t('virtualInfo')}
                </span>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <SectionLabel>Studerende i kø</SectionLabel>
          <AnimatePresence>
            {queue.length > 0 ? (
                <div className="space-y-4">
                    {queue.map((student, index) => {
                    const isNext = index === 0;
                    const isVirtual = student.type === 'virtual';
                    const isExpanded = expandedIds.has(student.id);
                    return (
                        <motion.div
                            key={student.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={cn(
                                "group relative overflow-visible",
                                isNext ? "z-20 scale-[1.02]" : "z-10"
                            )}
                        >
                            <div className={cn(
                                "glass-card transition-all duration-300 shadow-2xl",
                                isNext ? "ring-2 ring-[#DEA93E] shadow-[#DEA93E]/10" : "hover:border-primary/20"
                            )}>
                                <div className="glass-card-inner !p-6 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-5 min-w-0">
                                        <div 
                                            className="relative shrink-0 cursor-pointer" 
                                            onClick={() => student.photoURL && setViewingPhoto(student.photoURL)}
                                        >
                                            <div className={cn(
                                                "p-1 rounded-[24px] border-2 transition-all duration-500 scale-110",
                                                isNext ? "border-[#DEA93E] rotate-6" : "border-white/40"
                                            )}>
                                                <Avatar className="h-16 w-16 rounded-[20px] shadow-2xl">
                                                    <AvatarImage src={student.photoURL ?? undefined} alt={student.name} className="object-cover" />
                                                    <AvatarFallback className="bg-muted text-xl font-headline">{getInitials(student.name)}</AvatarFallback>
                                                </Avatar>
                                            </div>
                                            {isNext && (
                                                <motion.div 
                                                    initial={{ scale: 0 }}
                                                    animate={{ scale: 1 }}
                                                    className="absolute -top-3 -left-3 h-8 w-8 rounded-full bg-[#DEA93E] border-2 border-white flex items-center justify-center text-[13px] font-black text-white shadow-lg"
                                                >
                                                    1
                                                </motion.div>
                                            )}
                                        </div>
                                        
                                        <div className="min-w-0 flex-1 ml-2">
                                            <h3 
                                                className={cn("text-xl font-display text-[#004D40] leading-none mb-1.5 cursor-pointer", !isExpanded && "truncate")} 
                                                onClick={() => toggleNameExpansion(student.id)}
                                            >
                                                {student.name} {student.ticketNumber && <span className="text-[#DEA93E]">{(teacher?.queueLetter || 'A')}{student.ticketNumber}</span>}
                                            </h3>
                                            <div className="flex items-center gap-3">
                                                {isVirtual ? (
                                                    <div className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-600 text-[9px] font-black uppercase tracking-widest border border-rose-100 flex items-center gap-1">
                                                        <Phone className="h-2.5 w-2.5" />
                                                        Virtuel
                                                    </div>
                                                ) : (
                                                    <div className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-1">
                                                        <MapPin className="h-2.5 w-2.5" />
                                                        Fysisk
                                                    </div>
                                                )}
                                                <span className="text-[10px] text-[#004D40]/30 font-bold">Venter nu</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {isNext ? (
                                        <motion.button 
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={() => callStudent(student)} 
                                            className="h-14 px-8 rounded-2xl bg-[#004D40] text-white font-black text-xs uppercase tracking-[0.15em] shadow-xl shadow-[#004D40]/20 flex items-center gap-3"
                                        >
                                            {isVirtual ? (
                                                <><Phone className="h-4 w-4" />{t('ring')}</>
                                            ) : (
                                                <><Bell className="h-4 w-4" />{t('call')}</>
                                            )}
                                        </motion.button>
                                    ) : (
                                        <div className="h-10 w-10 rounded-xl bg-white/20 border border-white flex items-center justify-center text-[#004D40]/20">
                                            <Lock className="h-4 w-4" />
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            {isNext && (
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-[#DEA93E]/20 to-transparent blur-2xl -z-10 rounded-[40px] opacity-20" />
                            )}
                        </motion.div>
                    );
                    })}
                </div>
            ) : (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-20 px-8 text-center rounded-[40px] border-2 border-dashed border-[#004D40]/10 bg-white/20 backdrop-blur-sm w-full"
                >
                    <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-xl mb-8 relative">
                        <UserPlus className="h-10 w-10 text-[#DEA93E]" />
                        <motion.div 
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="absolute inset-0 rounded-full border-4 border-[#DEA93E]/20" 
                        />
                    </div>
                    <h3 className="text-2xl font-display text-[#004D40]">{t('queueEmpty')}</h3>
                    <p className="mt-3 text-[13px] text-[#004D40]/40 font-medium leading-relaxed max-w-[240px] mx-auto">{t('noStudentsInQueue')}</p>
                </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <Dialog open={!!viewingPhoto} onOpenChange={(open) => !open && setViewingPhoto(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black/90 border-none rounded-[40px]">
          <DialogTitle className="sr-only">{t('viewPhoto')}</DialogTitle>
          <div className="relative w-full aspect-square sm:aspect-auto sm:h-[80vh] flex items-center justify-center">
            {viewingPhoto && <Image src={viewingPhoto} alt="Student profile" fill className="object-contain" priority />}
            <button onClick={() => setViewingPhoto(null)} className="absolute top-8 right-8 h-12 w-12 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors backdrop-blur-md border border-white/10"><X className="h-6 w-6" /></button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
