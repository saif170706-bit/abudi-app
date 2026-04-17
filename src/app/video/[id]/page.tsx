'use client';

import {
  CallControls,
  CallingState,
  SpeakerLayout,
  useCallStateHooks,
  useCall,
  StreamTheme,
} from "@stream-io/video-react-sdk";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { Loader2, Users, BookOpenText, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFirebase, useUser } from "@/firebase";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useView } from "@/context/ViewContext";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import QueueAssignmentManager from "@/components/teacher/QueueAssignmentManager";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";

export default function VideoCallPage() {
  const router = useRouter();
  const params = useParams();
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { profile } = useUserProfile();
  const { setServingStudent } = useView();
  const call = useCall();
  const { useCallCallingState, useParticipants } = useCallStateHooks();
  const callingState = useCallCallingState();
  const participants = useParticipants();
  const [isLeaving, setIsLeaving] = useState(false);
  const [showAssignment, setShowAssignment] = useState(false);

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
      router.replace('/');
    }
  };

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
          <p className="text-muted-foreground mt-4 text-base font-medium">Forbinder til videorum...</p>
        </div>
      </div>
    );
  }

  return (
    <StreamTheme className="h-[100dvh] w-full bg-[#111214]">
      <div className="relative h-full w-full flex flex-col overflow-hidden">
        {/* Header Overlay */}
        <div className="absolute top-0 left-0 right-0 z-20 p-6 flex justify-between items-start pointer-events-none">
          <div className="bg-black/40 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl pointer-events-auto">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-white/70" />
              <span className="text-white text-sm font-bold">
                {participants.length} {participants.length === 1 ? 'deltager' : 'deltagere'}
              </span>
            </div>
          </div>
        </div>

        {/* Video Content */}
        <div className="flex-1 relative bg-black">
          <SpeakerLayout participantsBarPosition='bottom' />
        </div>

        {/* Controls Overlay */}
        <div className="absolute bottom-8 left-0 right-0 z-20 px-6 flex justify-center pointer-events-none">
          <div className="bg-card/10 backdrop-blur-xl border border-white/10 p-4 rounded-[40px] shadow-2xl pointer-events-auto flex items-center gap-4">
            {profile?.role === 'teacher' && (
              <Sheet open={showAssignment} onOpenChange={setShowAssignment}>
                <SheetTrigger asChild>
                  <button
                    className={cn(
                      "grid h-12 w-12 place-items-center rounded-2xl transition-all active:scale-95 shadow-sm bg-white/10 text-white hover:bg-white/20",
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
            <CallControls onLeave={handleLeave} />
          </div>
        </div>

        {/* Subtle Background Pattern (only visible in empty spaces) */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" 
             style={{ 
               backgroundImage: 'url("https://i.postimg.cc/xC74tT1V/flat-arabic-pattern-background-79603-1826.avif")', 
               backgroundSize: '400px' 
             }} 
        />
      </div>
    </StreamTheme>
  );
}
