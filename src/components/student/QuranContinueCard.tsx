'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ChevronRight } from 'lucide-react';
import { useFirebase, useUser } from '@/firebase';
import { getQuranProgress } from '@/hooks/use-quran-progress';
import { useView } from '@/context/ViewContext';
import { useGlobalTranslation } from '@/hooks/useGlobalTranslation';

/**
 * Shows a "Continue reading from page X" card on the student dashboard.
 * Fetches the saved Quran page from Firestore on mount.
 */
export default function QuranContinueCard() {
  const { tGlobal } = useGlobalTranslation();
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { navigateToQuranPage, savedQuranPage, setSavedQuranPage } = useView();
  const [loading, setLoading] = useState(!savedQuranPage);

  useEffect(() => {
    if (savedQuranPage) {
      setLoading(false);
      return;
    }
    async function load() {
      if (!user || !firestore) { setLoading(false); return; }
      const page = await getQuranProgress(firestore, user.uid);
      if (page) setSavedQuranPage(page);
      setLoading(false);
    }
    load();
  }, [user, firestore, savedQuranPage, setSavedQuranPage]);

  const pageToShow = savedQuranPage;

  if (!loading && !pageToShow) return null;

  return (
    <AnimatePresence mode="wait">
      {!loading && pageToShow ? (
        <motion.div
          key="card"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="relative glass-card shadow-sm cursor-pointer group min-h-[96px]"
          onClick={() => navigateToQuranPage(pageToShow)}
        >
          <div className="glass-card-inner !p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-[#DEA93E]/10 flex items-center justify-center shrink-0">
              <BookOpen className="h-6 w-6 text-[#DEA93E]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#DEA93E] mb-0.5">
                {tGlobal('Fortsæt læsning')}
              </p>
              <h3 className="text-base font-black text-[#004D40] leading-tight">
                {tGlobal('Side')} {pageToShow} {tGlobal('i Quran')}
              </h3>
              <p className="text-[10px] text-[#004D40]/40 font-bold mt-0.5">
                {tGlobal('Tryk for at fortsætte')}
              </p>
            </div>
            <div className="h-9 w-9 rounded-full bg-[#004D40] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <ChevronRight className="h-4 w-4 text-white" />
            </div>
          </div>
        </motion.div>
      ) : loading ? (
        <motion.div
          key="skeleton"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="relative glass-card border-none bg-black/[0.02] shadow-none min-h-[96px]"
        >
          <div className="glass-card-inner !p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-[#004D40]/5 animate-pulse shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-2 w-20 bg-[#004D40]/5 animate-pulse rounded" />
              <div className="h-4 w-32 bg-[#004D40]/10 animate-pulse rounded" />
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
