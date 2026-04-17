'use client';

import { useEffect, useMemo, useState, useCallback } from "react";
import { StreamVideo } from "@stream-io/video-react-sdk";
import { createStreamVideoClient } from "@/lib/streamVideoClient";
import { useUser } from "@/firebase";
import { useUserProfile } from "@/hooks/use-user-profile";
import { getAuth } from "firebase/auth";

if (!process.env.NEXT_PUBLIC_STREAM_API_KEY) {
  throw new Error("NEXT_PUBLIC_STREAM_API_KEY is not set");
}

export default function StreamVideoProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useUser();
  const { profile } = useUserProfile();
  const [client, setClient] = useState<any>(null);

  const streamUser = useMemo(() => {
    if (!user) return null;
    return {
      id: user.uid,
      name: profile?.displayName || user.displayName || user.email || "Unknown",
      image: profile?.photoURL || user.photoURL || "",
    };
  }, [user, profile]);

  const tokenProvider = useCallback(async () => {
    const auth = getAuth();
    const current = auth.currentUser;
    if (!current) throw new Error("Not authenticated");

    const idToken = await current.getIdToken();

    const res = await fetch("/api/stream/video-token", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.error || "Failed to fetch Stream token");
    }

    const data = await res.json();
    return data.token as string;
  }, []);

  useEffect(() => {
    if (loading) return;

    if (!streamUser) {
      setClient(null);
      return;
    }

    const newClient = createStreamVideoClient({
      apiKey: process.env.NEXT_PUBLIC_STREAM_API_KEY as string,
      user: streamUser,
      tokenProvider,
    });

    setClient(newClient);

    return () => {
      newClient.disconnectUser().catch(console.error);
    };
  }, [loading, streamUser, tokenProvider]);

  if (loading) return null;
  if (!client) return <>{children}</>; // eller vis en loading UI

  return <StreamVideo client={client}>{children}</StreamVideo>;
}
