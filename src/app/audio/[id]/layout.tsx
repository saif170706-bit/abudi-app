'use client';

import {
  Call,
  CallingState,
  StreamCall,
  StreamTheme,
  useStreamVideoClient,
} from "@stream-io/video-react-sdk";
import { useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";

export default function AudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { id } = useParams<{ id: string }>();
  const client = useStreamVideoClient();
  const [call, setCall] = useState<Call | null>(null);
  const [error, setError] = useState<string | null>(null);
  const joiningRef = useRef(false);
  const joinedRef = useRef(false);

  useEffect(() => {
    if (!client || !id || joiningRef.current) return;

    let cancelled = false;
    joiningRef.current = true;
    setError(null);

    // Use 'default' call type which is standard
    const c = client.call("default", id);

    const initCall = async () => {
      try {
        // AUDIO PAGE:
        // Force both devices OFF before join, otherwise Stream may apply backend defaults on join
        await Promise.allSettled([
          c.camera.disable(),
          c.microphone.disable(),
        ]);
        
        // IMPORTANT: Prevents SDK from trying to monitor mic while muted (which triggers getAudioStream)
        await c.microphone.disableSpeakingWhileMutedNotification().catch(() => {});
        
        if (cancelled) return;

        await c.join({ create: true });
        
        if (cancelled) {
          await c.leave().catch(() => {});
          return;
        }

        joinedRef.current = true;
        setCall(c);
      } catch (e: any) {
        console.error("[audio-call] join failed:", e);
        setError(e?.message || "Kunne ikke starte lydopkaldet. Kontroller din forbindelse.");
      } finally {
        joiningRef.current = false;
      }
    };

    initCall();

    return () => {
      cancelled = true;
      joiningRef.current = false;
      
      void (async () => {
        try {
          if (c) {
            // Close media tracks before leaving
            await Promise.allSettled([
              c.camera.disable(),
              c.microphone.disable(),
            ]);
            
            if (joinedRef.current) {
              await c.leave().catch(() => {});
            }
          }
        } finally {
          joinedRef.current = false;
        }
      })();
    };
  }, [client, id]);

  if (error) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full rounded-3xl border bg-card p-8 text-center shadow-xl">
          <p className="text-xl font-bold">Fejl ved opkald</p>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
          <button
            className="mt-6 w-full rounded-2xl bg-primary text-white py-3 font-bold shadow-lg shadow-primary/20"
            onClick={() => window.location.reload()}
          >
            Prøv igen
          </button>
        </div>
      </div>
    );
  }

  if (!client || !call) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin h-10 w-10 rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="text-sm font-medium text-muted-foreground">Forbinder til lydopkald...</p>
        </div>
      </div>
    );
  }

  return (
    <StreamTheme className="h-[100dvh]">
      <StreamCall call={call}>{children}</StreamCall>
    </StreamTheme>
  );
}
