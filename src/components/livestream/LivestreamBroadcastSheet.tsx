'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  useCallStateHooks, 
  ParticipantView, 
  useCall,
  StreamCall,
  StreamTheme
} from '@stream-io/video-react-sdk';
import { Button } from '@/components/ui/button';
import { 
  X, 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Radio, 
  Users, 
  Loader2,
  AlertCircle,
  Save,
  SwitchCamera,
  CheckCircle
} from 'lucide-react';
import { useFirebase, useUser } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, getDownloadURL, getStorage } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useHaptic } from 'use-haptic';
import { sendPostNotifications } from '@/lib/send-post-notifications';
import { useView } from '@/context/ViewContext';

interface Props {
  livestream: any;
  isOpen: boolean;
  onClose: () => void;
}

const BroadcastUI = ({ livestream, onClose }: { livestream: any, onClose: () => void }) => {
  const call = useCall();
  const { user } = useUser();
  const { 
    useCameraState, 
    useMicrophoneState, 
    useParticipantCount, 
    useIsCallLive, 
    useLocalParticipant
  } = useCallStateHooks();

  const { camera, isEnabled: isCamEnabled } = useCameraState();
  const { microphone, isEnabled: isMicEnabled } = useMicrophoneState();
  const participantCount = useParticipantCount();
  const isLive = useIsCallLive();
  const localParticipant = useLocalParticipant();
  const { firestore, firebaseApp } = useFirebase();
  const { toast } = useToast();
  const { triggerHaptic } = useHaptic();
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [showRecordingResult, setShowRecordingResult] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  const deviceOp = useRef<Promise<void>>(Promise.resolve());
  const queueDeviceOp = useCallback((fn: () => Promise<void>) => {
    deviceOp.current = deviceOp.current.then(fn).catch((err) => {
      console.error("Device operation failed:", err);
    });
    return deviceOp.current;
  }, []);

  useEffect(() => {
    if (!firestore || !livestream.id) return;
    const syncStatus = async () => {
      try {
        await updateDoc(doc(firestore, 'livestreams', livestream.id), {
          isActive: isLive
        });
      } catch (e) {}
    };
    syncStatus();
  }, [isLive, firestore, livestream.id]);

  const handleToggleLive = async () => {
    if (!call || !firestore || !user) return;
    setIsUpdating(true);
    triggerHaptic();
    
    try {
      if (isLive) {
        try { await call.stopRecording(); } catch (err) { }
        await updateDoc(doc(firestore, 'livestreams', livestream.id), { isActive: false });
        try { await call.stopLive(); } catch (err) { }
        setShowRecordingResult(true);
      } else {
        // Detect orientation: Portrait phones should record in 9:16
        const isPortrait = window.innerHeight > window.innerWidth;
        const idToken = await user.getIdToken();
        
        // Use our server-side API to set resolution and enable Firebase Storage
        await fetch('/api/stream/update-call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({
            callId: livestream.callId,
            callType: 'livestream',
            quality: isPortrait ? 'portrait-1080x1920' : '1080p'
          })
        });

        await call.goLive();
        await new Promise(r => setTimeout(r, 1000));
        try { await call.startRecording(); } catch (err) { }
        
        // Trigger start notification to the target audience
        sendPostNotifications({
          targetAudience: livestream.targetAudience || 'all',
          targetGender: livestream.targetGender || 'all',
          specificRecipients: livestream.specificRecipients || [],
          type: 'livestream_start',
          title: livestream.title
        }).catch(err => console.error("Failed to send start notification:", err));

        toast({ variant: 'primary', title: 'Du er nu LIVE!' });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Fejl', description: 'Kunne ikke starte mødet.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePublishRecording = async () => {
    if (!call || !firestore || !user) return;
    setIsPublishing(true);
    triggerHaptic();
    try {
      const idToken = await user.getIdToken();
      
      // We send the IDs to the server. 
      // The server will use Admin privileges to list recordings and handle the URL generation.
      const res = await fetch('/api/stream/publish-recording', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${idToken}` 
        },
        body: JSON.stringify({ 
          livestreamId: livestream.id, 
          callId: livestream.callId,
          callType: 'livestream',
          firestorePath: `livestreams/${livestream.id}` 
        })
      });
      
      const response = await res.json();
      
      if (res.ok) {
        toast({ variant: 'primary', title: 'Optagelse udgivet!' });
        onClose();
      } else {
        toast({ 
          variant: 'destructive', 
          title: 'Venter på optagelse', 
          description: response.error || 'Prøv igen om et øjeblik.' 
        });
      }
    } catch (e: any) {
      console.error("Publish error:", e);
      toast({ variant: 'destructive', title: 'Fejl', description: 'Kunne ikke udgive optagelse.' });
    } finally {
      setIsPublishing(false);
    }
  };

  if (showRecordingResult) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-[#111214]">
        <div className="grid h-24 w-24 place-items-center rounded-[40px] bg-primary/10 text-primary mb-8 animate-in zoom-in-90 duration-500">
          <CheckCircle className="h-12 w-12" />
        </div>
        <div className="space-y-3 mb-10">
          <h2 className="text-3xl font-extrabold font-headline text-white">Mødet er afsluttet</h2>
          <p className="text-white/40 text-lg">Ønsker du at udgive optagelsen?</p>
        </div>
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <Button onClick={handlePublishRecording} disabled={isPublishing} className="h-16 rounded-[24px] bg-primary text-white font-bold text-lg shadow-xl shadow-primary/20">
            {isPublishing ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <Save className="mr-2 h-6 w-6" />}
            Udgiv Optagelse
          </Button>
          <Button variant="ghost" onClick={onClose} className="h-14 rounded-[20px] text-white/60 hover:text-white font-bold">Afslut uden at udgive</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#111214] text-white overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-black/40 backdrop-blur-md z-10 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={cn("px-3 py-1 rounded-full flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest", isLive ? 'bg-red-600 animate-pulse' : 'bg-card/10')}>
            <Radio className="h-3 w-3" />
            {isLive ? 'Live' : 'Studio'}
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-card/10 text-[10px] font-bold uppercase tracking-widest">
            <Users className="h-3 w-3 opacity-60" />
            {participantCount}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-white/60 hover:text-white rounded-full"><X className="h-5 w-5" /></Button>
      </div>

      <div className="flex-1 min-h-0 relative bg-black flex items-center justify-center overflow-hidden">
        {localParticipant ? (
          <ParticipantView participant={localParticipant} className="w-full h-full max-h-full" />
        ) : (
          <Loader2 className="h-12 w-12 animate-spin text-white/20" />
        )}
        {isCamEnabled && localParticipant && (
          <div className="absolute bottom-6 left-6 z-10">
            <button onClick={() => queueDeviceOp(() => camera.flip())} className="h-12 w-12 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 hover:text-white transition-all active:scale-90 shadow-lg">
              <SwitchCamera className="h-6 w-6" />
            </button>
          </div>
        )}
        {!isCamEnabled && localParticipant && (
          <div className="absolute inset-0 bg-[#111214] flex flex-col items-center justify-center gap-4">
            <VideoOff className="h-10 w-10 text-white/20" />
            <p className="text-sm font-bold text-white/40 uppercase tracking-widest">Kamera er slået fra</p>
          </div>
        )}
      </div>

      <div className="flex-shrink-0 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom,1.5rem))] bg-black flex flex-col items-center gap-6 border-t border-white/5">
        <div className="text-center">
          <h2 className="text-lg font-bold font-headline truncate max-w-[90vw]">{livestream.title}</h2>
          <p className="text-xs text-white/40 font-medium uppercase tracking-wider">Ibn Amer Studio</p>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => queueDeviceOp(() => camera.toggle())} className={cn("h-14 w-14 rounded-full flex items-center justify-center transition-all active:scale-90 border border-white/5", isCamEnabled ? "bg-card/10 text-white" : "bg-red-500/20 text-red-500")}>
            {isCamEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
          </button>
          <Button onClick={handleToggleLive} disabled={isUpdating} className={cn("h-16 px-12 rounded-[24px] font-extrabold text-base shadow-2xl transition-all active:scale-95", isLive ? "bg-red-600 hover:bg-red-700 text-white" : "bg-primary hover:bg-primary/90 text-white")}>
            {isUpdating ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : isLive ? 'Afslut Møde' : 'Start Møde'}
          </Button>
          <button onClick={() => queueDeviceOp(() => microphone.toggle())} className={cn("h-14 w-14 rounded-full flex items-center justify-center transition-all active:scale-90 border border-white/5", isMicEnabled ? "bg-card/10 text-white" : "bg-red-500/20 text-red-500")}>
            {isMicEnabled ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function LivestreamBroadcastSheet({ livestream, isOpen, onClose }: Props) {
  const { firebaseApp } = useFirebase();
  const { setIsSubView } = useView();
  const [call, setCall] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Hide Navbar when broadcasting
  useEffect(() => {
    if (isOpen) {
      setIsSubView(true);
    }
    return () => {
      setIsSubView(false);
    };
  }, [isOpen, setIsSubView]);

  useEffect(() => {
    if (!isOpen || !livestream.callId) return;
    let c: any = null;
    let sClient: any = null;
    const init = async () => {
      try {
        const { StreamVideoClient } = await import('@stream-io/video-react-sdk');
        const { getAuth } = await import('firebase/auth');
        const auth = getAuth(firebaseApp);
        const user = auth.currentUser;
        if (!user) throw new Error('Not authenticated');
        const idToken = await user.getIdToken();
        const res = await fetch('/api/stream/video-token', { method: 'POST', headers: { Authorization: `Bearer ${idToken}` } });
        const { token } = await res.json();
        
        // Use institutional identity for the broadcast
        sClient = new StreamVideoClient({ 
          apiKey: process.env.NEXT_PUBLIC_STREAM_API_KEY!, 
          user: { 
            id: user.uid, 
            name: 'Ibn Amer Instituttet',
            image: '/pwa/ibn-amer-logo.png'
          }, 
          token 
        });
        
        c = sClient.call('livestream', livestream.callId);
        
        // Request hardware in strict sequential order for stability
        await c.camera.enable().catch(() => {});
        await new Promise(r => setTimeout(r, 500)); 
        await c.microphone.enable().catch(() => {});
        
        await c.join({ create: true });
        setCall(c);
      } catch (err: any) {
        setError(err.message);
      }
    };
    init();
    return () => {
      if (c) c.leave().catch(() => {});
      if (sClient) sClient.disconnectUser().catch(() => {});
    };
  }, [isOpen, livestream.callId, firebaseApp]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-black">
      {error ? (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-6">
          <AlertCircle className="h-16 w-16 text-red-500" />
          <h3 className="text-xl font-bold text-white">Kunne ikke start studio</h3>
          <p className="text-white/40 text-sm">{error}</p>
          <Button onClick={onClose} variant="outline" className="text-white border-white/20">Luk</Button>
        </div>
      ) : call ? (
        <StreamTheme className="h-full">
          <StreamCall call={call}>
            <BroadcastUI livestream={livestream} onClose={onClose} />
          </StreamCall>
        </StreamTheme>
      ) : (
        <div className="h-full flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-bold text-white/40 uppercase tracking-widest">Forbereder...</p>
        </div>
      )}
    </div>
  );
}
