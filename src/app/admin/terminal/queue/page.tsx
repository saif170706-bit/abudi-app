'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFirebase } from '@/firebase';
import { collection, query, where, getDocs, doc, onSnapshot, serverTimestamp, runTransaction } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { ChevronRight, Users, Loader2, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getFunctions, httpsCallable } from 'firebase/functions';

export default function TerminalQueue() {
  const [view, setView] = useState('rest' as 'rest' | 'input' | 'teachers' | 'success');
  const [studentNumber, setStudentNumber] = useState('');
  const [student, setStudent] = useState(null as any);
  const [teachers, setTeachers] = useState([] as any[]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successInfo, setSuccessInfo] = useState(null as { ticketNumber: number; studentNumber: string; teacherName: string | null } | null);
  const [globalCount, setGlobalCount] = useState(0);

  const { firestore } = useFirebase();
  const router = useRouter();

  // Reset timeout
  const timeoutRef = useRef(null as NodeJS.Timeout | null);
  const logoClickCount = useRef(0);
  const logoClickTimeout = useRef(null as NodeJS.Timeout | null);

  const handleLogoClick = () => {
    logoClickCount.current += 1;
    if (logoClickTimeout.current) clearTimeout(logoClickTimeout.current);

    if (logoClickCount.current >= 3) {
      router.push('/admin');
    } else {
      logoClickTimeout.current = setTimeout(() => {
        logoClickCount.current = 0;
      }, 1000);
    }
  };

  const resetTimeout = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setView('rest');
      setStudentNumber('');
      setStudent(null);
      setErrorMsg('');
    }, 60000); // 60 seconds inactivity timeout
  };

  useEffect(() => {
    if (view !== 'rest') {
      resetTimeout();
    } else {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [view, studentNumber]);

  useEffect(() => {
    if (!firestore) return;

    // Listen for physical teachers
    const q1 = query(collection(firestore, 'teachers'), where('availablePhysical', '==', true), where('queueLocked', '==', false));
    const unsub1 = onSnapshot(q1, (s) => setTeachers(s.docs.map((d) => ({ id: d.id, ...d.data() }))));

    // Listen for queues to get specific count (legacy/hint)
    const unsubQueues = onSnapshot(collection(firestore, 'queues'), (queues) => {
      // We'll use this to hint at specific queues if needed, but primary is global
    });

    // Listen to Global Queue for absolute count
    const unsubGlobal = onSnapshot(doc(firestore, 'globalQueues', 'physical'), (snap) => {
      if (snap.exists() && student) {
        const data = snap.data();
        const key = student.gender === 'woman' ? 'womanStudentsById' : 'manStudentsById';
        const count = Object.keys(data[key] || {}).length;
        setGlobalCount(count);
      }
    });

    return () => {
      unsub1();
      unsubQueues();
      unsubGlobal();
    };
  }, [firestore, student]);

  const handleLookupStudent = async () => {
    if (!studentNumber) return;
    setLoading(true);
    setErrorMsg('');
    try {
      // Lookup student
      const q = query(collection(firestore, 'students'), where('studentNumber', '==', studentNumber));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        setErrorMsg('Elevnummer ikke fundet. Prøv igen.');
      } else {
        const docSnap = snapshot.docs[0];
        setStudent({ id: docSnap.id, ...docSnap.data() });
        setView('teachers');
      }
    } catch (e) {
      setErrorMsg('Der opstod en fejl.');
    } finally {
      setLoading(false);
    }
  };
  const handleJoinQueue = async (teacher: any | null) => {
    if (!student || !firestore) return;
    setLoading(true);
    try {
      const functions = getFunctions();
      const joinQueueFn = httpsCallable(functions, 'joinQueue');

      const res = await joinQueueFn({
        teacherId: teacher?.id || null,
        type: 'physical',
        displayName: student.displayName,
        phoneNumber: student.phoneNumber,
        studentNumber: student.studentNumber,
        // iPad is stationary at the school, so we can mock coords or leave them to server if trusted
        lat: 55.72,
        lon: 12.44
      });

      const data = res.data as any;
      setSuccessInfo({
        ticketNumber: data.ticketNumber,
        studentNumber: student.studentNumber,
        teacherName: teacher?.displayName || null
      });
      setView('success');

      setTimeout(() => {
        setView('rest');
        setStudentNumber('');
        setStudent(null);
      }, 7000);

    } catch (e: any) {
      console.error("Queue join error:", e);
      setErrorMsg(e.message || 'Kunne ikke tilføje til køen.');
    } finally {
      setLoading(false);
    }
  };

  const handleNumberPad = (num: string) => {
    if (10 > studentNumber.length) setStudentNumber(s => s + num);
  };

  const handleNumpadClear = () => setStudentNumber('');
  const handleNumpadDel = () => setStudentNumber(s => s.slice(0, -1));

  return (
    <div className="fixed inset-0 z-[9999] bg-[#F0F5F3] font-sans overflow-hidden select-none flex flex-col items-center justify-center p-4 md:p-10">
      <div className="w-full h-full max-w-[1400px] mx-auto relative flex items-center justify-center">
        <AnimatePresence mode="wait">

          {view === 'rest' && (
            <motion.div
              key="rest"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer"
              onClick={() => setView('input')}
            >
              <div className="absolute inset-0 bg-primary/5" />

              <motion.div
                animate={{ y: [0, -20, 0] }}
                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                className="z-10 flex flex-col items-center text-center p-6"
              >
                <div className="h-40 w-40 md:h-52 md:w-52 bg-white rounded-full p-6 shadow-2xl mb-12 flex items-center justify-center border-4 border-white">
                  <img
                    src="https://i.postimg.cc/RVPTkLJN/frontepagelogo-5282001fe8581541590a.png"
                    alt="Ibn Amer Logo"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLogoClick();
                    }}
                    className="h-full w-full object-contain cursor-pointer active:scale-95 transition-transform"
                  />
                </div>

                <h1 className="text-6xl md:text-8xl font-display text-primary tracking-tight mb-4">Træk Nummer</h1>

                <div className="mt-20 px-10 py-5 rounded-full bg-primary text-white shadow-2xl animate-pulse flex items-center gap-4">
                  <span className="text-xl md:text-2xl font-bold uppercase tracking-widest">Tryk skærmen for at starte</span>
                </div>
              </motion.div>
            </motion.div>
          )}

          {view === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="absolute inset-0 flex flex-col items-center justify-center p-6"
            >
              <div className="max-w-2xl w-full">
                <div className="text-center mb-10">
                  <h2 className="text-4xl md:text-6xl font-display text-primary mb-2">Dit Elevnummer</h2>
                  <p className="text-xl text-primary/60 font-medium">Indtast dit elevnummer for at fortsætte</p>
                </div>

                <div className="bg-white rounded-[40px] md:rounded-[60px] p-8 md:p-12 shadow-2xl border border-white">
                  <div className="h-24 md:h-32 w-full bg-[#F0F5F3] rounded-3xl mb-8 flex items-center justify-center text-5xl md:text-7xl font-display text-primary tracking-widest border-2 border-transparent focus-within:border-accent">
                    {studentNumber || <span className="text-gray-300">____</span>}
                  </div>

                  {errorMsg && <p className="text-center text-red-500 text-xl font-bold mb-6">{errorMsg}</p>}

                  <div className="grid grid-cols-3 gap-4 md:gap-6 mb-10">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, 'DEL'].map((btn) => (
                      <button
                        key={btn}
                        onClick={() => {
                          if (btn === 'C') handleNumpadClear();
                          else if (btn === 'DEL') handleNumpadDel();
                          else handleNumberPad(btn.toString());
                        }}
                        className="h-20 md:h-28 bg-gray-50 rounded-2xl md:rounded-[32px] active:bg-gray-200 active:scale-95 transition-all text-3xl md:text-5xl font-display text-primary"
                      >
                        {btn}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-4 md:gap-6">
                    <Button onClick={() => { setView('rest'); setStudentNumber(''); setStudent(null); setErrorMsg(''); }} variant="secondary" className="flex-1 h-20 rounded-[24px] text-xl font-bold">Annuller</Button>
                    <Button
                      onClick={handleLookupStudent}
                      disabled={!studentNumber || loading}
                      className="flex-1 h-20 rounded-[24px] bg-primary hover:bg-[#00332B] text-white text-xl font-bold"
                    >
                      {loading ? <Loader2 className="animate-spin h-8 w-8" /> : 'Næste'}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'teachers' && (
            <motion.div
              key="teachers"
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className="absolute inset-0 p-4 md:p-10 flex flex-col"
            >
              <div className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-6">
                  <img
                    src="https://i.postimg.cc/RVPTkLJN/frontepagelogo-5282001fe8581541590a.png"
                    alt="Logo"
                    onClick={handleLogoClick}
                    className="h-16 w-16 md:h-24 md:w-24 bg-white rounded-full p-2 md:p-4 cursor-pointer active:scale-90 transition-transform shadow-xl"
                  />
                  <div>
                    <h2 className="text-4xl md:text-6xl font-display text-primary">Kø System</h2>
                    <p className="text-lg md:text-2xl font-bold uppercase tracking-widest text-accent mt-2">Elev: {student?.displayName || 'Ukendt'}</p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    setView('rest');
                    setStudentNumber('');
                    setStudent(null);
                    setErrorMsg('');
                  }}
                  variant="outline"
                  className="h-16 md:h-20 px-8 rounded-2xl md:rounded-3xl text-xl md:text-2xl font-bold"
                >
                  Afbryd
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10 overflow-y-auto pb-20 scrollbar-hide">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleJoinQueue(null)}
                  className="lg:col-span-2 bg-primary rounded-[40px] md:rounded-[60px] p-8 md:p-12 shadow-2xl cursor-pointer flex items-center gap-8 md:gap-10 relative overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-white/5 opacity-10 group-hover:opacity-20 transition-opacity" />
                  <div className="h-24 w-24 md:h-32 md:w-32 bg-accent rounded-[32px] md:rounded-[48px] flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform">
                    <Sparkles className="h-12 w-12 md:h-16 md:w-16 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-3xl md:text-6xl font-display text-white">Hurtig Tilmelding</h3>
                    <p className="text-xl md:text-2xl font-bold uppercase tracking-widest text-white/50 mt-2">Find den første ledige lærer</p>
                  </div>
                  <div className="h-20 w-20 rounded-full bg-white/10 flex items-center justify-center">
                    <ChevronRight className="h-10 w-10 text-white" />
                  </div>
                </motion.div>
                {teachers.filter(t => t.gender === student?.gender).length === 0 ? (
                  <div className="col-span-full text-center py-20 bg-white rounded-[40px] shadow-sm">
                    <p className="text-3xl text-primary/50 font-bold">Ingen lærere er fysisk tilgængelige lige nu.</p>
                  </div>
                ) : (
                  teachers.filter(t => t.gender === student?.gender).map(t => (
                    <motion.div
                      key={t.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleJoinQueue(t)}
                      className="bg-white rounded-[40px] md:rounded-[60px] p-8 md:p-12 shadow-xl cursor-pointer flex items-center gap-8 md:gap-10"
                    >
                      <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-white shadow-lg">
                        <AvatarImage src={t.photoURL} className="object-cover" />
                        <AvatarFallback className="bg-primary/10 text-4xl text-primary">{getInitials(t.displayName)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="text-3xl md:text-5xl font-display text-primary">{t.displayName}</h3>
                        <span className="px-4 py-2 rounded-xl bg-accent/10 text-[14px] font-black uppercase tracking-widest text-accent">Lokale {t.room}</span>
                      </div>
                      <ChevronRight className="h-12 w-12 text-gray-200" />
                    </motion.div>
                  ))
                )}
              </div>
              {loading && (
                <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-50">
                  <Loader2 className="h-20 w-20 text-primary animate-spin" />
                </div>
              )}
            </motion.div>
          )}

          {view === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-primary"
            >
              <div className="text-center text-white space-y-8 p-10">
                <div className="text-[16px] md:text-[20px] font-black uppercase tracking-[0.6em] text-accent mb-12">Du Er Tilmeldt Køen</div>
                <div className="text-[12rem] md:text-[20rem] font-display font-light leading-none mb-8">A{successInfo?.ticketNumber} - <span className="opacity-40">(#{successInfo?.studentNumber})</span></div>
                {successInfo?.teacherName && <h2 className="text-5xl md:text-7xl font-display mt-8">Lærer {successInfo?.teacherName}</h2>}
                <p className="text-2xl md:text-3xl font-medium opacity-70 mt-8 max-w-2xl mx-auto">Sæt dig og vent på, at dit nummer eller navn bliver kaldt på skærmen.</p>

                <div className="mt-24">
                  <Button onClick={() => setView('rest')} className="h-20 md:h-24 px-16 rounded-full bg-white text-primary text-2xl md:text-3xl font-bold hover:bg-gray-100 shadow-2xl">
                    Færdig
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
