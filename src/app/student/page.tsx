'use client';

// All data is fetched client-side. Force static = serve from CDN, no cold starts.
export const dynamic = 'force-static';

import { useUser, useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { cn } from '@/lib/utils';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useEffect, Suspense, useMemo, useRef } from 'react';
import { collection, query, orderBy, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { BookOpen, FileText, ArrowLeft, MessageSquare } from 'lucide-react';
import HomeworkReadingPage from './homework-reading/page';
import ViewHomeworkPage from './view-homework/page';
import { useView } from '@/context/ViewContext';
import { QuranDataProvider, useQuranData } from '@/context/QuranDataContext';
import ProfileSettings from '@/components/profile/ProfileSettings';
import MembershipSettings from '@/components/profile/MembershipSettings';
import QuranReader from '@/components/quran/QuranReader';
import QuranIndex from '@/components/quran/QuranIndex';
import Announcements from '@/components/announcements/Announcements';
import { useLanguage, type Language } from '@/context/LanguageContext';
import ChatView from '@/components/chat/ChatView';
import { useAnnouncementsFeed } from '@/hooks/use-announcements-feed';
import { useHomeworkReadingData } from '@/hooks/use-homework-reading-data';
import { useGlobalTranslation } from '@/hooks/useGlobalTranslation';
import { useDashboardPreloader } from '@/hooks/use-dashboard-preloader';
import type { Assignment } from '@/types';
import { calculateCompletedPages, calculateCompletedSurahs, calculateCompletedJuz, calculateStreakPoints } from '@/lib/student-logic';
import { Trophy, Map as MapIcon, ChevronRight, Users } from 'lucide-react';
import QuranProgressMap from '@/components/student/QuranProgressMap';
import FairScoreCard from '@/components/student/FairScoreCard';
import PlanForecastCard from '@/components/student/PlanForecastCard';
import AchievementBanner from '@/components/student/AchievementBanner';
import AbsenceRegistration from '@/components/student/AbsenceRegistration';
import WelcomeCard from '@/components/student/WelcomeCard';
import EvaluationHeatmap from '@/components/student/EvaluationHeatmap';
import HifdhJourneyPath from '@/components/student/HifdhJourneyPath';
import Leaderboard from '@/components/student/Leaderboard';
import LeaderboardPreview from '@/components/student/LeaderboardPreview';
import IslamicDivider from '@/components/ui/IslamicDivider';
import QuranContinueCard from '@/components/student/QuranContinueCard';
import { motion, AnimatePresence } from 'framer-motion';
import { useSwipeBack } from '@/hooks/use-swipe-back';
import { SectionLabel, GoldStatRow, WavingHand, UpwardShootingStars } from '@/components/ui/primitives';
import { getDailyVerse } from '@/lib/daily-verses';



import QuranFontPreloader from '@/components/quran/QuranFontPreloader';

function StudentDashboard() {
  const { user, loading: isUserLoading } = useUser();
  const { profile } = useUserProfile();
  const { firestore } = useFirebase();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  
  useAnnouncementsFeed();
  useHomeworkReadingData();
  
  const { tGlobal } = useGlobalTranslation();
  const { language } = useLanguage();
  const { view, setView, goBack, quranPage, navigateToQuranPage, setIsSubView, isSubView } = useView();
  useDashboardPreloader();

  useEffect(() => {
    const viewIntent = searchParams.get('view');
    if (viewIntent === 'homework-reading') {
      setView('homework-reading');
      const params = new URLSearchParams(searchParams.toString());
      params.delete('view');
      const newQuery = params.toString() ? `?${params.toString()}` : '';
      router.replace(`${pathname}${newQuery}`);
    }
  }, [searchParams, setView, router, pathname]);

  const assignmentsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(collection(firestore, 'students', user.uid, 'assignments'), orderBy('assignedAt', 'desc'));
  }, [user, firestore]);
  
  const { data: assignments, isLoading: areAssignmentsLoading } = useCollection<Assignment>(assignmentsQuery);

  const lastPage = profile?.lastReadPage || 1;
  const completedPages = useMemo(() => calculateCompletedPages(assignments || []), [assignments]);
  const completedSurahs = useMemo(() => calculateCompletedSurahs(assignments || []), [assignments]);
  const completedJuz = useMemo(() => calculateCompletedJuz(assignments || []), [assignments]);

  const isTopLevel = useMemo(() => {
    const topLevelViews = ['overview', 'quran-index', 'announcements', 'profile', 'chat'];
    return topLevelViews.includes(view);
  }, [view]);

  useEffect(() => {
    if (view === 'chat') return; 
    const isSub = !isTopLevel;
    if (isSubView !== isSub) {
      setIsSubView(isSub);
    }
  }, [isTopLevel, setIsSubView, view]);

  useSwipeBack({
    onBack: () => setView('overview'),
    enabled: !isTopLevel && view !== 'quran-reader',
  });

  useEffect(() => {
    if (!firestore || !user || !profile || !assignments) return;
    const syncLeaderboard = async () => {
      try {
        const { calculateLeaderboardScore, calculateStreakPoints, calculateCompletedPages: calcPages } = await import('@/lib/student-logic');
        const leaderboardDocRef = doc(firestore, 'leaderboard', user.uid);

        if (profile.hideFromLeaderboard) {
          // deleteDoc uses admin equivalent path — allowed via Cloud Function or remove client call
          // Since rules now block student writes, we call a server function instead
          const { httpsCallable } = await import('firebase/functions');
          const { getFunctions } = await import('firebase/functions');
          const fns = getFunctions();
          const syncFn = httpsCallable(fns, 'syncLeaderboard');
          await syncFn({ hide: true }).catch(() => null); // Fire-and-forget
          return;
        }

        const monthlyScore = calculateLeaderboardScore(assignments, profile.hifzPlan || '3', profile.sessionsPerWeek || 3, 'month');
        const allTimeScore = calculateLeaderboardScore(assignments, profile.hifzPlan || '3', profile.sessionsPerWeek || 3, 'all');
        const streakPoints = calculateStreakPoints(assignments);
        const name = profile.fullName || profile.displayName || tGlobal('Elev');

        // Call server-side function — rules now block direct client writes to /leaderboard
        const { httpsCallable } = await import('firebase/functions');
        const { getFunctions } = await import('firebase/functions');
        const fns = getFunctions();
        const syncFn = httpsCallable(fns, 'syncLeaderboard');
        await syncFn({ 
          displayName: name, 
          photoURL: profile.photoURL || null,
          plan: profile.hifzPlan || '3', 
          frequency: profile.sessionsPerWeek || 3,
          monthlyScore, allTimeScore, streakPoints 
        }).catch(() => null); // Fire-and-forget, non-critical
      } catch (err) { /* Non-critical, fail silently */ }
    };
    const delay = view === 'leaderboard' ? 500 : 5000;
    const timeout = setTimeout(syncLeaderboard, delay);
    return () => clearTimeout(timeout);
  }, [firestore, user, profile?.id, profile?.hideFromLeaderboard, assignments?.length, view]);

  useEffect(() => {
    if (!isUserLoading && !user) router.replace('/');
  }, [user, isUserLoading, router]);

  const BackButton = () => (
    <Button variant="ghost" size="icon" onClick={() => { setView('overview'); }}>
      <ArrowLeft className="h-5 w-5" />
    </Button>
  );

  const QuranReaderBackButton = () => (
    <Button variant="ghost" size="icon" onClick={goBack}>
      <ArrowLeft className="h-5 w-5" />
    </Button>
  );

  const renderContent = () => {
    switch (view) {
      case 'quran-reader':
        return quranPage ? (
          <QuranReader initialPage={quranPage} BackButton={QuranReaderBackButton} />
        ) : null;
      case 'quran-index':
        return (
          <QuranIndex onNavigate={navigateToQuranPage} BackButton={BackButton} />
        );
      case 'homework-reading':
        return <HomeworkReadingPage BackButton={BackButton} />;
      case 'view-homework':
        return <ViewHomeworkPage BackButton={BackButton} assignments={assignments} isLoading={areAssignmentsLoading} />;
      case 'profile':
        return < ProfileSettings />;
      case 'membership':
        return <MembershipSettings />;
      case 'announcements':
        return <Announcements BackButton={BackButton} />;
      case 'chat':
        return <ChatView />;
      case 'leaderboard':
        return <Leaderboard onBack={() => setView('overview')} />;
      case 'progress-journey':
        return (
          <div className="flex-1 w-full max-w-lg mx-auto pb-40 px-6 pt-12 space-y-8">
            <div className="flex items-center gap-4 mb-2">
                <button 
                  onClick={() => setView('overview')}
                  className="h-12 w-12 rounded-2xl bg-card dark:bg-white/10 backdrop-blur-md flex items-center justify-center shadow-lg border border-border"
                >
                    <ChevronRight className="h-6 w-6 text-primary rotate-180" />
                </button>
                <div>
                    <h1 className="text-3xl font-display text-primary">{tGlobal('Hifz Rejse')}</h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">{tGlobal('Din personlige oversigt')}</p>
                </div>
            </div>

            <div className="section-label">{tGlobal('Quran kortet')}</div>
            <QuranProgressMap 
              completedPages={completedPages} 
              completedSurahs={completedSurahs}
              completedJuz={completedJuz}
              className="mb-12"
            />

            <IslamicDivider />

            <HifdhJourneyPath 
              completedPages={completedPages.size}
              className="mb-12"
            />

            <IslamicDivider />

            <div className="section-label">{tGlobal('Prognose')}</div>
            <PlanForecastCard 
              assignments={assignments || []}
              courseDuration={profile?.courseDuration || '3'}
            />

          </div>
        );
      case 'overview':
      default:
        const totalPagesCount = completedPages.size;

        return (
          <div className="flex-1 w-full max-w-lg mx-auto pb-40">
            <QuranFontPreloader 
              assignments={assignments || []} 
              lastReadPage={profile?.lastReadPage || 1} 
            />
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="relative"
            >
              <div className="px-8 pt-20 pb-10 relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <motion.div 
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className="flex items-center gap-2 mb-1"
                    >
                      <p className="text-primary/40 text-sm font-bold">
                        {language === 'ar' ? "السلام عليكم " : "Assalamu Alaikum "}
                        <WavingHand />
                      </p>
                    </motion.div>
                    <motion.h1 
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.1 }}
                      className="text-3xl font-display text-primary dark:text-foreground tracking-tight"
                    >
                      {profile?.displayName?.split(' ')[0] || tGlobal('Elev')}
                    </motion.h1>
                  </div>
                  
                  <motion.div 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setView('profile')}
                  className="h-14 w-14 lg:h-16 lg:w-16 rounded-[24px] border-4 border-border dark:border-white/20 shadow-2xl overflow-hidden relative group cursor-pointer shrink-0"
                  >
                    <img src={profile?.photoURL || null} alt="" className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                  </motion.div>
                </div>

                <GoldStatRow
                  className="mt-2"
                  stats={[
                    { label: tGlobal('Sider'), value: totalPagesCount },
                    { label: tGlobal('Mål'), value: 604 },
                    { label: tGlobal('Procent'), value: `${((totalPagesCount / 604) * 100).toFixed(1)}%` },
                  ]}
                />
              </div>

              <div className="px-6 space-y-8 pb-32">
                <AchievementBanner 
                   totalPages={totalPagesCount}
                   streak={calculateStreakPoints(assignments || [])}
                   reviewCount={assignments?.filter(a => a.type === 'moraja3a')?.length || 0}
                />

                <div className={cn("glass-card overflow-visible group animate-glass-border shadow-2xl")}>
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => setView('homework-reading')}
                    className="glass-card-inner !p-10 cursor-pointer"
                  >
                    <div className="flex justify-between items-center relative z-10">
                        <div className="space-y-1">
                             <p className="text-primary/40 text-[10px] font-black uppercase tracking-[0.25em]">{tGlobal('Session')}</p>
                             <h2 className="text-4xl font-display text-primary dark:text-foreground tracking-tight">{tGlobal('Læs Lektie')}</h2>
                             <p className="text-[10px] font-bold text-accent uppercase tracking-widest mt-1">{tGlobal('Dagens Kø & Evaluering')}</p>
                             
                             <motion.div className="mt-10 flex items-center gap-3 text-primary font-black text-[11px] uppercase tracking-widest">
                                <span>{tGlobal('Tilmeld Kø')}</span>
                               <ChevronRight className="h-4 w-4 bg-foreground text-background rounded-full p-0.5" />
                            </motion.div>
                        </div>
                        
                        <motion.div
                          animate={{ y: [0, -8, 0] }}
                          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                          className="w-24 h-24 relative"
                        >
                          <Users className="h-full w-full text-primary drop-shadow-2xl opacity-10 absolute scale-125 blur-sm" />
                          <Users className="h-full w-full text-primary drop-shadow-2xl relative z-10" />
                        </motion.div>
                    </div>
                  </motion.div>
                </div>

                <div className="space-y-4">
                    <div className="section-label">{tGlobal('Hurtig adgang')}</div>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { id: 'view-homework', title: tGlobal('Lektie Liste'), icon: <FileText className="h-6 w-6 text-orange-600 dark:text-orange-400" />, desc: tGlobal('Alle opgaver') },
                            { id: 'progress-journey', title: tGlobal('Hifz Rejse'), icon: <MapIcon className="h-6 w-6 text-primary" />, desc: tGlobal('Se dit kort') },
                            { id: 'quran-index', title: tGlobal('quran'), icon: <BookOpen className="h-6 w-6 text-blue-600 dark:text-blue-400" />, desc: tGlobal('Find Surah') },
                            { id: 'leaderboard', title: tGlobal('Leaderboard'), icon: <Trophy className="h-6 w-6 text-accent" />, desc: tGlobal('Vind over venner') }
                        ].map((feat, idx) => (
                            <motion.div 
                              key={feat.id}
                              whileHover={{ y: -5 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setView(feat.id as any)}
                              className="glass-card shadow-xl cursor-pointer relative overflow-hidden group border-white/20 dark:border-white/10"
                            >
                                <div className="glass-card-inner !p-6 flex flex-col items-center justify-center text-center gap-3">
                                    <UpwardShootingStars />
                                    <div className="p-3 bg-primary/5 dark:bg-white/5 rounded-2xl relative z-10">{feat.icon}</div>
                                    <div className="relative z-10">
                                        <h3 className="font-black text-sm text-primary dark:text-white leading-tight tracking-tight">{feat.title}</h3>
                                        <p className="text-[10px] text-primary/40 dark:text-white/40 font-bold uppercase tracking-wider mt-0.5">{feat.desc}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <IslamicDivider />

                <QuranContinueCard />

                {!profile?.hideFromLeaderboard && (
                  <LeaderboardPreview userId={user?.uid || ''} setView={setView} />
                )}

                <IslamicDivider />

                <div className="section-label">{tGlobal('Dagens Vers')}</div>
                <motion.div className="glass-card shadow-sm">
                   <div className="glass-card-inner text-center !p-10 relative overflow-hidden">
                        <div className="absolute inset-0 opacity-[0.03] grayscale pointer-events-none">
                            <div className="absolute inset-0 bg-[url('https://i.postimg.cc/xC74tT1V/flat-arabic-pattern-background-79603-1826.avif')] bg-repeat bg-center scale-150" />
                        </div>
                        {(() => {
                           const dailyVerse = getDailyVerse();
                           return (
                             <div className="relative z-10">
                               <p className="text-3xl font-quran text-primary mb-6 leading-relaxed">{dailyVerse.arabic}</p>
                               <p className="text-xs text-primary/60 italic font-medium leading-relaxed mb-4">"{tGlobal(dailyVerse.translationKey)}"</p>
                               <div className="h-[1px] w-12 bg-accent/20 mx-auto mb-4" />
                               <p className="text-[10px] font-black uppercase text-accent tracking-[0.2em]">Surah {dailyVerse.reference}</p>
                             </div>
                           )
                        })()}
                   </div>
                </motion.div>
              </div>
            </motion.div>
          </div>
        );
    }
  };
  
  // Render optimistically if we have a cached profile — don't block on auth loading.
  // The redirect guard (useEffect above) handles the unauthenticated case async.
  if (!isUserLoading && !user) return null;
  if (!profile) return null;

  return (
    <div className="min-h-screen bg-background font-sans pb-20 overflow-x-hidden">
        <AnimatePresence mode="wait">
        <motion.main
          key={view}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          className="relative z-10 min-h-screen flex flex-col pt-safe"
        >
          {renderContent()}
        </motion.main>
      </AnimatePresence>
    </div>
  );
}

export default function StudentDashboardPage() {
  return (
    <Suspense fallback={null}>
      <QuranDataProvider>
        <StudentDashboard />
      </QuranDataProvider>
    </Suspense>
  );
}
