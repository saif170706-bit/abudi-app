'use client';

import {
  CallControls,
  CallingState,
  ParticipantView,
  useCallStateHooks,
  useCall,
  StreamTheme,
} from "@stream-io/video-react-sdk";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { Loader2, Users, BookOpenText, ChevronUp, Mic, MicOff, Video as VideoIcon, VideoOff, PhoneOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFirebase, useUser } from "@/firebase";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useView } from "@/context/ViewContext";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { doc, getDoc, updateDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import QueueAssignmentManager from "@/components/teacher/QueueAssignmentManager";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { motion, AnimatePresence } from "framer-motion";
import TeacherQuranPanel from "@/components/teacher/TeacherQuranPanel";
import { QuranDataProvider } from "@/context/QuranDataContext";

export default function VideoCallPage() {
  const router = useRouter();
  const params = useParams();
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { profile } = useUserProfile();
  const { servingStudent, setServingStudent } = useView();
  const call = useCall();
  const { useCallCallingState, useParticipants, useMicrophoneState, useCameraState } = useCallStateHooks();
  const callingState = useCallCallingState();
  const participants = useParticipants();
  const { microphone, isMute: isMicMuted } = useMicrophoneState();
  const { camera, isMute: isCamMuted } = useCameraState();
  const [isLeaving, setIsLeaving] = useState(false);
  const [showAssignment, setShowAssignment] = useState(false);
  const [quranPanelMode, setQuranPanelMode] = useState<'hifz' | 'murajara' | null>(null);
  const [externalResult, setExternalResult] = useState<any | null>(null);
  const [currentStudentAssignment, setCurrentStudentAssignment] = useState<any | null>(null);

  useEffect(() => {
    if (!firestore || !params.id) return;
    const callDocRef = doc(firestore, 'activeCalls', params.id as string);
    const unsubscribe = onSnapshot(callDocRef, snap => {
      // If the active call document is intentionally deleted (e.g., by the host leaving a 1-on-1), kick everyone else out
      if (!snap.exists()) {
        router.replace('/');
      }
    });
    return () => unsubscribe();
  }, [firestore, params.id, router]);

  // Keep screen awake during active calls
  useWakeLock(!isLeaving);

  const student = useMemo(() => {
    if (profile?.role !== 'teacher') return null;
    return participants.find(p => p.userId !== user?.uid) || null;
  }, [participants, profile?.role, user?.uid]);

  const handleLeave = async () => {
    if (isLeaving) return;
    setIsLeaving(true);

    try {
      // Cleanup Firestore active call entry if possible
      if (firestore && user?.uid && params.id) {
        const callDocRef = doc(firestore, 'activeCalls', params.id as string);
        
        if (participants.length <= 2) {
          // If we are hard-ending the call, destroy the session from Firestore so ChatView stops pulsing immediately
          await deleteDoc(callDocRef).catch(() => {});
        } else {
          // If it's a larger group call, gently remove ourselves
          const callSnap = await getDoc(callDocRef).catch(() => null);
          if (callSnap && callSnap.exists()) {
            const currentMembers = callSnap.data().members || [];
            const updatedMembers = currentMembers.filter((m: string) => m !== user.uid);
            
            if (updatedMembers.length === 0) {
              await deleteDoc(callDocRef).catch(() => {});
            } else {
              await updateDoc(callDocRef, { 
                members: updatedMembers 
              }).catch(() => {});
            }
          }
        }
      }

      if (call) {
        // Ensure camera and mic are off before navigating
        await call.camera.disable().catch(() => {});
        await call.microphone.disable().catch(() => {});
        
        // ONLY call leave if we haven't already left/exiting
        const currentState = call.state.callingState;
        if (
          currentState !== CallingState.LEFT && 
          currentState !== CallingState.EXITING &&
          currentState !== CallingState.IDLE
        ) {
          await call.leave();
        }
      }
    } catch (e) {
      console.error("Error leaving video call:", e);
    } finally {
      setShowAssignment(false);
      setServingStudent(null);
      router.replace('/');
    }
  };

  const toggleMic = async () => {
    try {
      if (isMicMuted) await call?.microphone.enable();
      else await call?.microphone.disable();
    } catch (err) { console.error(err); }
  };

  const toggleCam = async () => {
    try {
      if (isCamMuted) await call?.camera.enable();
      else await call?.camera.disable();
    } catch (err) { console.error(err); }
  };

  const student = useMemo(() => {
    if (profile?.role !== 'teacher') return null;
    return participants.find(p => p.userId !== user?.uid) || null;
  }, [participants, profile?.role, user?.uid]);

  // If we have explicitly triggered a leave, show the "Leaving" UI.
  // We no longer check callingState === LEFT here because on initial mount
  // it can briefly be LEFT before JOINING, causing a splash screen flash.
  if (isLeaving) {
    return (
      <div className="h-[100dvh] w-full bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-sm font-medium mt-4 text-muted-foreground">Afslutter opkald...</p>
        </div>
      </div>
    );
  }

  if (callingState !== CallingState.JOINED) {
    return (
      <div className="h-[100dvh] w-full bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-sm font-medium mt-4 text-muted-foreground">Forbinder til videorum...</p>
        </div>
      </div>
    );
  }

  return (
    <QuranDataProvider>
      <StreamTheme>
        <div className="relative h-screen w-screen bg-background overflow-hidden flex flex-col md:flex-row">
          {/* Main Video Grid */}
          <div className="flex-grow relative z-10 flex flex-col p-6 pb-28 md:pb-6">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-2xl bg-white/80 backdrop-blur-md flex items-center justify-center shadow-md">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold font-headline text-foreground">Videoopkald</h1>
                  <p className="text-[10px] font-black uppercase tracking-widest text-primary/40 -mt-0.5">
                    {callingState === CallingState.CONNECTED ? 'Forbundet' : 'Forbinder...'}
                  </p>
                </div>
              </div>
            </div>

            {/* Video Streams */}
            <div className="flex-grow flex items-center justify-center min-h-0">
              <div className={cn(
                "grid gap-4 w-full h-full max-h-[60vh] md:max-h-full",
                participants.length > 1 ? "grid-cols-2" : "grid-cols-1"
              )}>
                {participants.map(p => (
                  <div 
                    key={p.sessionId} 
                    className={cn(
                      "relative rounded-[32px] overflow-hidden border-2 bg-muted/30 shadow-xl transition-all duration-300",
                      p.isSpeaking ? "border-primary shadow-primary/20" : "border-border/40"
                    )}
                  >
                      <ParticipantView
                        participant={p}
                        className="w-full h-full max-h-full"
                      />
                  </div>
                ))}
              </div>
            </div>

            {/* Controls Overlay */}
            <div className="absolute bottom-8 left-0 right-0 z-20 px-6 flex justify-center pointer-events-none">
              <div className="bg-card border border-border p-4 rounded-[40px] shadow-2xl pointer-events-auto flex items-center gap-4">
                {profile?.role === 'teacher' && servingStudent && (
                  <Sheet open={showAssignment} onOpenChange={setShowAssignment}>
                    <SheetTrigger asChild>
                      <button
                        className={cn(
                          "grid h-12 w-12 place-items-center rounded-2xl transition-all active:scale-95 shadow-sm bg-muted text-foreground hover:bg-muted/80",
                          showAssignment && "bg-[#DEA93E] text-white"
                        )}
                      >
                        <BookOpenText className="h-6 w-6" />
                      </button>
                    </SheetTrigger>
                    <SheetContent side="bottom" className="h-[90vh] rounded-t-[48px] border-none bg-background p-0 overflow-hidden">
                      <SheetHeader className="p-8 pb-0">
                        <SheetTitle className="text-3xl font-display text-[#004D40] flex items-center gap-3">
                          <BookOpenText className="h-8 w-8 text-[#DEA93E]" />
                          Lektie & Bedømmelse
                        </SheetTitle>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[#004D40]/30 -mt-1 ml-11">
                          {student ? `Elev: ${student.name}` : 'Ingen elev fundet'}
                        </p>
                      </SheetHeader>
                      <div className="h-full overflow-y-auto px-8 pt-8 pb-20">
                        {student ? (
                          <QueueAssignmentManager 
                            studentId={student.userId} 
                            studentName={student.name}
                            onCycleComplete={() => {
                              setQuranPanelMode(null);
                              setShowAssignment(false);
                              setServingStudent(null);
                            }}
                            onOpenQuran={(mode) => setQuranPanelMode(mode)}
                            externalResult={externalResult}
                            onExternalResultConsumed={() => setExternalResult(null)}
                            onAssignmentLoaded={(a) => setCurrentStudentAssignment(a)}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <p>Venter på at eleven deltager i opkaldet...</p>
                          </div>
                        )}
                      </div>
                    </SheetContent>
                  </Sheet>
                )}
                <button
                  onClick={toggleMic}
                  className={cn(
                    "grid h-12 w-12 place-items-center rounded-2xl transition-all active:scale-95 shadow-sm",
                    isMicMuted ? "bg-red-50 text-red-500" : "bg-muted text-foreground hover:bg-muted/80"
                  )}
                >
                  {isMicMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                </button>

                <button
                  onClick={toggleCam}
                  className={cn(
                    "grid h-12 w-12 place-items-center rounded-2xl transition-all active:scale-95 shadow-sm",
                    isCamMuted ? "bg-red-50 text-red-500" : "bg-muted text-foreground hover:bg-muted/80"
                  )}
                >
                  {isCamMuted ? <VideoOff className="h-6 w-6" /> : <VideoIcon className="h-6 w-6" />}
                </button>

                <button
                  onClick={handleLeave}
                  className="grid h-12 w-16 place-items-center rounded-2xl bg-[#E24B4B] text-white shadow-lg shadow-red-500/20 active:scale-95 transition-all ml-2"
                >
                  <PhoneOff className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Subtle Background Pattern (only visible in empty spaces) */}
            <div className="absolute inset-0 opacity-[0.12] dark:opacity-[0.05] pointer-events-none z-0" 
                 style={{ 
                   backgroundImage: 'url("https://i.postimg.cc/xC74tT1V/flat-arabic-pattern-background-79603-1826.avif")', 
                   backgroundSize: '400px' 
                 }} 
            />

            {/* Quran Panel overlay — same React tree so virtual call audio stays alive */}
            <AnimatePresence>
              {quranPanelMode && (
                <motion.div
                  key="teacher-quran-panel"
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', stiffness: 350, damping: 35 }}
                  className="fixed inset-0 z-[9999] pointer-events-auto"
                >
                  <TeacherQuranPanel
                    assignment={currentStudentAssignment}
                    initialMode={quranPanelMode}
                    onBack={() => setQuranPanelMode(null)}
                    onComplete={(result) => {
                      setExternalResult(result);
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </StreamTheme>
    </QuranDataProvider>
  );
}
