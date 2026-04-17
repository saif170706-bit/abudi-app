'use client';

import { useState, useEffect } from 'react';
import { 
  useCallStateHooks, 
  ParticipantView, 
  useCall,
  StreamCall,
  StreamTheme,
} from '@stream-io/video-react-sdk';
import { Button } from '@/components/ui/button';
import { X, Users, Loader2, Radio, AlertCircle, Play } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { cn } from '@/lib/utils';
import { useHaptic } from 'use-haptic';
import { useView } from '@/context/ViewContext';

interface Props {
  livestream: any;
  isOpen: boolean;
  onClose: () => void;
}

const PlayerUI = ({ livestream, onClose }: { livestream: any, onClose: () => void }) => {
  const { useParticipantCount, useIsCallLive, useParticipants } = useCallStateHooks();
  const participantCount = useParticipantCount();
  const isLive = useIsCallLive();
  const participants = useParticipants();
  
  // Specifically detect the teacher's video track by looking for published tracks
  const host = participants.find(p => p.userId === livestream.authorId) || 
               participants.find(p => p.roles.includes('publisher') || p.roles.includes('admin')) || 
               participants[0];

  return (
    <div className="flex flex-col h-full bg-[#111214] text-white overflow-hidden">
      {/* Header - Compact */}
      <div className="flex items-center justify-between p-3 sm:p-4 bg-black/40 backdrop-blur-md z-10 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className={cn(
            "px-3 py-1 rounded-full flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-widest",
            isLive ? 'bg-red-600 animate-pulse' : 'bg-card/10'
          )}>
            <Radio className="h-3 w-3" />
            {isLive ? 'Live' : 'Venter'}
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-card/10 text-[10px] font-bold uppercase tracking-widest">
            <Users className="h-3 w-3 opacity-60" />
            {participantCount}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="text-white/60 hover:text-white hover:bg-card/10 rounded-full h-9 w-9">
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Video Area */}
      <div className="flex-1 min-h-0 relative bg-black flex items-center justify-center overflow-hidden">
        {isLive && host ? (
          <div className="w-full h-full">
            <ParticipantView 
              participant={host} 
              className="w-full h-full max-h-full"
            />
            <style jsx global>{`
              .str-video__participant-view video {
                object-fit: contain !important;
              }
            `}</style>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-6 text-center px-8 max-w-sm">
            <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-[32px] sm:rounded-[40px] bg-card/5 flex items-center justify-center shadow-inner">
              <Play className="h-8 w-8 sm:h-10 sm:w-10 text-white/20 ml-1" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg sm:text-xl font-bold font-headline">Mødet er ikke startet</h3>
              <p className="text-white/40 text-xs sm:text-sm font-medium leading-relaxed">Læreren er ved at gøre klar. Bliv hængende, streamen starter automatisk så snart der er signal.</p>
            </div>
            <div className="flex items-center gap-2 bg-card/5 px-4 py-2 rounded-full border border-white/5">
              <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin text-primary" />
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest opacity-60">Forbinder...</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex-shrink-0 p-4 sm:p-6 pb-[max(1rem,env(safe-area-inset-bottom,1rem))] bg-black flex flex-col items-center gap-6 border-t border-white/5">
        <div className="text-center space-y-0.5 sm:space-y-1">
          <h2 className="text-lg sm:text-xl font-extrabold font-headline leading-tight truncate max-w-[90vw]">{livestream.title}</h2>
          <p className="text-[10px] sm:text-xs text-white/40 font-medium uppercase tracking-wider">Ibn Amer Instituttet • Live Møde</p>
        </div>
      </div>
    </div>
  );
};

export default function LivestreamViewSheet({ livestream, isOpen, onClose }: Props) {
  const { firebaseApp } = useFirebase();
  const { setIsSubView } = useView();
  const [call, setCall] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Hide Navbar when viewing stream
  useEffect(() => {
    if (isOpen) {
      setIsSubView(true);
    }
    return () => {
      setIsSubView(false);
    };
  }, [isOpen, setIsSubView]);

  // Auto-close for viewers when meeting is no longer active in Firestore
  useEffect(() => {
    if (isOpen && livestream.isActive === false) {
      onClose();
    }
  }, [isOpen, livestream.isActive, onClose]);

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
        const res = await fetch('/api/stream/video-token', {
          method: 'POST',
          headers: { Authorization: `Bearer ${idToken}` }
        });
        
        let data: any = {};
        try {
          data = await res.json();
        } catch (e) {
          throw new Error('Kunne ikke læse svar fra stream-serveren');
        }

        if (!res.ok) {
          throw new Error(data.error || `Video token failed (${res.status})`);
        }
        const { token } = data;

        sClient = new StreamVideoClient({
          apiKey: process.env.NEXT_PUBLIC_STREAM_API_KEY!,
          user: { id: user.uid, name: user.displayName || 'Elev' },
          token,
        });

        c = sClient.call('livestream', livestream.callId);
        
        try {
          // Join with camera and microphone disabled by default to avoid immediate prompts.
          await c.join({
            camera: { enabled: false },
            microphone: { enabled: false }
          });
        } catch (err: any) {
          // Ignore backstage permission error if session hasn't started
          if (err.code !== 17) {
            throw err;
          }
        }
        
        setCall(c);
      } catch (err: any) {
        console.error("Stream initialization failed:", err);
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
    <div className="fixed inset-0 z-[200] bg-black">
      {error ? (
        <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-6">
          <AlertCircle className="h-16 w-16 text-red-500" />
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">Kunne ikke deltage</h3>
            <p className="text-white/40 text-sm">{error}</p>
          </div>
          <Button onClick={onClose} variant="outline" className="text-white border-white/20">Luk</Button>
        </div>
      ) : call ? (
        <StreamTheme className="h-full">
          <StreamCall call={call}>
            <PlayerUI livestream={livestream} onClose={onClose} />
          </StreamCall>
        </StreamTheme>
      ) : (
        <div className="h-full flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-bold text-white/40 uppercase tracking-widest">Deltager i møde...</p>
        </div>
      )}
    </div>
  );
}
