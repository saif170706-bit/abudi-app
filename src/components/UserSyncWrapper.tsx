'use client';

import { onAuthStateChanged } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import streamClient from "@/lib/stream";
import { auth, db } from "@/lib/firebaseClient";
import LoadingSpinner from "@/components/LoadingSpinner";

async function fetchStreamToken() {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Not authenticated");

  const idToken = await currentUser.getIdToken();
  const res = await fetch("/api/stream/token", {
    method: "POST",
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) throw new Error("Token request failed");
  const data = await res.json();
  return data.token as string;
}

export default function UserSyncWrapper({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tokenProvider = useMemo(() => {
    return async () => fetchStreamToken();
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setError(null);

      try {
        if (!user) {
          await streamClient.disconnectUser();
          setReady(true);
          return;
        }

        // 1) Upsert user in Firestore
        const name =
          user.displayName ||
          user.email ||
          "Unknown User";

        const email = user.email || "";
        const imageUrl = user.photoURL || "";

        await setDoc(
          doc(db, "users", user.uid),
          {
            uid: user.uid,
            name,
            email,
            imageUrl,
            nameLower: name.toLowerCase(),
            emailLower: email.toLowerCase(),
            updatedAt: Date.now(),
            // only set on first create
            createdAt: (Date.now()),
          },
          { merge: true }
        );

        // 2) Connect to Stream (authenticated via tokenProvider)
        await streamClient.connectUser(
          { id: user.uid, name, image: imageUrl },
          tokenProvider
        );

        setReady(true);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Failed to sync user");
        setReady(true);
      }
    });

    return () => unsub();
  }, [tokenProvider]);

  if (!ready) {
    return <LoadingSpinner size="lg" message="Loading..." className="min-h-screen" />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full border rounded-xl p-6">
          <p className="font-semibold text-red-600 mb-2">Sync Error</p>
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
