'use client';

import { useUser, useFirebase } from '@/firebase';
import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  getDocs,
  query,
  where,
  getDoc,
  updateDoc,
  serverTimestamp,
  deleteField,
  Timestamp,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertCircle } from 'lucide-react';

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

type UserQueue = {
  teacherId: string | null;
  position: number;
  queueLength: number;
  type: 'physical' | 'virtual';
  source: 'universal' | 'dedicated';
  ticketNumber?: number;
  preferredTeacherName?: string | null;
};

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
  const [globalCounts, setGlobalCounts] = useState({
    man_physical: 0,
    man_virtual: 0,
    woman_physical: 0,
    woman_virtual: 0
  });

  const [userQueue, setUserQueue] = useState<UserQueue | null>(null);
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null);
  const [isCalled, setIsCalled] = useState(false);
  const [callingTeacher, setCallingTeacher] = useState<Teacher | null>(null);
  const [callType, setCallType] = useState<'physical' | 'virtual' | null>(null);
  const [redirectNotice, setRedirectNotice] = useState<{ teacherName: string; timestamp?: any } | null>(null);
  const [isChangingTeacher, setIsChangingTeacher] = useState(false);
  const callTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Track the timestamp of the last shown redirect toast to avoid re-showing on remount.
  // Persisted in sessionStorage so it survives page navigation (leave queue → come back).
  const shownRedirectTimestampRef = useRef<number | null>(
    typeof window !== 'undefined'
      ? (parseInt(sessionStorage.getItem('redir_ts') || '0', 10) || null)
      : null
  );
  // When true, redirectNotice/toast won't show (user left queue and came back).
  // Persisted in sessionStorage so it survives navigation back to this page.
  const suppressRedirectRef = useRef(
    typeof window !== 'undefined' && sessionStorage.getItem('redir_suppress') === '1'
  );
  // Single transition guard covering both join AND leave operations.
  // While true, the Firestore snapshot listener won't override local state,
  // preventing race conditions during any queue state change.
  const isTransitioning = useRef(false);
  const transitionTimer = useRef<NodeJS.Timeout | null>(null);

  const startTransition = () => {
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    isTransitioning.current = true;
    // Safety net: auto-expire after 5s even if server never responds
    transitionTimer.current = setTimeout(() => {
      isTransitioning.current = false;
    }, 5000);
  };

  const endTransition = () => {
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    isTransitioning.current = false;
  };

  const getAvailabilityText = (count: number) => {
    if (count === 0) return tGlobal('ingen lærere');
    const key = count === 1 ? 'lærer er klar' : 'lærere er klar';
    return tGlobal(key).replace('{count}', count.toString());
  };

  const physicalTeachers = useMemo(() => {
    return teachersPhysicalRaw.filter(t => {
      if (t.gender !== profile?.gender) return false;
      if (t.allowedStudentIds && t.allowedStudentIds.length > 0) {
        return t.allowedStudentIds.includes(user?.uid || '');
      }
      return true;
    });
  }, [teachersPhysicalRaw, profile?.gender, user?.uid]);

  const virtualTeachers = useMemo(() => {
    return teachersVirtualRaw.filter(t => {
      if (t.gender !== profile?.gender) return false;
      if (t.allowedStudentIds && t.allowedStudentIds.length > 0) {
        return t.allowedStudentIds.includes(user?.uid || '');
      }
      return true;
    });
  }, [teachersVirtualRaw, profile?.gender, user?.uid]);

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

        // Redirection notification
        if (data.redirectNotification && !suppressRedirectRef.current) {
            const incomingTs = data.redirectNotification.timestamp?.toMillis?.() || 0;
            const isNew = shownRedirectTimestampRef.current !== incomingTs;
            
            if (isNew) {
                shownRedirectTimestampRef.current = incomingTs;
                // Persist so navigating away + back doesn't re-show the toast
                if (typeof window !== 'undefined') {
                  sessionStorage.setItem('redir_ts', String(incomingTs));
                }
                // Instantly update local source to 'universal' so the listener switches 
                // to the global queue document instead of the teacher's document.
                // Also clear preferredTeacherName so the banner updates immediately.
                setUserQueue(prev => {
                    if (!prev) return prev;
                    return {
                        ...prev,
                        source: 'universal',
                        teacherId: null,
                        preferredTeacherName: null,
                    };
                });

                // Native-feeling toast at the top of the screen
                toast({
                    className: 'bg-primary border-none text-white rounded-[24px] shadow-2xl',
                    title: (
                        <span className="text-accent text-[10px] font-black uppercase tracking-[0.2em]">
                            {tGlobal('Kø viderestillet')}
                        </span>
                    ) as any,
                    description: (
                        <span className="text-white/80 text-[13px] font-medium leading-snug">
                            {data.redirectNotification.teacherName} {tGlobal('har lukket sin kø. Du er nu i fælleskøen.')}
                        </span>
                    ) as any,
                    action: (
                        <button
                            onClick={() => setIsChangingTeacher(true)}
                            className="shrink-0 h-9 rounded-xl bg-white text-primary text-[10px] font-black uppercase tracking-widest px-4 shadow-sm active:scale-95 transition-transform"
                        >
                            {tGlobal('Vælg lærer')}
                        </button>
                    ) as any,
                });
            }
            setRedirectNotice(data.redirectNotification);
        } else if (!data.redirectNotification) {
            setRedirectNotice(null);
        }
      }
    });

    return () => { unsub1(); unsub2(); unsubStudent(); };
  }, [firestore, user, userQueue?.type, router]);

  // Unified listener for all queue counts (Specific + Global)
  useEffect(() => {
    if (!firestore || !user) return;

    const unsubQueues = onSnapshot(collection(firestore, 'queues'), (snap) => {
      const data: Record<string, any> = {};
      snap.docs.forEach(d => {
        const dData = d.data();
        data[d.id] = {
          count: Object.keys(dData.studentsById || {}).length,
          studentsById: dData.studentsById || {}
        };
      });
      setQueueData(data);
    });

    const unsubGP = onSnapshot(doc(firestore, 'globalQueues', 'physical'), (snap) => {
      const d = snap.data() || {};
      setGlobalCounts(prev => ({
        ...prev,
        man_physical: Object.keys(d.manStudentsById || {}).length,
        woman_physical: Object.keys(d.womanStudentsById || {}).length
      }));
    });

    const unsubGV = onSnapshot(doc(firestore, 'globalQueues', 'virtual'), (snap) => {
      const d = snap.data() || {};
      setGlobalCounts(prev => ({
        ...prev,
        man_virtual: Object.keys(d.manStudentsById || {}).length,
        woman_virtual: Object.keys(d.womanStudentsById || {}).length
      }));
    });

    return () => { unsubQueues(); unsubGP(); unsubGV(); };
  }, [firestore, user]);

  const findMyQueue = useCallback(async () => {
    if (!firestore || !user || !profile) return;
    const gender = profile.gender === 'woman' ? 'woman' : 'man';
    const genderKey = `${gender}StudentsById`;
    
    // 1. Check Global Queues
    const gTypes = ['physical', 'virtual'] as const;
    for (const type of gTypes) {
      const gDoc = await getDoc(doc(firestore, 'globalQueues', type));
      if (gDoc.exists()) {
         const gMap = gDoc.data()[genderKey] || {};
         const myData = gMap[user.uid];
         if (myData) {
            setUserQueue({
              teacherId: myData.preferredTeacherId || null,
              position: 1, 
              queueLength: Object.keys(gMap).length,
              type: type,
              source: 'universal',
              ticketNumber: myData.ticketNumber,
              preferredTeacherName: myData.preferredTeacherName
            });
            setView('in_queue');
            return;
         }
      }
    }

    // 2. Check Specific/Dedicated Queues
    const qSnap = await getDocs(collection(firestore, 'queues'));
    for (const qDoc of qSnap.docs) {
      const data = qDoc.data();
      if (data.studentsById && data.studentsById[user.uid]) {
        const s = data.studentsById[user.uid];
        setUserQueue({
          teacherId: qDoc.id,
          position: 1,
          queueLength: Object.keys(data.studentsById).length,
          type: s.type || 'physical',
          source: 'dedicated',
          preferredTeacherName: s.teacherName || '...'
        });
        setView('in_queue');
        return;
      }
    }
  }, [firestore, user, profile?.gender]);

  const hasBootedRef = useRef(false);
  
  // BOOT CHECK: Find which queue this student is already in (runs once on load)
  useEffect(() => {
    if (!firestore || !user || !profile || hasBootedRef.current) return;
    hasBootedRef.current = true;
    findMyQueue();
  }, [firestore, user, profile, findMyQueue]);

  // This effect ALWAYS listens to BOTH the global queue AND the dedicated queue
  // so there is never a gap when students are redirected from dedicated -> global.
  useEffect(() => {
    if (!firestore || !user || !userQueue || !profile) return;

    const queueType = userQueue.type;
    const genderKey = `${profile.gender === 'woman' ? 'woman' : 'man'}StudentsById`;

    const handleSnapshot = (snap: any, source: 'universal' | 'dedicated') => {
      if (!snap.exists()) return;

      let map: Record<string, any> = {};
      if (source === 'universal') {
        map = snap.data()[genderKey] || {};
      } else {
        map = snap.data().studentsById || {};
      }

      const myData = map[user.uid];

      // Student found in THIS particular queue document
      if (myData) {
        const myTime = myData.joinedAt?.toMillis() || Date.now();
        const earlierCount = Object.values(map).filter((s: any) => {
          const sTime = s.joinedAt?.toMillis?.() || 0;
          return sTime < myTime;
        }).length;

        endTransition();
        setUserQueue((prev: UserQueue | null) => {
          if (!prev) return prev;
          return {
            ...prev,
            source,
            // Only update teacherId if switching to dedicated
            teacherId: source === 'dedicated' ? (prev.teacherId) : null,
            position: earlierCount + 1,
            queueLength: Object.keys(map).length,
            ticketNumber: myData.ticketNumber || prev.ticketNumber,
            preferredTeacherName: source === 'universal'
              ? (myData.preferredTeacherName || null)
              : (myData.teacherName || myData.preferredTeacherName || prev.preferredTeacherName),
          };
        });
        setView('in_queue');
        return;
      }

      // Not found in this doc. If also not found in either doc, go to landing.
      // We let the other listener handle finding the student; only if both confirm
      // absence do we navigate away, which is handled by the student doc watcher.
    };

    // Always listen to the global queue for this type
    const unsubGlobal = onSnapshot(
      doc(firestore, 'globalQueues', queueType),
      (snap) => handleSnapshot(snap, 'universal')
    );

    // Also listen to any dedicated queue the student might be in
    // This covers: initial dedicated join, and re-preferencing back to a teacher
    const teacherId = userQueue.teacherId;
    const unsubDedicated = teacherId
      ? onSnapshot(doc(firestore, 'queues', teacherId), (snap) => handleSnapshot(snap, 'dedicated'))
      : null;

    return () => {
      unsubGlobal();
      unsubDedicated?.();
    };
  }, [firestore, user?.uid, userQueue?.type, userQueue?.teacherId, profile?.gender, isCalled]);

  // When the student first joins a queue, fetch the teacher profile if not already set.
  useEffect(() => {
    if (!firestore || !userQueue?.teacherId || currentTeacher?.id === userQueue.teacherId) return;
    getDoc(doc(firestore, 'teachers', userQueue.teacherId)).then(tDoc => {
      if (tDoc.exists()) {
        setCurrentTeacher({ id: tDoc.id, ...(tDoc.data() as any) } as Teacher);
        if (!isTransitioning.current) setView('in_queue');
      }
    });
  }, [firestore, userQueue?.teacherId]);

  const handleChangePreferredTeacher = async (teacherId: string | null) => {
    if (!user || !userQueue) return;

    // Optimistically resolve teacher name for immediate banner update
    const allTeachers = [...physicalTeachers, ...virtualTeachers];
    const chosenTeacher = teacherId ? allTeachers.find(t => t.id === teacherId) : null;
    const chosenName = chosenTeacher?.displayName || null;

    // Optimistically update banner immediately (Firestore snapshot will confirm later)
    setUserQueue(prev => prev ? {
      ...prev,
      teacherId: teacherId || null,
      preferredTeacherName: chosenName,
    } : prev);

    // Clear redirect notice state — student has resolved the redirect by choosing
    setRedirectNotice(null);
    suppressRedirectRef.current = false;
    shownRedirectTimestampRef.current = null;
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('redir_ts');
      sessionStorage.removeItem('redir_suppress');
    }

    try {
      const functions = getFunctions();
      const updateFn = httpsCallable(functions, 'updateQueuePreference');
      await updateFn({ teacherId, type: userQueue.type });
      setIsChangingTeacher(false);
    } catch (err: any) {
      toast({ variant: 'destructive', title: tGlobal('Kunne ikke opdatere lærer'), description: (err as any).message });
    }
  };

  const handleJoinQueue = async (teacherId: string, type: 'physical' | 'virtual') => {
    if (!user || !firestore || !profile) return;
    if (isJoining) return;
    triggerHaptic();
    if (userQueue) { toast({ variant: 'destructive', title: 'Allerede i kø' }); return; }

    // Start transition guard immediately before any async work
    startTransition();
    setIsJoining(teacherId);

    let lat: number | undefined;
    let lon: number | undefined;

    if (type === 'physical') {
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, {
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 60000 // 1 minute
          })
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
      const result = await joinQueueFn({
        teacherId,
        type,
        lat,
        lon,
        displayName: profile.displayName,
        photoURL: profile.photoURL || null,
        fcmToken: fcm || null,
        phoneNumber: profile.phoneNumber || null,
      });

      const data = result.data as any;
      if (data.success) {
        const tObj = physicalTeachers.find(x => x.id === teacherId) || virtualTeachers.find(x => x.id === teacherId);

        // Reset redirect state for fresh queue join
        suppressRedirectRef.current = false;
        shownRedirectTimestampRef.current = null;
        setRedirectNotice(null);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('redir_ts');
          sessionStorage.removeItem('redir_suppress');
        }

        // Transition guard is ALREADY set (before the async call) — just update state
        setCurrentTeacher(tObj || { id: teacherId, displayName: '...' } as any);
        setUserQueue({
          teacherId,
          position: data.position,
          queueLength: data.queueLength,
          type,
          source: data.source || 'universal',
          ticketNumber: data.ticketNumber
        });
        setView('in_queue');
      } else {
        endTransition(); // Unexpected — release guard
      }
    } catch (err: any) {
      endTransition(); // Release guard on error so user can retry
      const code = err?.code;
      if (code === 'functions/permission-denied') {
        toast({ variant: 'destructive', title: 'For langt væk', description: 'Du er ikke tæt nok på skolen.' });
      } else if (code === 'functions/already-exists') {
        toast({ variant: 'destructive', title: 'Allerede i kø' });
        findMyQueue();
      } else {
        toast({ variant: 'destructive', title: 'Fejl ved tilmelding', description: err?.message });
      }
    } finally {
      setIsJoining(null);
    }
  };

  const handleLeaveQueue = async (tid: string | null) => {
    if (!user || !firestore) return;
    triggerHaptic();

    const isUniversal = userQueue?.source === 'universal';
    const type = userQueue?.type;

    // Suppress redirect notice after the student leaves — persist so navigating back doesn't re-show
    suppressRedirectRef.current = true;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('redir_suppress', '1');
    }
    setRedirectNotice(null);
    shownRedirectTimestampRef.current = null;
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('redir_ts');
    }

    // Optimistic reset: update UI instantly so user can rejoin immediately
    startTransition();
    setUserQueue(null);
    setCurrentTeacher(null);
    setView('landing'); 

    try {
      const functions = getFunctions();
      const leaveQueueFn = httpsCallable(functions, 'leaveQueue');
      await leaveQueueFn({ 
        teacherId: tid,
        isGlobal: isUniversal,
        type
      });
      endTransition(); // Server confirmed — release guard
    } catch (err: any) {
      endTransition();
      toast({ variant: 'destructive', title: 'Kunne ikke forlade køen', description: err?.message });
    } finally {
      setIsJoining(null);
    }
  };

  // Reset suppress flag whenever the student successfully joins a new queue
  const handleJoinGlobalQueue = async (type: 'physical' | 'virtual') => {
    if (!user || !firestore || !profile) return;
    if (isJoining) return;
    triggerHaptic();
    if (userQueue) { toast({ variant: 'destructive', title: tGlobal('Allerede i kø') }); return; }

    startTransition();
    setIsJoining('fastest');

    let lat: number | undefined;
    let lon: number | undefined;

    if (type === 'physical') {
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, {
            enableHighAccuracy: true,
            timeout: 8000,
            maximumAge: 60000 // 1 minute
          })
        );
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
      } catch {
        toast({ variant: 'destructive', title: tGlobal('Lokation påkrævet') });
        setIsJoining(null);
        return;
      }
    }

    const fcm = await ensureWebPushToken('student');

    try {
      const functions = getFunctions();
      const joinFn = httpsCallable(functions, 'joinGlobalQueue');
      const result = await joinFn({
        type,
        lat,
        lon,
        displayName: profile.displayName,
        photoURL: profile.photoURL || null,
        fcmToken: fcm || null,
        phoneNumber: profile.phoneNumber || null,
      });

      const data = result.data as any;
      if (data.success) {
        suppressRedirectRef.current = false; // Allow future redirects
        shownRedirectTimestampRef.current = null;
        setRedirectNotice(null);
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('redir_ts');
          sessionStorage.removeItem('redir_suppress');
        }
        setUserQueue({
          teacherId: data.preferredTeacherId || null,
          position: data.position,
          queueLength: data.queueLength,
          type,
          source: 'universal',
          ticketNumber: data.ticketNumber
        });
        setView('in_queue');
      } else {
        endTransition();
      }
    } catch (err: any) {
      endTransition();
      const code = err?.code;
      if (code === 'functions/permission-denied') {
        toast({ variant: 'destructive', title: tGlobal('For langt væk') });
      } else if (code === 'functions/already-exists') {
        toast({ variant: 'destructive', title: tGlobal('Allerede i kø') });
        findMyQueue();
      } else {
        toast({ variant: 'destructive', title: tGlobal('Fejl ved tilmelding'), description: err?.message });
      }
    } finally {
      setIsJoining(null);
    }
  };

  if (isUserLoading || isProfileLoading || !user || !profile) return null;

  if (isCalled && callingTeacher) {
    return (
      <div className="min-h-screen pt-20 pb-32 px-6 w-full max-w-lg mx-auto flex flex-col items-center justify-center text-center">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card w-full shadow-2xl">
          <div className="glass-card-inner !p-12 space-y-10">
            <div className="relative h-32 w-32 mx-auto">
              <div className="absolute inset-0 animate-ping bg-accent/20 rounded-full scale-150" />
              <div className="relative h-full w-full bg-primary rounded-[40px] flex items-center justify-center shadow-2xl border-4 border-white">
                <Sparkles className="h-16 w-16 text-accent" />
              </div>
            </div>
            <div className="space-y-4">
              <h2 className="text-4xl font-display text-primary tracking-tight">
                {callType === 'virtual' ? tGlobal('Vær klar!') : tGlobal('Det er din tur!')}
              </h2>
              <p className="text-sm font-bold text-primary/40 uppercase tracking-widest leading-relaxed">
                {callType === 'virtual'
                  ? tGlobal('Din lærer ringer dig op virtuelt lige nu. Bliv på denne skærm.')
                  : tGlobal('{teacherName} venter på dig i lokale {room}.')
                    .replace('{teacherName}', callingTeacher.displayName)
                    .replace('{room}', callingTeacher.room || '')}
              </p>
            </div>
            <Button onClick={handleReturnToLanding} className="w-full h-20 rounded-[32px] bg-primary text-white font-black uppercase tracking-[0.2em] shadow-xl">
              {tGlobal('Tilbage til forside')}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (view === 'in_queue' && userQueue) {
    // Is the student in the fast/global queue (either originally or after redirect)?
    const isInGlobalQueue = userQueue.source === 'universal';
    // A student has a preferred teacher only when preferredTeacherName is set.
    // After redirect this is null → "Hurtig Kø" indicator shows instead.
    const hasPreferredTeacher = !!userQueue.preferredTeacherName;

    return (
      <div className="min-h-screen pt-20 pb-32 px-6 w-full max-w-lg mx-auto flex flex-col items-center justify-center text-center gap-6">
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card w-full shadow-2xl">
          <div className="glass-card-inner !p-10 space-y-12">
            <div className="space-y-4">
              <div className="px-6 py-2 bg-accent/10 text-accent rounded-full text-[10px] font-black uppercase tracking-widest inline-block">{userQueue.type === 'physical' ? tGlobal('Fysisk') : tGlobal('Virtuelt')}</div>
              <h2 className="text-4xl font-display text-primary">{tGlobal('Du er i kø')}</h2>
              
              <div className="flex flex-col gap-2 mt-4">
                <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary/40">
                   <Users className="h-3 w-3" />
                   {tGlobal('{count} aktive lærere').replace('{count}', (userQueue.type === 'physical' ? physicalTeachers.length : virtualTeachers.length).toString()) }
                </div>
                {/* Show preferred teacher tag when a teacher is explicitly chosen */}
                {hasPreferredTeacher && (
                  <div className="text-[10px] font-black uppercase tracking-widest text-accent">
                    {tGlobal('Valgt lærer')}: {userQueue.preferredTeacherName}
                  </div>
                )}
                {/* Show fast-queue indicator if in global queue with no preferred teacher */}
                {isInGlobalQueue && !hasPreferredTeacher && (
                  <div className="flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600">
                    <Sparkles className="h-3 w-3" />
                    {tGlobal('Hurtig Kø — alle lærere')}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-[140px] font-display text-primary leading-none tracking-tighter">#{userQueue.position}</div>
              
              {userQueue.ticketNumber && userQueue.type === 'physical' && (
                <div className="mt-4 pt-4 border-t border-primary/5">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/20 mb-1">{tGlobal('Kø ID (TV system)')}</p>
                  <p className="text-xl font-display text-primary/40">A{userQueue.ticketNumber}</p>
                </div>
              )}
            </div>
            
            <div className="space-y-3">
              <Button onClick={() => handleLeaveQueue(userQueue.teacherId)} className="w-full h-16 rounded-[28px] bg-red-50 text-red-600 font-black uppercase tracking-[0.2em] border border-red-100 shadow-sm">
                {tGlobal('Forlad kø')}
              </Button>
            </div>
          </div>
        </motion.div>

        {/* In-app redirect notification — styled to match app design, only when redirected and not suppressed */}
        <AnimatePresence>
          {redirectNotice && !suppressRedirectRef.current && (
            <motion.div
              key="redirect-notice"
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              className="w-full overflow-hidden"
            >
              <div className="rounded-[28px] bg-primary text-white shadow-2xl overflow-hidden">
                <div className="p-6 flex items-start gap-4">
                  <div className="shrink-0 h-10 w-10 rounded-2xl bg-white/15 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-accent" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent mb-1">{tGlobal('Kø viderestillet')}</p>
                    <p className="text-[13px] text-white/80 font-medium leading-snug">
                      {redirectNotice.teacherName} {tGlobal('har lukket sin kø. Du er nu i fælleskøen.')}
                    </p>
                  </div>
                </div>
                <div className="px-6 pb-6">
                  <button
                    onClick={() => setIsChangingTeacher(true)}
                    className="w-full h-12 rounded-2xl bg-white text-primary text-[11px] font-black uppercase tracking-[0.18em] shadow-lg active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
                  >
                    <Users className="h-4 w-4" />
                    {tGlobal('Vælg ny lærer')}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Dialog open={isChangingTeacher} onOpenChange={setIsChangingTeacher}>
            <DialogContent className="max-w-lg p-0 overflow-hidden bg-[#FDFCF7] border-none rounded-[40px] max-h-[85vh] flex flex-col">
                <DialogHeader className="p-8 pb-4">
                    <DialogTitle className="text-2xl font-display text-primary">{tGlobal('Vælg ny lærer')}</DialogTitle>
                    <p className="text-[10px] font-black uppercase tracking-widest text-accent">{tGlobal('Din position i køen bevares')}</p>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto p-6 pt-0 space-y-4">
                    {(userQueue.type === 'physical' ? physicalTeachers : virtualTeachers).map(t => (
                        <motion.div 
                            key={t.id} 
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleChangePreferredTeacher(t.id)} 
                            className="p-5 rounded-[28px] bg-white border border-primary/5 flex items-center gap-4 cursor-pointer hover:border-primary/20 transition-all shadow-sm"
                        >
                            <Avatar className="h-12 w-12 border-2 border-white shadow-md">
                                <AvatarImage src={t.photoURL || ''} className="object-cover" />
                                <AvatarFallback className="bg-primary/5 font-display text-primary">{getInitials(t.displayName)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <h4 className="font-bold text-primary">{t.displayName}</h4>
                                <p className="text-[10px] font-black uppercase tracking-widest text-primary/30">
                                    {userQueue.type === 'physical' ? `${tGlobal('Lokale')} ${t.room}` : tGlobal('Virtuelt')}
                                </p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-primary/20" />
                        </motion.div>
                    ))}
                    <Button 
                        variant="ghost" 
                        onClick={() => handleChangePreferredTeacher(null)}
                        className="w-full py-6 text-[10px] font-black uppercase tracking-widest text-primary/40"
                    >
                        {tGlobal('Fortsæt uden specifik lærer')}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
      </div>
    );
  }

  const renderTeacherList = (teachers: Teacher[], isV: boolean) => (
    <div className="min-h-screen pt-12 pb-32 px-6 w-full max-w-lg mx-auto space-y-10">
      <div className="flex items-center gap-4">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setView('landing')} className="h-14 w-14 rounded-2xl bg-card dark:bg-white/10 backdrop-blur-md flex items-center justify-center shadow-lg border border-border transition-all">
          <ChevronRight className="h-6 w-6 text-primary rotate-180" />
        </motion.button>
        <div className="section-label">{tGlobal('Vælg Lærer')}</div>
      </div>
      
      <motion.div 
         initial={{ opacity: 0, y: 20 }} 
         animate={{ opacity: 1, y: 0 }} 
         whileHover={{ y: -4 }}
         onClick={() => handleJoinGlobalQueue(isV ? 'virtual' : 'physical')}
         className="glass-card bg-primary shadow-xl border-none overflow-hidden relative group cursor-pointer"
       >
         <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
            <LuxuryShootingStars />
         </div>
         <div className="glass-card-inner !p-6 flex items-center gap-6 relative z-10">
            <div className="h-14 w-14 rounded-2xl bg-accent flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
               <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <div className="flex-grow">
               <h3 className="text-white font-display text-xl leading-tight">{tGlobal('Hurtig Tilmelding')}</h3>
               <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">{tGlobal('Find hurtigste')}</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-white/10 text-foreground dark:text-white flex items-center justify-center backdrop-blur-md border border-white/20">
               {isJoining === 'fastest' ? <Loader2 className="h-5 w-5 animate-spin" /> : <ChevronRight className="h-5 w-5" />}
            </div>
         </div>
       </motion.div>

       <IslamicDivider />

      <div className="space-y-4">
        {teachers.map(t => (
          <motion.div 
            key={t.id} 
            whileHover={{ x: 5 }} 
            onClick={() => !isJoining && handleJoinQueue(t.id, isV ? 'virtual' : 'physical')} 
            className="glass-card group cursor-pointer shadow-sm"
          >
            <div className="glass-card-inner !py-6 !px-6 flex items-center gap-5">
              <Avatar className="h-16 w-16 border-4 border-border dark:border-white/20 shadow-xl">
                <AvatarImage src={t.photoURL || ''} className="object-cover" />
                <AvatarFallback className="bg-primary/10 dark:bg-white/10 font-display text-xl text-primary dark:text-white">{getInitials(t.displayName)}</AvatarFallback>
              </Avatar>
              <div className="flex-grow">
                <h3 className="font-bold text-lg text-primary">{t.displayName}</h3>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-[10px] font-black text-accent uppercase tracking-widest">{isV ? tGlobal('Virtuelt') : `${tGlobal('Lokale')} ${t.room}`}</span>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-primary/30">
                    <Users className="h-3 w-3" /> 
                    {(queueData[t.id]?.count || 0) + (isV 
                      ? (t.gender === 'woman' ? globalCounts.woman_virtual : globalCounts.man_virtual)
                      : (t.gender === 'woman' ? globalCounts.woman_physical : globalCounts.man_physical)
                    )}
                  </div>
                </div>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-foreground text-background flex items-center justify-center shadow-lg group-hover:scale-110 transition-all">
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
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => setParentView('overview')} className="h-14 w-14 rounded-2xl bg-card dark:bg-white/10 backdrop-blur-md flex items-center justify-center shadow-lg border border-border cursor-pointer">
          <ChevronRight className="h-6 w-6 text-primary rotate-180" />
        </motion.button>
        <div>
          <h1 className="text-4xl font-display text-primary leading-none mb-1">{tGlobal('Kø System')}</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-accent">{tGlobal('Tilmeld dig dagens kø')}</p>
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
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 blur-3xl -mr-32 -mt-32 transition-transform group-hover:scale-125 duration-700" />
            <div className="flex items-center gap-8 relative z-10">
              <div className="h-20 w-20 bg-primary rounded-[32px] flex items-center justify-center shadow-2xl border-4 border-white/20 group-hover:rotate-6 transition-transform">
                <Book className="h-10 w-10 text-accent" />
              </div>
              <div>
                <h3 className="text-2xl font-display text-primary">{tGlobal('Læs Fysisk')}</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-accent mt-1">{getAvailabilityText(physicalTeachers.length)}</p>
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
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/10 blur-3xl -ml-32 -mb-32 transition-transform group-hover:scale-125 duration-700" />
            <div className="flex items-center gap-8 relative z-10">
              <div className="h-20 w-20 bg-primary rounded-[32px] flex items-center justify-center shadow-2xl border-4 border-white/20 group-hover:-rotate-6 transition-transform">
                <Phone className="h-10 w-10 text-accent" />
              </div>
              <div>
                <h3 className="text-2xl font-display text-primary">{tGlobal('Læs Virtuelt')}</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-accent mt-1">{getAvailabilityText(virtualTeachers.length)}</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <IslamicDivider />
    </div>
  );
}
