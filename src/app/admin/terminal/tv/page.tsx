'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFirebase } from '@/firebase';
import { collection, query, where, onSnapshot, getDocs, writeBatch, doc } from 'firebase/firestore';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { MapPin, Users, Megaphone, ArrowLeft, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function TerminalTV() {
  const [selectedGender, setSelectedGender] = useState<'man' | 'woman' | null>(null);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [announcement, setAnnouncement] = useState<{
    ticketNumber: string;
    letter: string;
    type: string;
    teacherName: string;
    room: string;
    id: string;
    studentNumber?: string;
  } | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [announcementQueue, setAnnouncementQueue] = useState<any[]>([]);
  const isProcessingQueue = useRef(false);

  const { firestore } = useFirebase();
  const router = useRouter();
  const seenAnnouncementIdsRef = useRef<Set<string>>(new Set());
  const audioContext = useRef<AudioContext | null>(null);
  const isMutedRef = useRef(false);
  const processingRef = useRef(false);
  const isFirstSnapshotRef = useRef(true);
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

  useEffect(() => {
    if (!firestore || !selectedGender) return;

    const q = query(
      collection(firestore, 'teachers'), 
      where('availablePhysical', '==', true),
      where('gender', '==', selectedGender)
    );
    
    const unsubTeachers = onSnapshot(q, (snapshot) => {
      const currentTeachers: any[] = [];
      const newTeachersMap: Record<string, any> = {};

      snapshot.forEach(doc => {
        const data = { id: doc.id, ...doc.data() } as any;
        currentTeachers.push(data);
        newTeachersMap[data.id] = data;

        const calling = data.currentlyCalling;
        
        // Handle new announcements cleanly based on announcementId
        if (calling && calling.announcementId) {
          if (isFirstSnapshotRef.current) {
            // Silently mark existing sessions as seen so they don't trigger when the TV boots
            seenAnnouncementIdsRef.current.add(calling.announcementId);
          } else if (!seenAnnouncementIdsRef.current.has(calling.announcementId)) {
            // Mark as seen and queue the announcement
            seenAnnouncementIdsRef.current.add(calling.announcementId);
            
            triggerAnnouncement(
              calling.ticketNumber?.toString() || '1',
              data.queueLetter || 'A',
              calling.studentType === 'physical' ? 'physical' : 'phone',
              data.displayName || 'Lærer',
              data.room || 'Ukendt',
              calling.announcementId,
              calling.studentNumber
            );
          }
        }
      });

      isFirstSnapshotRef.current = false;
      
      // Sort teachers: ones with currently calling first, then alphabetical
      currentTeachers.sort((a, b) => {
        if (a.currentlyCalling && !b.currentlyCalling) return -1;
        if (!a.currentlyCalling && b.currentlyCalling) return 1;
        return (a.displayName || '').localeCompare(b.displayName || '');
      });
      
      setTeachers(currentTeachers);
    });

    return () => {
      unsubTeachers();
    };
  }, [firestore, selectedGender]);

  const playChime = () => {
    try {
      if (!audioContext.current) audioContext.current = new ((window as any).AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioContext.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();

      const playCrystalNote = (freq: number, start: number, duration: number, volume: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(volume, start + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + duration);
      };

      const now = ctx.currentTime;
      // A harmonious crystal chime sequence
      playCrystalNote(523.25, now, 1.5, 0.1); // C5
      playCrystalNote(659.25, now + 0.15, 1.2, 0.08); // E5
      playCrystalNote(783.99, now + 0.3, 1.0, 0.06); // G5
      playCrystalNote(1046.50, now + 0.45, 0.8, 0.04); // C6
    } catch (e) {}
  };
   const triggerAnnouncement = (ticketNumber: string, letter: string, type: string, teacherName: string, room: string, id: string, studentNumber?: string) => {
    setAnnouncementQueue(prev => [...prev, { ticketNumber, letter, type, teacherName, room, id, studentNumber }]);
  };

  useEffect(() => {
    const processQueue = async () => {
      if (announcementQueue.length > 0 && !announcement && !processingRef.current) {
        processingRef.current = true;
        const next = announcementQueue[0];
        setAnnouncement(next);
        
        // AUDIO LOGIC: Follow the "iPad Always, Phone only if not Muted" rule
        const isPhysicaliPad = next.type === 'physical';
        const isMuteEnabled = isMutedRef.current;
        const shouldPlayAudio = isPhysicaliPad || !isMuteEnabled;

        if (shouldPlayAudio) {
          playChime();
        }

        // Display for 5 seconds
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        setAnnouncement(null);
        setAnnouncementQueue(prev => prev.slice(1));
        processingRef.current = false;
      }
    };
    
    processQueue();
  }, [announcementQueue, announcement]);

  const handleResetQueues = async () => {
    if (!firestore || !confirm('Er du sikker på, at du vil nulstille alle fysiske kø-numre og afslutte alle fysiske sessioner? Virtuelle køer bevares.')) return;
    setIsResetting(true);
    try {
      const qSnap = await getDocs(collection(firestore, 'queues'));
      const batch = writeBatch(firestore);
      
      qSnap.forEach(qDoc => {
        const data = qDoc.data();
        const studentsById = data.studentsById || {};
        
        // Filter out only physical students, keep virtual ones
        const updatedStudents: Record<string, any> = {};
        Object.entries(studentsById).forEach(([id, s]: [string, any]) => {
          if (s.type === 'virtual') {
            updatedStudents[id] = s;
          }
        });
        
        batch.update(qDoc.ref, {
          lastTicketNumber: 0,
          studentsById: updatedStudents
        });
      });
      
      // Update teachers
      const tSnap = await getDocs(collection(firestore, 'teachers'));
      tSnap.forEach(tDoc => {
        const data = tDoc.data();
        const updates: any = {
           availablePhysical: false,
           queueLetter: ''
        };
        
        // If current student was physical, clear it
        if (data.activeSessionType === 'physical' || !data.availableVirtual) {
          updates.currentlyCalling = null;
        }
        
        batch.update(tDoc.ref, updates);
      });
      
      await batch.commit();
      alert('Alle fysiske køer er nulstillet.');
    } catch (e) {
      console.error(e);
      alert('Der opstod en fejl under nulstilling.');
    } finally {
      setIsResetting(false);
    }
  };

  if (!selectedGender) {
    return (
      <div className="fixed inset-0 z-[9999] bg-primary flex flex-col items-center justify-center p-8 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <img 
            src="https://i.postimg.cc/RVPTkLJN/frontepagelogo-5282001fe8581541590a.png" 
            alt="Logo" 
            className="h-32 w-32 bg-white rounded-full p-4 mx-auto mb-8 shadow-2xl"
          />
          <h1 className="text-5xl font-display text-white mb-4">Kø Oversigt</h1>
          <p className="text-accent font-bold uppercase tracking-widest">Vælg afdeling for denne skærm</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedGender('man')}
            className="bg-white rounded-[40px] p-12 text-center shadow-2xl group transition-all"
          >
            <div className="h-24 w-24 bg-primary/5 rounded-3xl mx-auto mb-6 flex items-center justify-center group-hover:bg-primary transition-colors">
              <Users className="h-12 w-12 text-primary group-hover:text-white transition-colors" />
            </div>
            <h2 className="text-3xl font-display text-primary">Mandlig Afdeling</h2>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedGender('woman')}
            className="bg-white rounded-[40px] p-12 text-center shadow-2xl group transition-all"
          >
            <div className="h-24 w-24 bg-accent/5 rounded-3xl mx-auto mb-6 flex items-center justify-center group-hover:bg-accent transition-colors">
              <Users className="h-12 w-12 text-accent group-hover:text-white transition-colors" />
            </div>
            <h2 className="text-3xl font-display text-primary">Kvindelig Afdeling</h2>
          </motion.button>
        </div>

        <div className="mt-16 flex flex-col items-center gap-6">
           <div className="flex flex-wrap items-center justify-center gap-6">
             <Button 
              variant="outline" 
              onClick={() => {
                const newMute = !isMuted;
                setIsMuted(newMute);
                isMutedRef.current = newMute;
              }}
              className={`h-16 px-10 rounded-2xl border-white/20 transition-all text-xl font-bold flex items-center gap-3 ${isMuted ? 'bg-red-500/20 text-red-200 border-red-500/30' : 'bg-white/5 text-white hover:bg-white/10'}`}
             >
               {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
               {isMuted ? 'Telefon Kald Lydløs' : 'Telefon Kald m. Lyd'}
             </Button>

             <Button 
              variant="outline" 
              onClick={handleResetQueues}
              disabled={isResetting}
              className="h-16 px-10 rounded-2xl bg-white/5 border-white/20 text-white hover:bg-white/10 hover:text-white transition-all text-xl font-bold flex items-center gap-3"
             >
               <RotateCcw className={`h-6 w-6 ${isResetting ? 'animate-spin' : ''}`} />
               Nulstil Alle Kø-Numre
             </Button>
           </div>
           
           <p className="text-white/40 text-sm font-medium">Lyd fra iPad (fysisk kø) vil altid kunne høres</p>
        </div>
        
        <Button 
          variant="ghost" 
          onClick={() => router.push('/admin')}
          className="mt-8 text-white/50 hover:text-white flex items-center gap-2"
        >
          <ArrowLeft className="h-5 w-5" /> Tilbage til Admin
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-primary font-sans overflow-hidden flex flex-col p-6 md:p-12">
      {/* Arabic Texture Overlay */}
      <div className="absolute inset-0 opacity-[0.08] pointer-events-none mix-blend-overlay">
        <div className="absolute inset-0 bg-[url('https://i.postimg.cc/xC74tT1V/flat-arabic-pattern-background-79603-1826.avif')] bg-center bg-repeat" />
      </div>

      {/* Header */}
      <div className="flex items-center gap-6 mb-12 bg-white/5 rounded-full py-4 px-10 backdrop-blur-md border border-white/10 relative z-10 w-fit">
         <img 
            src="https://i.postimg.cc/RVPTkLJN/frontepagelogo-5282001fe8581541590a.png" 
            alt="Logo" 
            onClick={handleLogoClick}
            className="h-14 w-14 bg-white rounded-full p-2 object-cover cursor-pointer hover:scale-105 transition-transform" 
         />
         <div>
            <h1 className="text-2xl md:text-3xl font-display text-white tracking-[0.2em] uppercase">
              {selectedGender === 'man' ? 'Mandlig Afdeling' : 'Kvindelig Afdeling'}
            </h1>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-hide relative z-10">
        <div className={`grid gap-6 md:gap-10 ${
          teachers.length <= 4 ? 'grid-cols-1 md:grid-cols-2' : 
          teachers.length <= 9 ? 'grid-cols-2 lg:grid-cols-3' :
          'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
        }`}>
          {teachers.map(t => (
            <motion.div 
              key={t.id}
              layout
              className="rounded-[40px] bg-[#FDF8F3] shadow-2xl border border-primary/5 overflow-hidden transition-all flex flex-col"
            >
              <div className="p-8 flex-1 flex flex-col">
                <div className="flex flex-col items-center text-center gap-4 mb-8">
                  <Avatar className="h-20 w-20 md:h-28 md:w-28 border-4 border-white shadow-xl">
                    <AvatarImage src={t.photoURL} className="object-cover" />
                    <AvatarFallback className="bg-primary/10 text-3xl text-primary font-display">{getInitials(t.displayName)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-2xl md:text-3xl font-display text-primary leading-tight">
                      {t.displayName}
                    </h3>
                    <div className="mt-2 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[12px] font-black uppercase tracking-widest bg-primary text-white">
                      <MapPin className="h-3 w-3" /> Lokale {t.room}
                    </div>
                  </div>
                </div>

                <div className="p-6 md:p-8 rounded-3xl text-center bg-white/60 border border-primary/5 shadow-inner mt-auto">
                  <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/40 mb-3">Nu Betjenes</p>
                  <p className="text-5xl md:text-7xl font-display text-primary">
                    {(t.currentlyCalling?.ticketNumber || t.lastCalledTicket?.ticketNumber) ? (
                      <>
                        {(t.currentlyCalling?.ticketNumber ? (t.queueLetter || 'A') : (t.lastCalledTicket?.queueLetter || 'A'))}{t.currentlyCalling?.ticketNumber || t.lastCalledTicket?.ticketNumber}
                        <span className="block text-xl md:text-2xl text-accent font-bold mt-2">
                           - (#{t.currentlyCalling?.studentNumber || t.lastCalledTicket?.studentNumber || '----'})
                        </span>
                      </>
                    ) : (
                      '--'
                    )}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {announcement && (
          <motion.div
            key={announcement.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center p-8 md:p-24"
          >
            <div className="absolute inset-0 bg-primary/80 backdrop-blur-2xl" />
            
            <div className="bg-[#FDF8F3] w-full max-w-4xl rounded-[60px] p-12 md:p-20 text-center relative z-10 shadow-[0_0_80px_rgba(0,0,0,0.3)] border border-white/20">
              <div className="flex flex-col items-center space-y-10">
                {/* Visual Icon */}
                <div className="h-24 w-24 bg-primary rounded-[32px] flex items-center justify-center shadow-xl">
                  <Megaphone className="h-10 w-10 text-accent" />
                </div>

                <div className="space-y-4">
                  <p className="text-[14px] font-black uppercase tracking-[0.5em] text-accent">Nummer Kaldt</p>
                  <h2 className="text-[100px] md:text-[180px] font-display text-primary leading-none tracking-tighter">
                    {announcement.letter}{announcement.ticketNumber}
                  </h2>
                  <p className="text-3xl md:text-5xl font-display text-accent">
                    - (#{announcement.studentNumber || '----'})
                  </p>
                </div>

                <div className="h-px w-20 bg-primary/10" />

                <div className="space-y-6">
                  <p className="text-4xl md:text-6xl font-display text-primary">Gå venligst til <span className="text-accent">Lokale {announcement.room}</span></p>
                  <div className="flex items-center justify-center gap-3">
                    <p className="text-xl md:text-2xl font-bold text-primary/40 uppercase tracking-widest">Lærer {announcement.teacherName}</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
