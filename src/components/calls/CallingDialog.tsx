'use client';

import { useEffect, useRef } from 'react';
import { useFirebase } from '@/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Phone, PhoneOff, Video as VideoIcon } from 'lucide-react';

interface CallingDialogProps {
  isOpen: boolean;
  callId: string;
  type: 'video' | 'audio' | null;
  onCancel: (reason: 'cancelled' | 'timeout') => void;
  onConnected: () => void;
}

export default function CallingDialog({
  isOpen,
  callId,
  type,
  onCancel,
  onConnected,
}: CallingDialogProps) {
  const { firestore } = useFirebase();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Outgoing call ringtone
      const audio = new Audio('https://firebasestorage.googleapis.com/v0/b/studio-3085722089-f47ec.firebasestorage.app/o/Audio%20files%2Fgautawa-old-phone-ring-272648.mp3?alt=media&token=73d5402d-3615-4bcd-bf89-1e16279b23cb');
      audio.loop = true;
      audioRef.current = audio;
      audio.play().catch(e => console.log("Audio play blocked", e));
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = ""; // Aggressive cleanup to remove from OS media controls
        audioRef.current.load();   // Force release resources
        audioRef.current = null;
      }
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current.load();
        audioRef.current = null;
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !firestore || !callId) return;

    const callDocRef = doc(firestore, 'activeCalls', callId);

    const unsubscribe = onSnapshot(
      callDocRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (Array.isArray(data?.members) && data.members.length > 1) {
            onConnected();
          }
        }
      },
      async (err) => {
        // Only emit if not a simple cleanup error
        if (isOpen) {
          const permissionError = new FirestorePermissionError({
            path: callDocRef.path,
            operation: 'get',
          });
          errorEmitter.emit('permission-error', permissionError);
        }
      }
    );

    const timeoutId = setTimeout(() => onCancel('timeout'), 30000);

    return () => {
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [isOpen, callId, firestore, onCancel, onConnected]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel('cancelled')}>
      <DialogContent hideCloseButton={true} className="max-w-sm rounded-[40px] p-8">
        <div className="flex flex-col items-center text-center space-y-8">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-extrabold font-headline text-foreground">
              {type === 'video' ? 'Videoopkald...' : 'Ringer op...'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm font-medium">Venter på svar</DialogDescription>
          </DialogHeader>
          
          <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-primary/5">
            <div className="absolute inset-0 scale-100 animate-pulse rounded-full bg-primary/10" />
            <div className="absolute inset-4 scale-100 animate-pulse delay-75 rounded-full bg-primary/15" />
            <div className="grid h-20 w-20 place-items-center rounded-full bg-primary text-white shadow-xl shadow-primary/20">
              {type === 'video' ? <VideoIcon className="h-10 w-10" /> : <Phone className="h-10 w-10" />}
            </div>
          </div>

          <div className="flex flex-col gap-4 w-full">
            <button 
              onClick={() => onCancel('cancelled')}
              className="flex items-center justify-center gap-2 w-full py-4 rounded-3xl bg-[#E24B4B] text-white font-bold shadow-lg shadow-red-500/20 active:scale-[0.95] transition-all"
            >
              <PhoneOff className="h-5 w-5" />
              Afbryd
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
