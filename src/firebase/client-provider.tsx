'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { Auth, getAuth } from 'firebase/auth';
import { 
    Firestore, 
    getFirestore, 
    initializeFirestore, 
    persistentLocalCache, 
    persistentMultipleTabManager 
} from 'firebase/firestore';
import { FirebaseApp } from 'firebase/app';

// Singleton to prevent multiple initializations (especially during Next.js hot reloads)
let firestoreInstance: Firestore | null = null;

function getPersistentFirestore(app: FirebaseApp): Firestore {
    if (firestoreInstance) return firestoreInstance;

    if (typeof window !== 'undefined') {
        try {
            firestoreInstance = initializeFirestore(app, {
                localCache: persistentLocalCache({
                    tabManager: persistentMultipleTabManager()
                })
            });
            console.log("Firestore Persistence Enabled");
        } catch (e) {
            // If already initialized (e.g. by another module), fallback to getFirestore
            firestoreInstance = getFirestore(app);
        }
    } else {
        firestoreInstance = getFirestore(app);
    }
    
    return firestoreInstance;
}

interface FirebaseServices {
    firebaseApp: FirebaseApp,
    auth: Auth;
    firestore: Firestore;
}

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices: FirebaseServices = useMemo(() => {
    const app = initializeFirebase();
    const firestore = getPersistentFirestore(app);

    return {
        firebaseApp: app,
        auth: getAuth(app),
        firestore
    };
  }, []);

  return (
    <FirebaseProvider {...firebaseServices}>
      {children}
    </FirebaseProvider>
  );
}
