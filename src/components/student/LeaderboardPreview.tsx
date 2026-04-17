'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, ChevronRight, Sparkles } from 'lucide-react';
import { useFirebase, useUser } from '@/firebase';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { useGlobalTranslation } from '@/hooks/useGlobalTranslation';

interface LeaderboardEntry {
  id: string;
  displayName: string;
  photoURL: string | null;
  totalPoints: number;
}

// ── Skeleton shimmer preview ──────────────────────────────────────────────
function LeaderboardPreviewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-[#DEA93E]/40" />
          <Skeleton className="h-3 w-24 rounded-full" />
        </div>
        <Skeleton className="h-3 w-12 rounded-full" />
      </div>
      <div className="glass-card shadow-xl">
        <div className="glass-card-inner !p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              {[0, 1, 2].map(i => (
                <Skeleton key={i} className="h-10 w-10 rounded-full border-2 border-white" />
              ))}
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-2 w-16 rounded" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="space-y-1 items-end flex flex-col">
              <Skeleton className="h-2 w-12 rounded" />
              <Skeleton className="h-6 w-8 rounded" />
            </div>
            <ChevronRight className="h-5 w-5 text-[#004D40]/10" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LeaderboardPreview({
  userId,
  setView,
}: {
  userId: string;
  setView: (v: any) => void;
}) {
  const { tGlobal } = useGlobalTranslation();
  const { firestore } = useFirebase();
  const [loading, setLoading] = useState(true);
  const [topStudents, setTopStudents] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    if (!firestore || !userId) return;

    // One-time fetch — leaderboard doesn't need real-time updates on the dashboard.
    // Changes happen infrequently (on assignment grade), so getDocs is much cheaper.
    const q = query(
      collection(firestore, 'leaderboard'),
      orderBy('monthlyScore', 'desc'),
      limit(20)
    );

    getDocs(q)
      .then((snap) => {
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        setTopStudents(all.slice(0, 3));
        const myRank = all.findIndex((s: any) => s.id === userId) + 1;
        setUserRank(myRank > 0 ? myRank : null);
      })
      .catch((err) => {
        console.error("Leaderboard preview fetch error:", err);
      })
      .finally(() => setLoading(false));
  }, [firestore, userId]); // Intentionally only run on mount

  if (loading) return <LeaderboardPreviewSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-[#DEA93E]" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#004D40]/30">
            {tGlobal('Leaderboard')}
          </span>
        </div>
        <button
          onClick={() => setView('leaderboard')}
          className="text-[10px] font-black uppercase tracking-widest text-[#DEA93E] hover:opacity-70 transition-all active:scale-95"
        >
          {tGlobal('Se alle →')}
        </button>
      </div>

      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="glass-card shadow-xl overflow-visible cursor-pointer"
        onClick={() => setView('leaderboard')}
      >
        <div className="glass-card-inner !p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex -space-x-3">
              {topStudents.map((s, i) => (
                <Avatar
                  key={s.id}
                  className={cn(
                    'h-10 w-10 border-2 border-white shadow-lg',
                    i === 0 ? 'z-30' : i === 1 ? 'z-20' : 'z-10'
                  )}
                >
                  <AvatarImage src={s.photoURL || undefined} className="object-cover" />
                  <AvatarFallback className="bg-[#004D40] text-white text-[10px]">
                    {getInitials(s.displayName)}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <div>
              <p className="text-[11px] font-black text-[#004D40] uppercase tracking-tight">
                {userRank === 1 ? tGlobal('Du fører!') : userRank && userRank <= 3 ? tGlobal('Du er i Top 3!') : tGlobal('Top 3 er tæt!')}
              </p>
              <p className="text-[9px] font-bold text-[#004D40]/30 uppercase">
                {userRank ? tGlobal('Du er nummer') + ` ${userRank}` : tGlobal('Se hvem der fører')}
              </p>
            </div>
          </div>

          <div className="text-right flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-black text-[#004D40]/30 uppercase tracking-widest">
                {tGlobal('Din plads')}
              </span>
              <div className="flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-[#DEA93E]" />
                <span className="text-xl font-display text-[#004D40]">
                  #{userRank || '?'}
                </span>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-[#004D40]/20" />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
