'use client';

// All data is fetched client-side. Force static = serve from CDN, no cold starts.
export const dynamic = 'force-static';

import { useUser, useFirebase } from '@/firebase';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useRouter } from 'next/navigation';
import { useEffect, Suspense, useMemo, useState, type FormEvent } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BookUp, Search, ArrowLeft, ChevronRight, MessageSquare, FileText, BookOpen, Users, Bell, Quote, UserPlus, Loader2, PlusCircle } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import TeacherHomeworkPage from './homework-reading/page';
import FindStudentPage from './find-student/page';
import { Button } from '@/components/ui/button';
import { cn, getInitials } from '@/lib/utils';
import ProfileSettings from '@/components/profile/ProfileSettings';
import MembershipSettings from '@/components/profile/MembershipSettings';
import { useView } from '@/context/ViewContext';
import Announcements from '@/components/announcements/Announcements';
import { useLanguage, type Language } from '@/context/LanguageContext';
import { QuranDataProvider } from '@/context/QuranDataContext';
import QuranReader from '@/components/quran/QuranReader';
import QuranIndex from '@/components/quran/QuranIndex';
import ChatView from '@/components/chat/ChatView';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAnnouncementsFeed } from '@/hooks/use-announcements-feed';
import { useTeacherReadingData } from '@/hooks/use-teacher-reading-data';
import { useGlobalTranslation } from '@/hooks/useGlobalTranslation';
import { useToast } from '@/hooks/use-toast';
import { useDashboardPreloader } from '@/hooks/use-dashboard-preloader';
import { motion, AnimatePresence } from 'framer-motion';
import { SectionLabel, WavingHand, IslamicDivider, UpwardShootingStars } from '@/components/ui/primitives';
import { getDailyVerse } from '@/lib/daily-verses';
import QuranContinueCard from '@/components/student/QuranContinueCard';
import { useSwipeBack } from '@/hooks/use-swipe-back';


/**
 * Indlæser alle banner-billeder i baggrunden for at sikre lynhurtig visning.
 */
function FeedImagePrewarmer() {
  const { feedItems } = useAnnouncementsFeed();
  const bannerUrls = useMemo(() => 
    feedItems?.map(item => item.imageUrl).filter((url): url is string => !!url) || []
  , [feedItems]);

  if (bannerUrls.length === 0) return null;

  return (
    <div style={{ display: 'none', visibility: 'hidden', width: 0, height: 0, position: 'absolute' }} aria-hidden="true">
      {bannerUrls.map(url => <img key={url} src={url} alt="" />)}
    </div>
  );
}

import QuranFontPreloader from '@/components/quran/QuranFontPreloader';

function TeacherDashboard() {
  const { user, loading: isUserLoading } = useUser();
  const { profile } = useUserProfile();
  const { firestore } = useFirebase();
  const router = useRouter();
  const { view, setView, goBack, quranPage, navigateToQuranPage, setIsSubView } = useView();
  const { language } = useLanguage();
  const { tGlobal } = useGlobalTranslation();
  const { toast } = useToast();
  useDashboardPreloader();

  // Pre-approval form state (student only)
  const [paEmail, setPaEmail] = useState('');
  const [paPhone, setPaPhone] = useState('');
  const [paStudentNumber, setPaStudentNumber] = useState('');
  const [paCourseDuration, setPaCourseDuration] = useState('3 year');
  const [paGender, setPaGender] = useState<'man' | 'woman'>('man');
  const [paSubAmount, setPaSubAmount] = useState(400);
  const [paSubmitting, setPaSubmitting] = useState(false);

  const handlePreApproveStudent = async (e: FormEvent) => {
    e.preventDefault();
    if (!paEmail.trim() || !paEmail.includes('@')) {
      return;
    }
    setPaSubmitting(true);
    try {
      const userEmail = paEmail.toLowerCase().trim();
      await setDoc(doc(firestore, 'placeholders', userEmail), {
        email: userEmail,
        role: 'student',
        gender: paGender,
        phoneNumber: paPhone.trim() || null,
        studentNumber: paStudentNumber.trim() || null,
        courseDuration: paCourseDuration,
        subscriptionAmount: paSubAmount,
      });
      setPaEmail('');
      setPaPhone('');
      setPaStudentNumber('');
      setPaSubAmount(400);
      setView('overview');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Fejl', description: err?.message || 'Kunne ikke gemme godkendelse.' });
    } finally {
      setPaSubmitting(false);
    }
  };

  // Start background pre-fetching
  useAnnouncementsFeed();
  useTeacherReadingData(); // Pre-fetch teacher status and queue early


  const isTopLevel = useMemo(() => {
    const topLevelViews = ['overview', 'quran-index', 'announcements', 'profile', 'chat'];
    return topLevelViews.includes(view);
  }, [view]);

  useEffect(() => {
    setIsSubView(!isTopLevel);
  }, [isTopLevel, setIsSubView]);

  useSwipeBack({
    onBack: () => setView('overview'),
    enabled: !isTopLevel && view !== 'quran-reader',
  });

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.replace('/');
    }
  }, [user, isUserLoading, router]);

  const BackButton = () => (
    <Button variant="ghost" size="icon" onClick={() => setView('overview')}>
      <ArrowLeft className="h-5 w-5" />
    </Button>
  );

  const QuranReaderBackButton = () => (
    <Button variant="ghost" size="icon" onClick={goBack}>
      <ArrowLeft className="h-5 w-5" />
    </Button>
  );

  // Render optimistically using cached profile — don't wait for auth to fully resolve.
  if (!isUserLoading && !user) return null;
  if (!profile) return null;

  const { teacher, queue } = useTeacherReadingData();

  const renderContent = () => {
    switch (view) {
      case 'chat':
        return <ChatView />;
      case 'quran-reader':
        return quranPage ? (
          <QuranReader initialPage={quranPage} BackButton={QuranReaderBackButton} />
        ) : null;
      case 'quran-index':
        return (
          <QuranIndex onNavigate={navigateToQuranPage} BackButton={BackButton} />
        );
      case 'homework-reading':
        return <TeacherHomeworkPage setView={setView} />;
      case 'find-student':
        return <FindStudentPage setView={setView} BackButton={BackButton} />;
      case 'profile':
        return <ProfileSettings />;
      case 'membership':
        return <MembershipSettings />;
      case 'announcements':
        return <Announcements BackButton={BackButton} />;
      case 'tilfoej-elev':
        return (
          <div className="min-h-screen px-6 pt-16 pb-32 max-w-lg mx-auto">
            <div className="flex items-center gap-4 mb-10">
              <BackButton />
              <div>
                <h1 className="text-3xl font-display text-primary">{tGlobal('Tilføj elev')}</h1>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">{tGlobal('Forhåndsgodkend ny elev')}</p>
              </div>
            </div>
            <Card className="rounded-[32px] border border-border bg-card shadow-2xl overflow-hidden">
              <CardContent className="p-8">
                <form onSubmit={handlePreApproveStudent} className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">{tGlobal('Email')}</Label>
                    <Input type="email" value={paEmail} onChange={(e) => setPaEmail(e.target.value)}
                      placeholder="bruger@eksempel.dk"
                      className="h-14 rounded-2xl border-border bg-muted px-5 text-lg" required />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">{tGlobal('Telefonnummer')}</Label>
                    <Input type="tel" value={paPhone} onChange={(e) => setPaPhone(e.target.value)}
                      placeholder="+45"
                      className="h-14 rounded-2xl border-border bg-muted px-5 text-lg" />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">{tGlobal('Køn')}</Label>
                    <div className="h-14 flex items-center px-5 rounded-2xl border border-border bg-muted">
                      <RadioGroup value={paGender} onValueChange={(v) => setPaGender(v as 'man' | 'woman')} className="flex gap-6">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="man" id="pa-man" />
                          <Label htmlFor="pa-man" className="font-semibold cursor-pointer">{tGlobal('Mand')}</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="woman" id="pa-woman" />
                          <Label htmlFor="pa-woman" className="font-semibold cursor-pointer">{tGlobal('Kvinde')}</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">{tGlobal('Elevnummer')}</Label>
                    <Input value={paStudentNumber} onChange={(e) => setPaStudentNumber(e.target.value)}
                      placeholder={tGlobal('Fx. 12345')}
                      className="h-14 rounded-2xl border-border bg-muted px-5" />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">{tGlobal('Kursusforløb')}</Label>
                    <Select onValueChange={setPaCourseDuration} value={paCourseDuration}>
                      <SelectTrigger className="h-14 rounded-2xl border-border bg-muted px-5">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1.5 year">{tGlobal('1,5 år')}</SelectItem>
                        <SelectItem value="3 year">{tGlobal('3 år')}</SelectItem>
                        <SelectItem value="5 year">{tGlobal('5 år')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">{tGlobal('Abonnement (DKK)')}</Label>
                    <Input type="number" value={paSubAmount} onChange={(e) => setPaSubAmount(Number(e.target.value))}
                      className="h-14 rounded-2xl border-border bg-muted px-5" />
                  </div>

                  <Button type="submit" disabled={paSubmitting}
                    className="w-full h-16 rounded-[20px] text-lg font-bold bg-primary hover:bg-primary/90 text-white shadow-[0_10px_30px_rgba(25,118,112,0.25)] transition-all active:scale-[0.98]">
                    {paSubmitting ? <Loader2 className="mr-2 h-6 w-6 animate-spin" /> : <PlusCircle className="mr-2 h-6 w-6" />}
                    {tGlobal('Godkend Bruger')}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        );
      case 'overview':
      default:
        return (
          <div className="flex-1 w-full max-w-lg mx-auto pb-40">
            <QuranFontPreloader lastReadPage={profile?.lastReadPage || 1} />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="relative"
            >
              <div className="px-8 pt-20 pb-10 flex items-center justify-between relative z-10">
                <div>
                  <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="flex items-center gap-2 mb-1"
                  >
                    <p className="text-primary/40 text-sm font-bold">
                       {language === 'ar' ? 'السلام عليكم ' : 'Assalamu Alaikum '}
                       <WavingHand />
                     </p>
                  </motion.div>
                  <motion.h1
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-3xl font-display text-primary tracking-tight"
                  >
                    {profile?.displayName?.split(' ')[0] || tGlobal('Lærer')}
                  </motion.h1>
                </div>
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setView('profile')}
                  className="h-14 w-14 lg:h-16 lg:w-16 rounded-[24px] border-4 border-white shadow-2xl overflow-hidden relative group cursor-pointer shrink-0"
                >
                  <img src={profile?.photoURL || ''} alt="" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                </motion.div>
              </div>

              <div className="px-6 space-y-8 pb-32">
                <div className={cn("glass-card overflow-visible group animate-glass-border shadow-2xl")}>
                    <div className="glass-card-inner !p-7">
                        <div className="flex items-center justify-between gap-6">
                            <div className="space-y-1">
                                <p className="text-primary/40 dark:text-white/40 text-[10px] font-black uppercase tracking-[0.25em]">{tGlobal('Session')}</p>
                                <h2 className="text-3xl font-display text-primary dark:text-white tracking-tight">{tGlobal('Lektiehjælp')}</h2>
                                <p className="text-[10px] font-bold text-accent uppercase tracking-widest mt-1">{tGlobal('Administrer din elev kø')}</p>
                                
                                <motion.div className="mt-6 flex items-center gap-3 text-primary dark:text-white font-black text-[11px] uppercase tracking-widest">
                                    <span>{tGlobal('Åbn Kø')}</span>
                                    <div className="h-8 w-8 rounded-full bg-primary dark:bg-white/10 flex items-center justify-center transition-transform shadow-lg shadow-primary/10 group-hover:translate-x-1">
                                        <ChevronRight className="h-4 w-4 text-white" />
                                    </div>
                                </motion.div>
                            </div>
                            
                            <div className="h-24 w-24 bg-primary/5 dark:bg-white/5 rounded-[32px] flex items-center justify-center relative shadow-inner overflow-hidden">
                                <Users className="h-10 w-10 text-primary/20 dark:text-white/20" />
                                <div className="absolute inset-0 bg-gradient-to-br from-accent/10 to-transparent" />
                            </div>
                        </div>
                        <button onClick={() => setView('homework-reading')} className="absolute inset-0 z-20 cursor-pointer" aria-label="Start Lektiehjælp" />
                    </div>
                </div>

                <div className="space-y-4">
                  <SectionLabel>{tGlobal('Hurtige handlinger')}</SectionLabel>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { id: 'find-student', title: tGlobal('Find Elev'), icon: <Search className="h-6 w-6 text-primary" />, desc: tGlobal('Søg studerende') },
                            { id: 'chat', title: tGlobal('Beskeder'), icon: <MessageSquare className="h-6 w-6 text-orange-600 dark:text-orange-400" />, desc: tGlobal('Chat med elever') },
                            { id: 'announcements', title: tGlobal('Opslag'), icon: <Bell className="h-6 w-6 text-blue-600 dark:text-blue-400" />, desc: tGlobal('Fælles opslag') },
                            { id: 'tilfoej-elev', title: tGlobal('Tilføj elev'), icon: <UserPlus className="h-6 w-6 text-violet-600 dark:text-violet-400" />, desc: tGlobal('Forhåndsgodkend ny elev') }
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
                                    <div className="p-3 bg-white/40 dark:bg-white/5 rounded-2xl relative z-10 shadow-sm border border-white/20">{feat.icon}</div>
                                    <div className="relative z-10">
                                        <h3 className="font-black text-sm text-primary dark:text-white leading-tight tracking-tight">{feat.title}</h3>
                                        <p className="text-[10px] text-primary/40 dark:text-white/40 font-bold uppercase tracking-wider mt-0.5">{feat.desc}</p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>

                <QuranContinueCard />

                <div className="mt-4">
                  <SectionLabel>{tGlobal('Dagens Vers')}</SectionLabel>
                  <motion.div className="glass-card shadow-sm">
                    <div className="glass-card-inner text-center !p-10 relative overflow-hidden">
                      <div className="absolute inset-0 opacity-[0.03] grayscale pointer-events-none">
                        <div className="absolute inset-0 bg-[url('https://i.postimg.cc/xC74tT1V/flat-arabic-pattern-background-79603-1826.avif')] bg-cover" />
                      </div>
                      
                      {(() => {
                        const dailyVerse = getDailyVerse();
                        return (
                          <div className="relative z-10 space-y-6">
                            <p className="font-quran text-3xl text-primary leading-relaxed">
                              {dailyVerse.arabic}
                            </p>
                            <p className="text-primary/60 text-xs italic font-medium leading-relaxed max-w-xs mx-auto">
                               "{tGlobal(dailyVerse.translationKey)}"
                            </p>
                            
                            <div className="h-[1px] w-12 bg-accent/20 mx-auto" />
                            
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Surah {dailyVerse.reference}</p>
                          </div>
                        );
                      })()}
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-transparent dark:bg-transparent font-sans pb-20">
      <FeedImagePrewarmer />
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

export default function TeacherDashboardPage() {
  return (
    <Suspense fallback={null}>
      <QuranDataProvider>
        <TeacherDashboard />
      </QuranDataProvider>
    </Suspense>
  );
}
