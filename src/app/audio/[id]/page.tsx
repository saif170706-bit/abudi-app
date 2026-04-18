'use client';

import {
  Avatar,
  ParticipantsAudio,
  useCallStateHooks,
  StreamVideoParticipant,
  CallingState,
  useCall,
} from "@stream-io/video-react-sdk";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useFirebase, useUser } from "@/firebase";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useView } from "@/context/ViewContext";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { doc, getDoc, updateDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { cn, getInitials } from "@/lib/utils";
import QueueAssignmentManager from "@/components/teacher/QueueAssignmentManager";
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger, 
  SheetHeader, 
  SheetTitle 
} from "@/components/ui/sheet";
import { 
  ChevronUp, 
  BookOpenText, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Users, 
  Loader2 
} from "lucide-react";

function ParticipantCard({ participant }: { participant: StreamVideoParticipant }) {
  const { isSpeaking } = participant;
  
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div className={cn(
          "h-28 w-28 rounded-full border-4 border-white shadow-2xl transition-all duration-500 overflow-hidden bg-muted flex items-center justify-center",
          isSpeaking ? "scale-110 ring-4 ring-primary/30" : "scale-100"
        )}>
          {participant.image ? (
            <img 
              src={participant.image} 
              alt={participant.name} 
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-2xl font-bold text-foreground opacity-40">
              {getInitials(participant.name)}
            </span>
          )}
          
          {isSpeaking && (
            <div className="absolute inset-0 -z-10 animate-ping rounded-full bg-primary/20" />
          )}
        </div>
        
        {isSpeaking && (
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter shadow-md z-10">
            Taler
          </div>
        )}
      </div>
      <div className="text-center">
        <p className="text-lg font-bold text-foreground truncate max-w-[140px]">
          {participant.name}
        </p>
      </div>
    </div>
  );
}

export default function AudioCallPage() {
  const router = useRouter();
  const params = useParams();
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { profile } = useUserProfile();
  const { servingStudent, setServingStudent } = useView();
  const call = useCall();
  const { useParticipants, useMicrophoneState, useCallCallingState } = useCallStateHooks();
  const participants = useParticipants();
  const { microphone, isMute } = useMicrophoneState();
  const callingState = useCallCallingState();
  const [isLeaving, setIsLeaving] = useState(false);
  const [showAssignment, setShowAssignment] = useState(false);

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
        // Force turn off microphone before navigating
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
      console.error("Error leaving call:", e);
    } finally {
      router.replace('/');
    }
  };

  const toggleMic = async () => {
    if (isMute) {
      await microphone.enable();
    } else {
      await microphone.disable();
    }
  };

  const uniqueParticipants = useMemo(() => {
    return Array.from(
      participants.reduce((acc, p) => {
        acc.set(p.userId, p);
        return acc;
      }, new Map<string, StreamVideoParticipant>()).values()
    );
  }, [participants]);

  const student = useMemo(() => {
    if (profile?.role !== 'teacher') return null;
    return uniqueParticipants.find(p => p.userId !== user?.uid) || null;
  }, [uniqueParticipants, profile?.role, user?.uid]);

  // If we have explicitly triggered a leave, show the "Leaving" UI.
  // We no longer check callingState === LEFT here because on initial mount
  // it can briefly be LEFT before JOINING, causing a splash screen flash.
  if (isLeaving) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground mt-4 text-base font-medium">Afslutter opkald...</p>
        </div>
      </div>
    );
  }

  if (callingState !== CallingState.JOINED) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground mt-4 text-base font-medium">Forbinder til lydrum...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-[100dvh] w-full flex-col bg-background overflow-hidden">
      <div className="absolute inset-0 opacity-[0.12] dark:opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'url("https://i.postimg.cc/xC74tT1V/flat-arabic-pattern-background-79603-1826.avif")', backgroundSize: '400px' }} />

      <ParticipantsAudio participants={participants} />

      <div className="z-10 px-6 pt-16 pb-8 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-headline">
          Lydopkald
        </h1>
        <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-card/80 border border-border shadow-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span className="text-sm font-bold">{uniqueParticipants.length} {uniqueParticipants.length === 1 ? 'deltager' : 'deltagere'}</span>
        </div>
      </div>

      <div className="z-10 flex-1 px-6 overflow-y-auto flex items-center justify-center">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-10 gap-y-14 max-w-2xl w-full py-10">
          {uniqueParticipants.map((p) => (
            <ParticipantCard key={p.sessionId} participant={p} />
          ))}
        </div>
      </div>

      <div className="z-20 px-6 pb-[max(2.5rem,env(safe-area-inset-bottom,2.5rem))] flex justify-center">
        <div className="flex items-center gap-6 p-5 rounded-[40px] bg-card border border-border shadow-[0_25px_60px_rgba(0,0,0,0.12)]">
          {profile?.role === 'teacher' && servingStudent && (
            <Sheet open={showAssignment} onOpenChange={setShowAssignment}>
              <SheetTrigger asChild>
                <button
                  className={cn(
                    "grid h-16 w-16 place-items-center rounded-3xl transition-all active:scale-95 shadow-sm",
                    showAssignment ? "bg-[#DEA93E] text-white" : "bg-muted text-foreground"
                  )}
                >
                  <BookOpenText className="h-7 w-7" />
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
                        setShowAssignment(false);
                        setServingStudent(null);
                      }}
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
              "grid h-16 w-16 place-items-center rounded-3xl transition-all active:scale-95 shadow-sm",
              isMute ? "bg-red-50 text-red-500" : "bg-muted text-foreground"
            )}
          >
            {isMute ? <MicOff className="h-7 w-7" /> : <Mic className="h-7 w-7" />}
          </button>

          <button
            onClick={handleLeave}
            className="grid h-16 w-16 place-items-center rounded-3xl bg-[#E24B4B] text-white shadow-lg shadow-red-500/20 active:scale-95 transition-all"
          >
            <PhoneOff className="h-7 w-7" />
          </button>
        </div>
      </div>
    </div>
  );
}
