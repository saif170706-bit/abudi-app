'use client';

import { Home, MessageSquare, BookOpen, LayoutList, Users, Clock, PlusSquare, Mail, LayoutGrid } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useView } from '@/context/ViewContext';
import AnnouncementIcon from './announcements/AnnouncementIcon';
import MessageBadge from './chat/MessageBadge';
import { useLanguage } from '@/context/LanguageContext';
import { useGlobalTranslation } from '@/hooks/useGlobalTranslation';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useHaptic } from 'use-haptic';

export function Navbar() {
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const { profile } = useUserProfile();
  const { view, setView, isSubView } = useView();
  const { triggerHaptic } = useHaptic();
  const { tGlobal } = useGlobalTranslation();

  useEffect(() => { setIsClient(true); }, []);
  if (!isClient) return null;

  if (isSubView) return null;

  const isAdmin = profile?.role === 'admin';

  // Active tab mapping
  const isHomeActive         = view === 'overview';
  const isAnnouncementsActive = view === 'announcements' || view === 'admin-posts';
  const isQuranActive        = view === 'quran-index' || view === 'quran-reader';
  const isProfileActive      = view === 'profile' || view === 'membership';
  const isChatActive         = view === 'chat';
  const isMembersActive      = view === 'admin-members';
  const isAbsenceActive      = view === 'admin-absence';
  const isMailActive         = view === 'admin-mail';

  // ── Tab component — meets Apple/Google 44×44pt minimum touch target ─────
  const Tab = ({
    active,
    label,
    onClick,
    icon,
  }: {
    active: boolean;
    label: string;
    onClick: () => void;
    icon: React.ReactNode;
  }) => {
    const handleClick = useCallback(() => {
      triggerHaptic();
      onClick();
    }, [onClick]);

    return (
      <motion.button
        whileTap={{ scale: 0.88 }}
        type="button"
        onClick={handleClick}
        // Minimum 44×44pt touch target per HIG / Material guidelines
        className={cn(
          'flex flex-col items-center justify-center gap-0.5 transition-colors relative',
          'min-h-[44px] min-w-[44px] flex-1',
          active ? 'text-accent' : 'text-white/40'
        )}
        aria-label={label}
        aria-current={active ? 'page' : undefined}
      >
        {/* Active dot indicator */}
        <AnimatePresence>
          {active && (
            <motion.span
              layoutId="navActiveDot"
              className="absolute top-0 h-[3px] w-6 bg-accent rounded-full"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              exit={{ opacity: 0, scaleX: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            />
          )}
        </AnimatePresence>

        <span className="relative grid h-7 w-7 place-items-center">
          {icon}
        </span>
        <span className={cn(
          'text-[9px] font-black uppercase tracking-widest leading-none',
          active ? 'text-accent' : 'text-white/40'
        )}>
          {label}
        </span>
      </motion.button>
    );
  };

  // ── Admin Navbar ───────────────────────────────────────────────────────
  if (isAdmin) {
    const AdminHome = () => {
      const handleClick = useCallback(() => {
        triggerHaptic();
        setView('overview');
      }, []);

      return (
        <button
          type="button"
          onClick={handleClick}
          className="flex flex-col items-center justify-center gap-1 min-h-[44px] min-w-[44px] active:scale-[0.96] transition-transform"
          aria-label={tGlobal('home')}
          aria-current={isHomeActive ? 'page' : undefined}
        >
          <span className={`grid h-11 w-[68px] place-items-center rounded-2xl shadow-[0_10px_22px_rgba(17,18,20,0.18)] ${
            isHomeActive ? 'bg-[#1F2937]' : 'bg-black/[0.06]'
          }`}>
            <Home className={`h-6 w-6 ${isHomeActive ? 'text-white' : 'text-[#6B7280]'}`} />
          </span>
          <span className={`text-[12px] font-semibold leading-none ${
            isHomeActive ? 'text-foreground' : 'text-[#6B7280]'
          }`}>
            {tGlobal('home')}
          </span>
        </button>
      );
    };

    const AdminTab = ({ active, label, onClick, icon }: { active: boolean; label: string; onClick: () => void; icon: React.ReactNode }) => {
      const handleClick = useCallback(() => {
        triggerHaptic();
        onClick();
      }, [onClick]);

      return (
        <motion.button
          whileTap={{ scale: 0.88 }}
          type="button"
          onClick={handleClick}
          className={cn(
            'flex flex-col items-center justify-center gap-1 min-h-[44px] min-w-[44px] flex-1 transition-colors',
            active ? 'text-accent' : 'text-[#6B7280]'
          )}
          aria-label={label}
          aria-current={active ? 'page' : undefined}
        >
          <span className="relative grid h-7 w-7 place-items-center">{icon}</span>
          <span className={cn('text-[9px] font-black uppercase tracking-widest', active ? 'text-accent' : 'text-[#6B7280]')}>
            {label}
          </span>
        </motion.button>
      );
    };

    return (
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/70"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 10px)' }}
      >
        <div className="mx-auto max-w-md px-3">
          <div className="h-[86px] rounded-3xl border border-border bg-card shadow-[0_10px_30px_rgba(17,18,20,0.10)]">
            <div className="grid h-full grid-cols-5 items-center px-2">
              <AdminTab active={isMembersActive} label={tGlobal('members')} onClick={() => setView('admin-members')} icon={<Users className="h-6 w-6" />} />
              <AdminTab active={isAbsenceActive} label={tGlobal('absence')} onClick={() => setView('admin-absence')} icon={<Clock className="h-6 w-6" />} />
              <AdminHome />
              <AdminTab active={isAnnouncementsActive} label={tGlobal('posts')} onClick={() => setView('admin-posts')} icon={<PlusSquare className="h-6 w-6" />} />
              <AdminTab active={isMailActive} label={tGlobal('mail')} onClick={() => setView('admin-mail')} icon={<Mail className="h-6 w-6" />} />
            </div>
          </div>
        </div>
      </nav>
    );
  }

  // ── Student / Teacher Navbar ───────────────────────────────────────────
  const HomeButton = () => {
    const handleClick = useCallback(() => {
      triggerHaptic();
      setView('overview');
    }, []);

    return (
      <motion.button
        whileHover={{ y: -4 }}
        whileTap={{ scale: 0.88 }}
        type="button"
        onClick={handleClick}
        className="flex flex-col items-center justify-center gap-1 -mt-4 min-h-[44px] min-w-[44px]"
        aria-label={tGlobal('home')}
        aria-current={isHomeActive ? 'page' : undefined}
      >
        <div className={cn(
          'h-14 w-14 rounded-[20px] flex items-center justify-center transition-all shadow-xl',
          isHomeActive
            ? 'bg-accent text-primary scale-110 shadow-accent/20'
            : 'bg-[#00332B] dark:bg-white/5 text-white/40 border border-white/5'
        )}>
          <Home className="h-7 w-7" />
        </div>
        <span className={cn('text-[9px] font-black uppercase tracking-widest mt-1', isHomeActive ? 'text-accent' : 'text-white/20 dark:text-white/40')}>
          {tGlobal('home')}
        </span>
      </motion.button>
    );
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-8 pt-2 bottom-nav"
    >
      <div className="mx-auto max-w-lg relative overflow-hidden rounded-[36px] bg-primary/80 dark:bg-black/40 backdrop-blur-3xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
        {/* Background Pattern Overlay */}
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none mix-blend-overlay">
          <div className="absolute inset-0 bg-[url('https://i.postimg.cc/xC74tT1V/flat-arabic-pattern-background-79603-1826.avif')] bg-repeat bg-center scale-150" />
        </div>

        <div className="grid h-[72px] grid-cols-5 items-center relative z-10 px-2">
          <Tab
            active={isAnnouncementsActive}
            label={tGlobal('notifications')}
            onClick={() => setView('announcements')}
            icon={
              profile && profile.role !== 'admin' ? (
                <AnnouncementIcon />
              ) : (
                <LayoutList className="h-5 w-5" />
              )
            }
          />

          <Tab
            active={isQuranActive}
            label={tGlobal('quran')}
            onClick={() => setView('quran-index')}
            icon={<BookOpen className="h-5 w-5" />}
          />

          <HomeButton />

          <Tab
            active={isChatActive}
            label={tGlobal('messages')}
            onClick={() => setView('chat')}
            icon={
              <div className="relative">
                <MessageSquare className="h-5 w-5" />
                <MessageBadge />
              </div>
            }
          />

          <Tab
            active={isProfileActive}
            label={tGlobal('more')}
            onClick={() => setView('profile')}
            icon={<LayoutGrid className="h-5 w-5" />}
          />
        </div>
      </div>
    </nav>
  );
}
