'use client';

import { useEffect, useState } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { doc, onSnapshot, deleteDoc, setDoc, arrayUnion } from 'firebase/firestore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Phone, PhoneOff, Video, VideoOff, Mic } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface IncomingCallInfo {
    callId: string;
    from: string;
    fromName: string;
    type: 'video' | 'audio';
    fromPhoto?: string;
}

export default function IncomingCallListener() {
  const router = useRouter();
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { toast } = useToast();
  const [incomingCall, setIncomingCall] = useState<IncomingCallInfo | null>(null);

  useEffect(() => {
    if (!user || !firestore) {
      if (incomingCall) setIncomingCall(null);
      return;
    };

    const inviteDocRef = doc(firestore, 'callInvites', user.uid);
    const unsubscribe = onSnapshot(inviteDocRef, (snap) => {
        if (snap.exists()) {
            setIncomingCall(snap.data() as IncomingCallInfo);
        } else {
            setIncomingCall(null);
        }
    }, (error) => {
        // Only report if it's not a simple lack of document during cleanup
        if (user) {
          const permissionError = new FirestorePermissionError({
            path: inviteDocRef.path,
            operation: 'get',
          });
          errorEmitter.emit('permission-error', permissionError);
        }
    });

    return () => unsubscribe();
  }, [user, firestore]);

  const clearInviteDoc = async () => {
    if (!user || !firestore) return;
    const inviteDocRef = doc(firestore, 'callInvites', user.uid);
    try {
      await deleteDoc(inviteDocRef);
    } catch (error) {
        // Silent catch for redundant deletes
    }
  };

  const handleAccept = async () => {
    if (!incomingCall || !user || !firestore) return;

    const { callId, type } = incomingCall;
    const callDocRef = doc(firestore, 'activeCalls', callId);

    try {
      // Add self to the active call participants
      await setDoc(callDocRef, { members: arrayUnion(user.uid) }, { merge: true });
      
      // Clean up the invite
      await clearInviteDoc();
      const callType = type || 'video';
      setIncomingCall(null);
      
      // Navigate to the call
      router.push(`/${callType}/${callId}`);
    } catch (error) {
      const permissionError = new FirestorePermissionError({
        path: callDocRef.path,
        operation: 'update',
      });
      errorEmitter.emit('permission-error', permissionError);
    }
  };

  const handleDecline = async () => {
    await clearInviteDoc();
    setIncomingCall(null);
  };

  if (!incomingCall) {
    return null;
  }

  const isVideo = incomingCall.type === 'video';

  return (
    <Dialog open={!!incomingCall} onOpenChange={(isOpen) => !isOpen && handleDecline()}>
      <DialogContent hideCloseButton={true} className="max-w-sm rounded-[48px] p-8 border-none bg-card shadow-[0_30px_80px_rgba(0,0,0,0.2)]">
        <div className="flex flex-col items-center text-center space-y-10">
          {/* Visual Indicator */}
          <div className="relative">
            <div className="absolute inset-0 scale-125 animate-ping rounded-full bg-primary/10" />
            <div className="absolute inset-0 scale-110 animate-ping delay-300 rounded-full bg-primary/15" />
            
            <div className="relative h-32 w-32 rounded-full border-4 border-white shadow-2xl overflow-hidden bg-card">
              {incomingCall.fromPhoto ? (
                <img 
                  key={incomingCall.fromPhoto}
                  src={incomingCall.fromPhoto} 
                  className="h-full w-full object-cover" 
                  alt={incomingCall.fromName} 
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-muted text-4xl font-headline font-bold text-foreground">
                  {getInitials(incomingCall.fromName)}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <DialogTitle className="font-headline text-3xl font-extrabold text-foreground">
              {incomingCall.fromName || 'Nogen'}
            </DialogTitle>
            <DialogDescription className="text-base font-bold text-primary uppercase tracking-[0.15em] animate-pulse">
              {isVideo ? 'Indgående Videoopkald' : 'Indgående Lydopkald'}
            </DialogDescription>
          </div>

          <div className="flex items-center justify-center gap-10 w-full pt-4">
            <div className="flex flex-col items-center gap-3">
              <Button 
                variant="destructive" 
                size="lg" 
                className="rounded-full h-20 w-20 shadow-xl shadow-red-500/20 active:scale-90 transition-transform p-0" 
                onClick={handleDecline}
              >
                {isVideo ? <VideoOff className="h-10 w-10" /> : <PhoneOff className="h-10 w-10" />}
              </Button>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Afvis</span>
            </div>

            <div className="flex flex-col items-center gap-3">
              <Button 
                variant="default" 
                size="lg" 
                className="rounded-full h-20 w-20 bg-[#2E9D63] hover:bg-[#2E9D63]/90 shadow-xl shadow-green-500/20 active:scale-90 transition-transform p-0" 
                onClick={handleAccept}
              >
                {isVideo ? <Video className="h-10 w-10" /> : <Phone className="h-10 w-10" />}
              </Button>
              <span className="text-xs font-bold text-[#2E9D63] uppercase tracking-widest">Besvar</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
