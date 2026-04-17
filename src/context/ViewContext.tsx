'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useMemo, useCallback } from 'react';
import type { QueueStudent } from '@/types';

type View = 
  | 'overview' 
  | 'homework-reading' 
  | 'view-homework' 
  | 'find-student' 
  | 'profile' 
  | 'membership' 
  | 'quran-reader' 
  | 'quran-index' 
  | 'announcements' 
  | 'chat'
  | 'progress-journey'
  | 'leaderboard'
  // Admin Views
  | 'admin-members'
  | 'admin-absence'
  | 'admin-posts'
  | 'admin-waiting-list'
  | 'admin-mail';

interface ViewContextType {
  view: View;
  setView: (newView: View) => void;
  goBack: () => void;
  quranPage: number | null;
  navigateToQuranPage: (page: number) => void;
  isSubView: boolean;
  setIsSubView: (isSub: boolean) => void;
  servingStudent: QueueStudent | null;
  setServingStudent: (student: QueueStudent | null) => void;
  savedQuranPage: number | null;
  setSavedQuranPage: (page: number | null) => void;
}

const ViewContext = createContext<ViewContextType | undefined>(undefined);

export const ViewProvider = ({ children }: { children: ReactNode }) => {
  const [view, setViewInternal] = useState<View>('overview');
  const [previousView, setPreviousView] = useState<View>('overview');
  const [quranPage, setQuranPage] = useState<number | null>(null);
  const [isSubView, setIsSubView] = useState(false);
  const [servingStudent, setServingStudent] = useState<QueueStudent | null>(null);
  const [savedQuranPage, setSavedQuranPage] = useState<number | null>(null);

  /**
   * GLOBAL SCROLL RESET
   * This effect triggers every time the 'view' changes.
   * It handles cases where the browser tries to maintain scroll position between component swaps.
   */
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 1. Tell the browser we handle scroll manually to prevent history-based jumps
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = 'manual';
      }

      // 2. Perform immediate reset
      window.scrollTo(0, 0);

      // 3. Use requestAnimationFrame to ensure the reset happens after the DOM has updated
      // and Next.js has finished swapping the components.
      const rafId = requestAnimationFrame(() => {
        window.scrollTo(0, 0);
        // Secondary fallback for cross-browser reliability
        document.documentElement.scrollTop = 0;
        if (document.body) document.body.scrollTop = 0;
      });

      return () => cancelAnimationFrame(rafId);
    }
  }, [view]);

  const setView = useCallback((newView: View) => {
    setViewInternal(prev => {
      // If we're navigating TO a sub-view, save where we are coming FROM.
      const subViews: View[] = [
        'profile', 
        'membership', 
        'quran-reader', 
        'quran-index', 
        'announcements', 
        'chat', 
        'admin-waiting-list', 
        'view-homework', 
        'homework-reading', 
        'find-student',
        'progress-journey'
      ];
      if (subViews.includes(newView)) {
        setPreviousView(prev);
      }
      return newView;
    });
  }, []);
  
  const goBack = useCallback(() => {
    setViewInternal(current => {
      if (current === 'quran-reader' && previousView === 'view-homework') {
        return 'view-homework';
      }
      return previousView;
    });
  }, [previousView]);

  const navigateToQuranPage = useCallback((page: number) => {
    setQuranPage(page);
    setSavedQuranPage(page);
    setViewInternal(prev => {
      setPreviousView(prev);
      return 'quran-reader';
    });
  }, []);

  const value = useMemo(() => ({
    view,
    setView,
    goBack,
    quranPage,
    navigateToQuranPage,
    isSubView,
    setIsSubView,
    servingStudent,
    setServingStudent,
    savedQuranPage,
    setSavedQuranPage,
  }), [view, setView, goBack, quranPage, navigateToQuranPage, isSubView, setIsSubView, servingStudent, savedQuranPage]);

  return <ViewContext.Provider value={value}>{children}</ViewContext.Provider>;
};

export const useView = () => {
  const context = useContext(ViewContext);
  if (context === undefined) {
    throw new Error('useView must be used within a ViewProvider');
  }
  return context;
};
