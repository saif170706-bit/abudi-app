import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, ChevronRight, Crown, Medal, TrendingUp, Calendar, Award, User } from 'lucide-react';
import { useFirebase, useUser } from '@/firebase';
import { collection, query, limit, getDocs, where, orderBy, doc, getDoc, getCountFromServer } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, cn } from '@/lib/utils';
import IslamicDivider from '@/components/ui/IslamicDivider';
import { Skeleton } from '@/components/ui/skeleton';
import useSWR from 'swr';
import { useGlobalTranslation } from '@/hooks/useGlobalTranslation';

// ── Types ─────────────────────────────────────────────────────────────────
interface LeaderboardData {
  id: string;
  displayName: string;
  photoURL: string | null;
  monthlyScore: number;
  allTimeScore: number;
  streakPoints: number;
  plan: string;
  frequency: number;
}

type Filter = 'monthly' | 'allTime' | 'streak';

const MEDAL_COLORS = ['#DEA93E', '#94A3B8', '#92400E'];

// ── Podium Component ──────────────────────────────────────────────────────
function Podium({ top3, currentUserId, filter }: { top3: LeaderboardData[]; currentUserId: string; filter: Filter }) {
  const { tGlobal } = useGlobalTranslation();
  // Order for display: 2nd (left), 1st (center), 3rd (right)
  const displayOrder = [top3[1], top3[0], top3[2]];
  const rankings = [2, 1, 3];
  const heights = ['h-32', 'h-48', 'h-24'];

  return (
    <div className="flex items-end justify-center gap-2 pt-16 pb-8 px-2">
      {displayOrder.map((entry, i) => {
        if (!entry) return <div key={i} className="flex-1" />;
        const rank = rankings[i];
        const isFirst = rank === 1;
        const isMe = entry.id === currentUserId;

        return (
          <motion.div
            key={entry.id}
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: i * 0.1, type: 'spring' }}
            className="flex-1 flex flex-col items-center"
          >
             <div className="relative mb-3">
                {isFirst && (
                  <motion.div
                    animate={{ rotate: [0, 5, -5, 0], y: [0, -4, 0] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="absolute -top-10 left-1/2 -translate-x-1/2 text-3xl z-20 pointer-events-none"
                  >
                    👑
                  </motion.div>
                )}
                <Avatar className={cn(
                  "border-4 shadow-xl",
                  isFirst ? "h-20 w-20 border-[#DEA93E]" : "h-14 w-14 border-white",
                  isMe && "ring-2 ring-[#004D40] ring-offset-2"
                )}>
                  <AvatarImage src={entry.photoURL || undefined} className="object-cover" />
                  <AvatarFallback className="bg-[#004D40] text-white font-black">
                    {getInitials(entry.displayName)}
                  </AvatarFallback>
                </Avatar>
                <div 
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-6 w-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-[10px] font-black text-white"
                  style={{ backgroundColor: MEDAL_COLORS[rank-1] }}
                >
                  {rank}
                </div>
             </div>

             <p className="text-[10px] font-black uppercase text-[#004D40]/60 mb-2 truncate max-w-full px-1">
                {entry.displayName.split(' ')[0]}
             </p>

             <div className={cn(
               "w-full rounded-t-2xl flex flex-col items-center justify-center p-2 relative overflow-hidden",
               heights[i],
               isFirst ? "bg-[#004D40] text-white" : "bg-white text-[#004D40] border-x border-t border-[#004D40]/5 shadow-sm"
             )}>
                {/* Pattern Overlay for 1st place */}
                {isFirst && (
                  <div className="absolute inset-0 opacity-10 pointer-events-none bg-[url('https://i.postimg.cc/xC74tT1V/flat-arabic-pattern-background-79603-1826.avif')] bg-cover" />
                )}
                
                <span className="text-lg font-display relative z-10">
                  {filter === 'monthly' ? entry.monthlyScore : filter === 'allTime' ? entry.allTimeScore : entry.streakPoints}
                </span>
                <span className="text-[8px] font-black uppercase tracking-widest opacity-50 relative z-10">
                  {filter === 'streak' ? tGlobal('Pts') : tGlobal('Score')}
                </span>
             </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────
export default function Leaderboard({ onBack }: { onBack: () => void }) {
  const { tGlobal } = useGlobalTranslation();
  const { firestore } = useFirebase();
  const { user } = useUser();
  const [filter, setFilter] = useState<Filter>('monthly');
  const [myPreciseRank, setMyPreciseRank] = useState<number | null>(null);
  // Always-fresh: fetch student's own entry on every page open (1 doc read).
  // Using plain state+useEffect instead of SWR so the student immediately
  // sees their updated score after a grading session, without any app restart.
  const [myLeaderboardData, setMyLeaderboardData] = useState<LeaderboardData | null>(null);
  useEffect(() => {
    if (!firestore || !user) return;
    getDoc(doc(firestore, 'leaderboard', user.uid)).then(snap => {
      if (!snap.exists()) return;
      const s = snap.data();
      setMyLeaderboardData({
        id: snap.id,
        displayName: s.displayName,
        photoURL: s.photoURL,
        plan: s.plan,
        frequency: s.frequency,
        monthlyScore: s.monthlyScore || 0,
        allTimeScore: s.allTimeScore || 0,
        streakPoints: s.streakPoints || 0,
      });
    }).catch(() => null);
  }, [firestore, user?.uid]); // stable dep — runs once per page open

  // One-time fetch with SWR 5-minute cache.
  // Leaderboard scores only change when a teacher grades a session (via Cloud Function),
  // so real-time listeners are unnecessary and very expensive at scale.
  const scoreKey = filter === 'monthly' ? 'monthlyScore' : filter === 'allTime' ? 'allTimeScore' : 'streakPoints';

  const { data: top100 = [], isLoading: loading } = useSWR(
    firestore ? `leaderboard_top100_${filter}` : null,
    async () => {
      const q = query(
        collection(firestore!, 'leaderboard'),
        orderBy(scoreKey, 'desc'),
        limit(100)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => {
        const s = d.data();
        return {
          id: d.id,
          displayName: s.displayName,
          photoURL: s.photoURL,
          plan: s.plan,
          frequency: s.frequency,
          monthlyScore: s.monthlyScore || 0,
          allTimeScore: s.allTimeScore || 0,
          streakPoints: s.streakPoints || 0,
        } as LeaderboardData;
      });
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 5 * 60 * 1000, // 5-minute cache per filter
    }
  );


  // Calculate precise rank (aggregation query — no document reads)
  useEffect(() => {
    if (!firestore || !myLeaderboardData) return;
    const myScore = myLeaderboardData[scoreKey as keyof LeaderboardData] as number;
    const q = query(collection(firestore, 'leaderboard'), where(scoreKey, '>', myScore));
    getCountFromServer(q).then(snap => {
      setMyPreciseRank(snap.data().count + 1);
    }).catch(() => setMyPreciseRank(null));
  }, [firestore, myLeaderboardData, scoreKey]);

  const sortedData = top100;
  const top3 = sortedData.slice(0, 3);
  const rest = sortedData.slice(3);
  
  const userIndexInTop100 = sortedData.findIndex(d => d.id === user?.uid);
  // Always prefer myPreciseRank (fresh aggregation query, 0 doc reads) over the
  // cached list position. This ensures the rank number is always correct even
  // if the top-100 list visual order is up to 5 minutes stale.
  const myRank = myPreciseRank || (userIndexInTop100 !== -1 ? userIndexInTop100 + 1 : 0);
  const me = myLeaderboardData;

  return (
    <div className="flex-1 w-full max-w-lg mx-auto pb-40 relative">
      {/* Dynamic Background */}
      <div className="fixed inset-0 bg-[#efebe1] -z-10" />
      
      {/* Header */}
      <div className="sticky top-0 z-[40] bg-[#efebe1]/80 backdrop-blur-xl border-b border-[#004D40]/5 px-6 pt-12 pb-4">
        <div className="flex items-center gap-4 mb-6">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            className="h-10 w-10 rounded-xl bg-white flex items-center justify-center shadow-sm border border-[#004D40]/10"
          >
            <ChevronRight className="h-5 w-5 text-[#004D40] rotate-180" />
          </motion.button>
          <div>
            <h1 className="text-2xl font-display text-[#004D40]">{tGlobal('Leaderboard')}</h1>
            <div className="flex items-center gap-2">
               <div className="h-1.5 w-1.5 rounded-full bg-[#DEA93E] animate-pulse" />
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#004D40]/40">{tGlobal('Konkurrér med andre')}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex p-1 bg-[#004D40]/5 rounded-2xl gap-1">
          {[
            { id: 'monthly', label: tGlobal('Måned'), icon: <Calendar className="h-3 w-3" /> },
            { id: 'allTime', label: tGlobal('Top-liste'), icon: <Award className="h-3 w-3" /> },
            { id: 'streak', label: tGlobal('Streaks'), icon: <TrendingUp className="h-3 w-3" /> },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as Filter)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                filter === f.id 
                  ? "bg-white text-[#004D40] shadow-sm" 
                  : "text-[#004D40]/40 hover:text-[#004D40]/60"
              )}
            >
              {f.icon}
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 space-y-4">
        {loading ? (
          <div className="space-y-4 pt-12 text-center">
            <Trophy className="h-12 w-12 text-[#DEA93E]/20 mx-auto animate-bounce" />
            <p className="text-[10px] font-black uppercase text-[#004D40]/40 tracking-widest">{tGlobal('Henter placeringer...')}</p>
          </div>
        ) : (
          <>
            {/* Podium */}
            {top3.length > 0 && (
              <Podium top3={top3} currentUserId={user?.uid || ''} filter={filter} />
            )}

            {/* List */}
            <div className="space-y-2 pb-8">
              {rest.map((entry, i) => {
                const rank = i + 4;
                const isMe = entry.id === user?.uid;
                const val = filter === 'monthly' ? entry.monthlyScore : filter === 'allTime' ? entry.allTimeScore : entry.streakPoints;

                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      "glass-card group hover:scale-[1.01] transition-all",
                      isMe && "ring-2 ring-[#004D40]/20"
                    )}
                  >
                    <div className="glass-card-inner !p-3 flex items-center gap-3">
                       <span className="w-6 text-[10px] font-black text-[#004D40]/20 text-center">{rank}</span>
                       <Avatar className="h-10 w-10 border border-white shadow-sm">
                          <AvatarImage src={entry.photoURL || undefined} className="object-cover" />
                          <AvatarFallback className="bg-[#004D40]/5 text-[#004D40] font-black text-xs">
                             {getInitials(entry.displayName)}
                          </AvatarFallback>
                       </Avatar>
                       <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-black text-[#004D40] truncate">
                            {entry.displayName}
                            {isMe && <span className="ml-2 text-[8px] bg-[#004D40] text-white px-1 rounded">{tGlobal('DIG')}</span>}
                          </h4>
                          <p className="text-[9px] font-bold text-[#004D40]/30 uppercase tracking-widest">
                            {entry.plan} {tGlobal('års plan')} • {entry.frequency} {tGlobal('dage/uge')}
                          </p>
                       </div>
                       <div className="text-right">
                          <span className="text-sm font-display text-[#004D40] block">{val}</span>
                          <span className="text-[8px] font-black uppercase text-[#004D40]/30 tracking-widest leading-none">
                            {filter === 'streak' ? tGlobal('Pts') : tGlobal('Score')}
                          </span>
                       </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Sticky Bottom Row for User */}
      {me && myRank > 3 && !loading && (
        <div className="sticky bottom-4 z-[40] px-6">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-[#004D40] text-white rounded-3xl p-4 shadow-2xl flex items-center gap-3 border border-white/20"
          >
             <div className="h-10 w-10 rounded-2xl bg-white/10 flex items-center justify-center font-display text-lg text-[#DEA93E]">
                #{myRank}
             </div>
             <div className="flex-1">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60">{tGlobal('Din placering')}</p>
                <h4 className="font-display text-base">{tGlobal('Fortsæt det gode arbejde!')}</h4>
             </div>
             <div className="text-right">
                <span className="text-lg font-display block">
                  {filter === 'monthly' ? me.monthlyScore : filter === 'allTime' ? me.allTimeScore : me.streakPoints}
                </span>
                <span className="text-[8px] font-black uppercase opacity-60">
                   {filter === 'streak' ? tGlobal('Streak Pts') : tGlobal('Hifz Score')}
                </span>
             </div>
          </motion.div>
        </div>
      )}

      <div className="mt-12 opacity-50">
        <IslamicDivider />
      </div>
    </div>
  );
}
