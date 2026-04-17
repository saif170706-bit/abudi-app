'use client';

import { useUser, useFirebase } from '@/firebase';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  getDoc,
  updateDoc,
  serverTimestamp,
  deleteField,
  Timestamp,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  CheckCircle,
  Users,
  Phone,
  Book,
  ArrowLeft,
  ChevronRight,
  MapPin,
  Sparkles,
} from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ensureWebPushToken, bindForegroundMessaging } from '@/lib/fcm';
import { useView } from '@/context/ViewContext';
import { getInitials, cn } from '@/lib/utils';
import { useLanguage, type Language } from '@/context/LanguageContext';
import { useGlobalTranslation } from '@/hooks/useGlobalTranslation';
import { useHaptic } from 'use-haptic';
import IslamicDivider from '@/components/ui/IslamicDivider';
import { motion, AnimatePresence } from 'framer-motion';

interface Teacher {
  id: string;
  displayName: string;
  subject?: string;
  room?: string;
  photoURL?: string | null;
  name: string;
  gender: 'man' | 'woman';
  availablePhysical?: boolean;
  availableVirtual?: boolean;
  queueLocked?: boolean;
  queueLetter?: string;
  allowedStudentIds?: string[] | null;
}

type StudentQueueInfo = {
  name?: string;
  joinedAt?: any;
  type: 'physical' | 'virtual';
  photoURL?: string | null;
  fcmToken?: string | null;
  phoneNumber?: string | null;
};

type StudentsById = Record<string, StudentQueueInfo>;
type QueueDataByTeacher = Record<string, { count: number; studentsById: StudentsById }>;

const designatedLocations = [
  { lat: 55.777020517702425, lon: 12.522056199450153, radius: 100 }, 
  { lat: 55.71671948579918, lon: 12.435200438173235, radius: 150 }, 
  { lat: 55.716644, lon: 12.435022, radius: 150 },
];

function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface HomeworkReadingPageProps {
  BackButton: React.ComponentType;
}



function LuxuryShootingStars() {
  const containerRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<any[]>([]);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let width = container.offsetWidth;
    let height = container.offsetHeight;

    const STAR_COUNT = 12; // Higher density like the reference
    const stars: any[] = [];
    const random = (min: number, max: number) => Math.random() * (max - min) + min;

    const createStar = () => ({
      x: random(-width * 0.5, width * 0.8),
      y: random(-height * 0.4, height * 0.6),
      length: random(120, 240), // Long trails
      speed: random(1.2, 2.8),
      size: 0.5, // Thin elegant trails
      opacity: random(0.3, 0.85),
      delay: random(0, 250),
    });

    for (let i = 0; i < STAR_COUNT; i++) stars.push(createStar());
    starsRef.current = stars;

    const animate = () => {
      width = container.offsetWidth;
      height = container.offsetHeight;
      const starEls = container.querySelectorAll('.lux-star');

      starsRef.current.forEach((star, index) => {
        if (star.delay > 0) {
          star.delay -= 1;
        } else {
          star.x += star.speed;
          star.y += star.speed * 0.6; // Parallel path

          const el = starEls[index] as HTMLElement;
          if (el) {
            el.style.transform = `translate(${star.x}px, ${star.y}px) rotate(31deg)`;
            el.style.width = `${star.length}px`;
            el.style.height = `${star.size}px`;
            el.style.opacity = String(star.opacity);
          }

          if (star.x > width + 150 || star.y > height + 150) {
            starsRef.current[index] = createStar();
            starsRef.current[index].x = random(-width * 0.7, -40);
            starsRef.current[index].y = random(-height * 0.5, height * 0.5);
          }
        }
      });
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    const ro = new ResizeObserver(() => { width = container.offsetWidth; height = container.offsetHeight; });
    ro.observe(container);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="luxury-star-bg-glow" />
      <div className="luxury-star-sparkles" />
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="lux-star" />
      ))}
    </div>
  );
}

export default function HomeworkReadingPage({ BackButton }: HomeworkReadingPageProps) {
  const { user, loading: isUserLoading } = useUser() as any;
  const { profile, isLoading: isProfileLoading } = useUserProfile() as any;
  const { firestore } = useFirebase();
  const router = useRouter();
  const { setView: setParentView } = useView();
  const { toast } = useToast();
  const { triggerHaptic } = useHaptic();
  const { language } = useLanguage();
  const { tGlobal } = useGlobalTranslation();

  const [isJoining, setIsJoining] = useState<string | null>(null);
  const [view, setView] = useState<'landing' | 'physical_queue' | 'virtual_queue' | 'in_queue'>('landing');
  const [teachersPhysicalRaw, setTeachersPhysicalRaw] = useState<Teacher[]>([]);
  const [teachersVirtualRaw, setTeachersVirtualRaw] = useState<Teacher[]>([]);
  const [queueData, setQueueData] = useState<QueueDataByTeacher>({});
  const [userQueue, setUserQueue] = useState<{ teacherId: string; position: number; queueLength: number; type: 'physical' | 'virtual'; ticketNumber?: number; } | null>(null);
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null);
  const [isCalled, setIsCalled] = useState(false);
  const [callingTeacher, setCallingTeacher] = useState<Teacher | null>(null);
  const [callType, setCallType] = useState<'physical' | 'virtual' | null>(null);
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getAvailabilityText = (count: number) => {
    if (count === 0) return tGlobal('ingen lærere');
    const key = count === 1 ? 'lærer er klar' : 'lærere er klar';
    return tGlobal(key).replace('{count}', count.toString());
  };

  const filterTeacher = (t: Teacher, type: 'physical' | 'virtual') => {
    if (t.gender !== profile?.gender) return false;
    if (type === 'physical' && !t.availablePhysical) return false;
    if (type === 'virtual' && !t.availableVirtual) return false;
    if (t.allowedStudentIds && t.allowedStudentIds.length > 0) {
      if (!t.allowedStudentIds.includes(user?.uid || '')) return false;
    }
    return true;
  };

  const physicalTeachers = useMemo(() => teachersPhysicalRaw.filter((t) => filterTeacher(t, 'physical')), [teachersPhysicalRaw, profile?.gender, user?.uid]);
  const virtualTeachers = useMemo(() => teachersVirtualRaw.filter((t) => filterTeacher(t, 'virtual')), [teachersVirtualRaw, profile?.gender, user?.uid]);

  useEffect(() => {
    if (!isUserLoading && !user) router.push('/');
  }, [user, isUserLoading, router]);

  const handleReturnToLanding = useCallback(async () => {
    if (!user || !firestore) return;
    setParentView('overview');
    const studentDocRef = doc(firestore, 'students', user.uid);
    try { await updateDoc(studentDocRef, { calledBy: deleteField() }); } catch (error) { }
    setIsCalled(false); setCallingTeacher(null); setCallType(null);
  }, [user, firestore, setParentView]);

  useEffect(() => {
    if (!firestore || !user) return;

    // Watch teacher availability (2 lightweight filtered queries)
    const q1 = query(collection(firestore, 'teachers'), where('availablePhysical', '==', true), where('queueLocked', '==', false));
    const unsub1 = onSnapshot(q1, (s) => setTeachersPhysicalRaw(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Teacher))));
    const q2 = query(collection(firestore, 'teachers'), where('availableVirtual', '==', true), where('queueLocked', '==', false));
    const unsub2 = onSnapshot(q2, (s) => setTeachersVirtualRaw(s.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Teacher))));

    // Watch own student doc (call notifications + queue membership check)
    const unsubStudent = onSnapshot(doc(firestore, 'students', user.uid), async (studentDoc) => {
      if (studentDoc.exists()) {
        const data = studentDoc.data() as any;
        const callData = data.calledBy;
        if (callData && callData.teacherId && callData.calledAt instanceof Timestamp) {
            const age = Date.now() - callData.calledAt.toMillis();
            if (age > 180000) { updateDoc(doc(firestore, 'students', user.uid), { calledBy: deleteField() }); return; }
            const tDoc = await getDoc(doc(firestore, 'teachers', callData.teacherId));
            if (tDoc.exists()) { 
              setCallingTeacher({ id: tDoc.id, ...(tDoc.data() as any) } as Teacher); 
              setCallType(callData.type || userQueue?.type || 'physical'); 
              setIsCalled(true); 
              setUserQueue(null); 
            }
        } else { setIsCalled(false); }
      }
    });

    return () => { unsub1(); unsub2(); unsubStudent(); };
  }, [firestore, user, userQueue?.type]);

  // Watch ONLY the specific teacher's queue doc after the student has joined.
  // This replaces the previous onSnapshot(collection('queues')) which watched ALL
  // teacher queue documents simultaneously — very expensive at scale.
  useEffect(() => {
    if (!firestore || !user || !userQueue?.teacherId) return;

    const unsubQueue = onSnapshot(doc(firestore, 'queues', userQueue.teacherId), async (qDoc) => {
      if (!qDoc.exists()) {
        setUserQueue(null);
        setQueueData({});
        if (!isCalled) setView('landing');
        return;
      }

      const data = qDoc.data() as any;
      const teacherId = userQueue.teacherId;
      const sById = data.studentsById || {};
      const list = Object.entries(sById).map(([id, v]: any) => ({
        id,
        type: v.type,
        ms: v.joinedAt?.toMillis() || 0,
        ticketNumber: v.ticketNumber
      })).sort((a, b) => a.ms - b.ms);

      setQueueData({ [teacherId]: { count: list.length, studentsById: sById } });

      const idx = list.findIndex(s => s.id === user.uid);
      if (idx >= 0) {
        setUserQueue(prev => ({
          teacherId,
          position: idx + 1,
          queueLength: list.length,
          type: list[idx].type,
          ticketNumber: list[idx].ticketNumber,
        }));
      } else {
        // Student was removed from queue
        setUserQueue(null);
        if (!isCalled) setView('landing');
      }
    });

    return () => unsubQueue();
  }, [firestore, user, userQueue?.teacherId, isCalled]);

  // When the student first joins a queue, set the current teacher
  useEffect(() => {
    if (!firestore || !userQueue?.teacherId || currentTeacher?.id === userQueue.teacherId) return;
    getDoc(doc(firestore, 'teachers', userQueue.teacherId)).then(tDoc => {
      if (tDoc.exists()) {
        setCurrentTeacher({ id: tDoc.id, ...(tDoc.data() as any) } as Teacher);
        setView('in_queue');
      }
    });
  }, [firestore, userQueue?.teacherId]);

  const handleJoinQueue = async (teacherId: string, type: 'physical' | 'virtual') => {
    if (!user || !firestore || !profile) return;
    triggerHaptic();
    if (userQueue) { toast({ variant: 'destructive', title: 'Allerede i kø' }); return; }
    setIsJoining(teacherId);

    let lat: number | undefined;
    let lon: number | undefined;

    if (type === 'physical') {
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej)
        );
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
      } catch {
        toast({ variant: 'destructive', title: 'Lokation påkrævet' });
        setIsJoining(null);
        return;
      }
    }

    const fcm = await ensureWebPushToken('student');

    try {
      // Call the secure Cloud Function (atomic + server-side geolocation)
      const functions = getFunctions();
      const joinQueueFn = httpsCallable(functions, 'joinQueue');
      await joinQueueFn({
        teacherId,
        type,
        lat,
        lon,
        displayName: profile.displayName,
        photoURL: profile.photoURL || null,
        fcmToken: fcm || null,
        phoneNumber: profile.phoneNumber || null,
      });
    } catch (err: any) {
      const code = err?.code;
      if (code === 'functions/permission-denied') {
        toast({ variant: 'destructive', title: 'For langt væk', description: 'Du er ikke tæt nok på skolen.' });
      } else if (code === 'functions/already-exists') {
        toast({ variant: 'destructive', title: 'Allerede i kø' });
      } else {
        toast({ variant: 'destructive', title: 'Fejl ved tilmelding', description: err?.message });
      }
    } finally {
      setIsJoining(null);
    }
  };

  const handleLeaveQueue = async (tid: string) => {
    if (!user || !firestore) return;
    try {
      const functions = getFunctions();
      const leaveQueueFn = httpsCallable(functions, 'leaveQueue');
      await leaveQueueFn({ teacherId: tid });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Kunne ikke forlade køen', description: err?.message });
    }
  };

  if (isUserLoading || isProfileLoading || !user || !profile) return null;

  if (isCalled && callingTeacher) {
    return (
      <div className="min-h-screen pt-20 pb-32 px-6 w-full max-w-lg mx-auto flex flex-col items-center justify-center text-center">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card w-full shadow-2xl">
          <div className="glass-card-inner !p-12 space-y-10">
            <div className="relative h-32 w-32 mx-auto">
               <div className="absolute inset-0 animate-ping bg-[#DEA93E]/20 rounded-full scale-150" />
               <div className="relative h-full w-full bg-[#004D40] rounded-[40px] flex items-center justify-center shadow-2xl border-4 border-white">
                  <Sparkles className="h-16 w-16 text-[#DEA93E]" />
               </div>
            </div>
            <div className="space-y-4">
               <h2 className="text-4xl font-display text-[#004D40] tracking-tight">
                  {callType === 'virtual' ? tGlobal('Vær klar!') : tGlobal('Det er din tur!')}
               </h2>
               <p className="text-sm font-bold text-[#004D40]/40 uppercase tracking-widest leading-relaxed">
                  {callType === 'virtual' 
                    ? tGlobal('Din lærer ringer dig op virtuelt lige nu. Bliv på denne skærm.') 
                    : tGlobal('{teacherName} venter på dig i lokale {room}.')
                      .replace('{teacherName}', callingTeacher.displayName)
                      .replace('{room}', callingTeacher.room || '')}
               </p>
            </div>
            <Button onClick={handleReturnToLanding} className="w-full h-20 rounded-[32px] bg-[#004D40] text-white font-black uppercase tracking-[0.2em] shadow-xl">
               {tGlobal('Tilbage til forside')}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (view === 'in_queue' && userQueue && currentTeacher) {
    return (
      <div className="min-h-screen pt-20 pb-32 px-6 w-full max-w-lg mx-auto flex flex-col items-center justify-center text-center">
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card w-full shadow-2xl">
          <div className="glass-card-inner !p-10 space-y-12">
            <div className="space-y-4">
               <div className="px-6 py-2 bg-[#DEA93E]/10 text-[#DEA93E] rounded-full text-[10px] font-black uppercase tracking-widest inline-block">{userQueue.type === 'physical' ? tGlobal('Fysisk') : tGlobal('Virtuelt')}</div>
               <h2 className="text-4xl font-display text-[#004D40]">{tGlobal('Du er i kø')}</h2>
               <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#004D40]/30">{currentTeacher.displayName}</p>
            </div>
            <div className="space-y-4">
               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#DEA93E]">{tGlobal('Din plads i køen')}</p>
               <div className="text-[140px] font-display text-[#004D40] leading-none tracking-tighter">#{userQueue.position}</div>
               {userQueue.ticketNumber && userQueue.type === 'physical' && currentTeacher && (
                 <div className="bg-[#004D40]/5 rounded-2xl p-4 border border-[#004D40]/10">
                   <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#004D40]/40 mb-1">{tGlobal('Dit Kø ID (TV system)')}</p>
                   <p className="text-2xl font-display text-[#004D40]">{(currentTeacher.queueLetter || 'A')}{userQueue.ticketNumber}</p>
                 </div>
               )}
            </div>
            <Button onClick={() => handleLeaveQueue(userQueue.teacherId)} className="w-full h-16 rounded-[28px] bg-red-50 text-red-600 font-black uppercase tracking-[0.2em] border border-red-100 shadow-sm">
               {tGlobal('Forlad kø')}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const renderTeacherList = (teachers: Teacher[], isV: boolean) => (
    <div className="min-h-screen pt-12 pb-32 px-6 w-full max-w-lg mx-auto space-y-10">
       <div className="flex items-center gap-4">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setView('landing')} className="h-14 w-14 rounded-2xl bg-white/80 backdrop-blur-md flex items-center justify-center shadow-lg border border-white transition-all">
             <ChevronRight className="h-6 w-6 text-[#004D40] rotate-180" />
          </motion.button>
          <div className="section-label">{tGlobal('Vælg Lærer')}</div>
       </div>
       <div className="space-y-4">
          {teachers.map(t => (
            <motion.div key={t.id} whileHover={{ x: 5 }} onClick={() => handleJoinQueue(t.id, isV ? 'virtual' : 'physical')} className="glass-card group cursor-pointer shadow-sm">
               <div className="glass-card-inner !py-6 !px-6 flex items-center gap-5">
                  <Avatar className="h-16 w-16 border-4 border-white shadow-xl">
                     <AvatarImage src={t.photoURL || ''} className="object-cover" />
                     <AvatarFallback className="bg-[#004D40]/5 font-display text-xl text-[#004D40]">{getInitials(t.displayName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-grow">
                     <h3 className="font-bold text-lg text-[#004D40]">{t.displayName}</h3>
                     <div className="flex items-center gap-4 mt-1">
                        <span className="text-[10px] font-black text-[#DEA93E] uppercase tracking-widest">{isV ? tGlobal('Virtuelt') : `${tGlobal('Lokale')} ${t.room}`}</span>
                        <div className="flex items-center gap-1 text-[10px] font-bold text-[#004D40]/30"><Users className="h-3 w-3" /> {queueData[t.id]?.count || 0}</div>
                     </div>
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-[#004D40] text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-all">
                     {isJoining === t.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <ChevronRight className="h-5 w-5" />}
                  </div>
               </div>
            </motion.div>
          ))}
       </div>
    </div>
  );

  if (view === 'physical_queue') return renderTeacherList(physicalTeachers, false);
  if (view === 'virtual_queue') return renderTeacherList(virtualTeachers, true);

  return (
    <div className="min-h-screen pt-12 pb-32 px-6 w-full max-w-lg mx-auto space-y-12">
       <div className="flex items-center gap-4">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => setParentView('overview')} className="h-14 w-14 rounded-2xl bg-white/80 backdrop-blur-md flex items-center justify-center shadow-lg border border-white cursor-pointer">
             <ChevronRight className="h-6 w-6 text-[#004D40] rotate-180" />
          </motion.button>
          <div>
              <h1 className="text-4xl font-display text-[#004D40] leading-none mb-1">{tGlobal('Kø System')}</h1>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#DEA93E]">{tGlobal('Tilmeld dig dagens kø')}</p>
          </div>
       </div>

       <div className="grid grid-cols-1 gap-6">
           <motion.div 
             whileHover={{ y: -8 }} 
             whileTap={{ scale: 0.98 }} 
             onClick={() => setView('physical_queue')} 
             className="glass-card shadow-2xl cursor-pointer overflow-hidden relative group"
           >
              <LuxuryShootingStars />
              
              <div className="glass-card-inner !p-10 relative overflow-hidden backdrop-blur-sm">
                 <div className="absolute inset-0 opacity-[0.04] pointer-events-none mix-blend-multiply">
                    <div className="absolute inset-0 bg-[url('https://i.postimg.cc/xC74tT1V/flat-arabic-pattern-background-79603-1826.avif')] bg-center bg-repeat" />
                 </div>
                 <div className="absolute top-0 right-0 w-64 h-64 bg-[#DEA93E]/10 blur-3xl -mr-32 -mt-32 transition-transform group-hover:scale-125 duration-700" />
                 <div className="flex items-center gap-8 relative z-10">
                    <div className="h-20 w-20 bg-[#004D40] rounded-[32px] flex items-center justify-center shadow-2xl border-4 border-white/20 group-hover:rotate-6 transition-transform">
                       <Book className="h-10 w-10 text-[#DEA93E]" />
                    </div>
                    <div>
                       <h3 className="text-2xl font-display text-[#004D40]">{tGlobal('Læs Fysisk')}</h3>
                       <p className="text-[10px] font-black uppercase tracking-widest text-[#DEA93E] mt-1">{getAvailabilityText(physicalTeachers.length)}</p>
                    </div>
                 </div>
              </div>
           </motion.div>

           <motion.div 
             whileHover={{ y: -8 }} 
             whileTap={{ scale: 0.98 }} 
             onClick={() => setView('virtual_queue')} 
             className="glass-card shadow-2xl cursor-pointer overflow-hidden relative group"
           >
              <LuxuryShootingStars />

              <div className="glass-card-inner !p-10 relative overflow-hidden backdrop-blur-sm">
                 <div className="absolute inset-0 opacity-[0.04] pointer-events-none mix-blend-multiply">
                    <div className="absolute inset-0 bg-[url('https://i.postimg.cc/xC74tT1V/flat-arabic-pattern-background-79603-1826.avif')] bg-center bg-repeat" />
                 </div>
                 <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#004D40]/10 blur-3xl -ml-32 -mb-32 transition-transform group-hover:scale-125 duration-700" />
                 <div className="flex items-center gap-8 relative z-10">
                    <div className="h-20 w-20 bg-[#004D40] rounded-[32px] flex items-center justify-center shadow-2xl border-4 border-white/20 group-hover:-rotate-6 transition-transform">
                       <Phone className="h-10 w-10 text-[#DEA93E]" />
                    </div>
                    <div>
                       <h3 className="text-2xl font-display text-[#004D40]">{tGlobal('Læs Virtuelt')}</h3>
                       <p className="text-[10px] font-black uppercase tracking-widest text-[#DEA93E] mt-1">{getAvailabilityText(virtualTeachers.length)}</p>
                    </div>
                 </div>
              </div>
           </motion.div>
        </div>

       <IslamicDivider />
    </div>
  );
}
