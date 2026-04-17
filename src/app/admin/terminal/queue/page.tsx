'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFirebase } from '@/firebase';
import { collection, query, where, getDocs, doc, onSnapshot, serverTimestamp, runTransaction } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { ChevronRight, Users, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function TerminalQueue() {
  const [view, setView] = useState<'rest' | 'input' | 'teachers' | 'success'>('rest');
  const [studentNumber, setStudentNumber] = useState('');
  const [student, setStudent] = useState<any>(null);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [queueData, setQueueData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successInfo, setSuccessInfo] = useState<{ position: number; teacherName: string; letter: string } | null>(null);

  const { firestore } = useFirebase();
  const router = useRouter();

  // Reset timeout
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const logoClickCount = useRef(0);
  const logoClickTimeout = useRef<NodeJS.Timeout | null>(null);

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

    // Listen for queues to get count
    const unsubQueues = onSnapshot(collection(firestore, 'queues'), (queues) => {
      const qd: Record<string, number> = {};
      for (const qDoc of queues.docs) {
        const data = qDoc.data() as any;
        const sById = data.studentsById || {};
        qd[data.teacherId] = Object.keys(sById).length;
      }
      setQueueData(qd);
    });

    return () => {
      unsub1();
      unsubQueues();
    };
  }, [firestore]);

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
   const handleJoinQueue = async (teacher: any) => {
    if (!student || !firestore) return;
    setLoading(true);
    try {
      const queueDocRef = doc(firestore, 'queues', teacher.id);
      
      const ticketNumber = await runTransaction(firestore, async (transaction) => {
        const queueSnap = await transaction.get(queueDocRef);
        let nextTicket = 1;
        
        if (queueSnap.exists()) {
          nextTicket = (queueSnap.data().lastTicketNumber || 0) + 1;
        }
        
        const updateData = {
          teacherId: teacher.id,
          lastTicketNumber: nextTicket,
          [`studentsById.${student.id}`]: {
            name: student.displayName || 'Ukendt',
            type: 'physical',
            source: 'ipad',
            joinedAt: serverTimestamp(),
            photoURL: student.photoURL || null,
            ticketNumber: nextTicket,
            studentNumber: student.studentNumber || null
          }
        };

        if (queueSnap.exists()) {
          transaction.update(queueDocRef, updateData as any);
        } else {
          transaction.set(queueDocRef, updateData, { merge: true });
        }
        
        return nextTicket;
      });

      setSuccessInfo({ 
        position: ticketNumber, 
        teacherName: teacher.displayName || 'Lærer', 
        letter: teacher.queueLetter || 'A' 
      });
      setView('success');

      setTimeout(() => {
        setView('rest');
        setStudentNumber('');
        setStudent(null);
      }, 7000);

    } catch (e) {
      console.error("Queue join error:", e);
      setErrorMsg('Kunne ikke tilføje til køen.');
    } finally {
      setLoading(false);
    }
  };

  const handleNumberPad = (num: string) => {
    if (studentNumber.length < 10) setStudentNumber(s => s + num);
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
              <div className="absolute inset-0 bg-[#004D40]/5" />
              
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

                <h1 className="text-6xl md:text-8xl font-display text-[#004D40] tracking-tight mb-4">Træk Nummer</h1>
                
                <div className="mt-20 px-10 py-5 rounded-full bg-[#004D40] text-white shadow-2xl animate-pulse flex items-center gap-4">
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
                   <h2 className="text-4xl md:text-6xl font-display text-[#004D40] mb-2">Dit Elevnummer</h2>
                   <p className="text-xl text-[#004D40]/60 font-medium">Indtast dit elevnummer for at fortsætte</p>
                 </div>

                 <div className="bg-white rounded-[40px] md:rounded-[60px] p-8 md:p-12 shadow-2xl border border-white">
                   <div className="h-24 md:h-32 w-full bg-[#F0F5F3] rounded-3xl mb-8 flex items-center justify-center text-5xl md:text-7xl font-display text-[#004D40] tracking-widest border-2 border-transparent focus-within:border-[#DEA93E]">
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
                         className="h-20 md:h-28 bg-gray-50 rounded-2xl md:rounded-[32px] active:bg-gray-200 active:scale-95 transition-all text-3xl md:text-5xl font-display text-[#004D40]"
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
                       className="flex-1 h-20 rounded-[24px] bg-[#004D40] hover:bg-[#00332B] text-white text-xl font-bold"
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
                    <h2 className="text-4xl md:text-6xl font-display text-[#004D40]">Vælg Lærer</h2>
                    <p className="text-lg md:text-2xl font-bold uppercase tracking-widest text-[#DEA93E] mt-2">Elev: {student?.displayName || 'Ukendt'}</p>
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
                {teachers.filter(t => t.gender === student?.gender).length === 0 ? (
                  <div className="col-span-full text-center py-20 bg-white rounded-[40px] shadow-sm">
                    <p className="text-3xl text-[#004D40]/50 font-bold">Ingen lærere er fysisk tilgængelige lige nu.</p>
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
                        <AvatarFallback className="bg-[#004D40]/10 text-4xl text-[#004D40]">{getInitials(t.displayName)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="text-3xl md:text-5xl font-display text-[#004D40]">{t.displayName}</h3>
                        <div className="mt-4 flex flex-wrap items-center gap-6">
                          <span className="px-4 py-2 rounded-xl bg-[#DEA93E]/10 text-[14px] font-black uppercase tracking-widest text-[#DEA93E]">Lokale {t.room}</span>
                          <div className="flex items-center gap-3 text-xl md:text-2xl font-bold text-[#004D40]/30">
                            <Users className="h-6 w-6 md:h-8 md:w-8" /> {queueData[t.id] || 0} i kø
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="h-12 w-12 text-gray-200" />
                    </motion.div>
                  ))
                )}
              </div>
              {loading && (
                 <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <Loader2 className="h-20 w-20 text-[#004D40] animate-spin" />
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
              className="absolute inset-0 flex flex-col items-center justify-center bg-[#004D40]"
            >
              <div className="text-center text-white space-y-8 p-10">
                <div className="text-[16px] md:text-[20px] font-black uppercase tracking-[0.6em] text-[#DEA93E] mb-12">Du Er Tilmeldt Køen</div>
                <div className="text-[12rem] md:text-[20rem] font-display font-light leading-none mb-8">{successInfo?.letter}{successInfo?.position}</div>
                <h2 className="text-5xl md:text-7xl font-display mt-8">Lærer {successInfo?.teacherName}</h2>
                <p className="text-2xl md:text-3xl font-medium opacity-70 mt-8 max-w-2xl mx-auto">Sæt dig og vent på, at dit nummer eller navn bliver kaldt på skærmen.</p>
                
                <div className="mt-24">
                  <Button onClick={() => setView('rest')} className="h-20 md:h-24 px-16 rounded-full bg-white text-[#004D40] text-2xl md:text-3xl font-bold hover:bg-gray-100 shadow-2xl">
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
