import React, { createContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
// See firebase/client.ts for why auth APIs come from @firebase/auth, not firebase/auth.
import { onAuthStateChanged, User } from '@firebase/auth';
import { useFirebase } from '@/firebase';

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

  const logout = useCallback(async () => {
    // Clear the generic cached role so the next login re-resolves it from Firestore.
    await AsyncStorage.removeItem('cachedRole').catch(() => {});
    await auth.signOut();
  }, [auth]);

  useEffect(() => {
    // initializeAuth (see firebase/client.ts) already persists the session to
    // AsyncStorage, so no explicit setPersistence call is needed like on web.
    const unsubscribeAuth = onAuthStateChanged(
      auth,
      async (currentUser) => {
        if (!currentUser) {
          await AsyncStorage.removeItem('cachedRole').catch(() => {});
        }
        setUser(currentUser);
        setLoading(false);
      },
      (error) => {
        console.error('Auth State Error:', error);
        setLoading(false);
        setUser(null);
      }
    );

    return () => unsubscribeAuth();
  }, [auth]);

  const value = useMemo(() => ({ user, loading, logout }), [user, loading, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
