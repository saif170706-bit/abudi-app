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

export default function VideoLayout({
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

    const c = client.call("default", id);

    const initCall = async () => {
      try {
        // VIDEO PAGE:
        // Force both devices OFF before join, otherwise Stream may apply backend defaults on join
        await Promise.allSettled([
          c.camera.disable(),
          c.microphone.disable(),
        ]);
        
        // Prevents SDK from trying to monitor mic while muted
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
        console.error("[video-call] join failed:", e);
        setError(e?.message || "Kunne ikke starte videoopkaldet. Kontroller din forbindelse.");
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
            // Shut down both media tracks on unmount
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
      <div className="min-h-[100dvh] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border bg-card p-6 text-center">
          <p className="text-lg font-semibold">Call Error</p>
          <p className="text-sm text-muted-foreground mt-2">{error}</p>
          <button
            className="mt-4 w-full rounded-xl bg-primary text-primary-foreground py-2"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!client || !call) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 rounded-full border-2 border-muted-foreground border-t-transparent" />
      </div>
    );
  }

  return (
    <StreamTheme className="h-[100dvh]">
      <StreamCall call={call}>{children}</StreamCall>
    </StreamTheme>
  );
}
