'use client';

import React, { createContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { onAuthStateChanged, User, browserLocalPersistence, setPersistence } from 'firebase/auth';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { auth } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  const logout = useCallback(async () => {
    try {
      // ONLY clear the generic cachedRole, keep the uid specific ones for fast PWA switching
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cachedRole');
      }

      // Clean up FCM token on logout to prevent "ghost" notifications
      try {
        const { getDoc, doc } = await import('firebase/firestore');
        const db = (await import('@/firebase')).getFirestore((await import('@/firebase')).getApp());
        
        // We need to know the role before signOut for the path
        const userDoc = await getDoc(doc(db, 'students', auth.currentUser!.uid));
        let role = 'student';
        if (!userDoc.exists()) {
           const teacherDoc = await getDoc(doc(db, 'teachers', auth.currentUser!.uid));
           if (teacherDoc.exists()) role = 'teacher';
           else role = 'admin';
        }

        const { cleanupFcmTokenOnLogout } = await import('@/lib/fcm');
        await cleanupFcmTokenOnLogout(role);
      } catch (e) {
        console.warn("FCM Cleanup failed (non-blocking):", e);
      }

      await auth.signOut();
      router.push('/');
    } catch (error) {
      console.error("Logout failed:", error);
      toast({
        variant: "destructive",
        title: "Logout Fejlede",
        description: "Kunne ikke logge ud. Prøv igen.",
      });
    }
  }, [auth, toast, router]);

  useEffect(() => {
    // Ensure auth state persists to IndexedDB so the user is recognized
    // instantly on the next app open — no network round-trip needed.
    setPersistence(auth, browserLocalPersistence).catch(() => {});

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      // If user logs out (currentUser is null), actively clear the generic cache to prevent cross-account routing bugs
      if (!currentUser && typeof window !== 'undefined') {
        localStorage.removeItem('cachedRole');
      }
      
      setUser(currentUser);
      setLoading(false);
    }, (error) => {
      console.error("Auth State Error:", error);
      setLoading(false);
      setUser(null);
    });

    return () => unsubscribeAuth();
  }, [auth]);

  const value = useMemo(() => ({
    user,
    loading,
    logout,
  }), [user, loading, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
