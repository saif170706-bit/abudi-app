'use client';

import { useContext } from 'react';
import { AuthContext, type AuthContextType } from '@/context/auth-context';

/**
 * Hook to get the current user's authentication state.
 * It's crucial for this hook to not block rendering. It provides the user
 * object and a loading state, which are updated asynchronously.
 * @returns {object} An object containing the user, loading state, and logout function.
 */
export const useUser = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useUser must be used within an AuthProvider');
  }
  return context;
};
