import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, Star, Sparkles, TrendingUp } from "lucide-react";
import { calculateAchievements, getLatestEarned, ACHIEVEMENTS, type AchievementStatus } from "@/lib/achievements";
import GoldBurst from "@/components/effects/GoldBurst";
import { cn } from "@/lib/utils";
import { useGlobalTranslation } from "@/hooks/useGlobalTranslation";
import { useLanguage } from "@/context/LanguageContext";

// ── Achievements panel (bottom sheet) ──────────────────────────────────
function AchievementsPanel({
  statuses, onClose,
}: {
  statuses: AchievementStatus[];
  onClose: () => void;
}) {
  const { tGlobal } = useGlobalTranslation();
  const { language } = useLanguage();

  // Task: Hide bottom nav when open
  useEffect(() => {
    const nav = document.querySelector('.bottom-nav') as HTMLElement;
    if (nav) {
      nav.style.visibility = 'hidden';
      nav.style.opacity = '0';
      nav.style.pointerEvents = 'none';
    }
    return () => {
      if (nav) {
        nav.style.visibility = 'visible';
        nav.style.opacity = '1';
        nav.style.pointerEvents = 'auto';
      }
    };
  }, []);

  const categories = useMemo(() => {
    const hifz = statuses.filter(s => s.achievement.category === 'memorization');
    const streaks = statuses.filter(s => s.achievement.category === 'streak');
    const other = statuses.filter(s => s.achievement.category !== 'memorization' && s.achievement.category !== 'streak');
    return [
      { id: 'hifz', label: tGlobal('Hifdh Milesten'), items: hifz, icon: <Star className="h-4 w-4" /> },
      { id: 'streak', label: tGlobal('Murajara Streaks'), items: streaks, icon: <TrendingUp className="h-4 w-4" /> },
      { id: 'other', label: tGlobal('Andre Mål'), items: other, icon: <Sparkles className="h-4 w-4" /> },
    ].filter(c => c.items.length > 0);
  }, [statuses, tGlobal]);

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 z-[101] rounded-t-[40px] shadow-2xl overflow-hidden bg-[#efebe1]"
        style={{ maxHeight: "85vh" }}
      >
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
            <div className="absolute inset-0 bg-[url('https://i.postimg.cc/xC74tT1V/flat-arabic-pattern-background-79603-1826.avif')] bg-cover" />
        </div>

        <div className="flex justify-center pt-3 pb-1 relative z-10">
          <div className="w-12 h-1.5 rounded-full bg-[#004D40]/10" />
        </div>

        <div className="px-6 pb-2 pt-4 relative z-10 flex justify-between items-start">
          <div>
            <p className="text-xl font-black text-[#004D40] tracking-tight">{tGlobal('Dine Præstationer')}</p>
            <p className="text-[11px] uppercase font-bold tracking-widest text-[#004D40]/40 mt-1">{tGlobal('Hifdh Journey Achievements')}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-[#004D40]/5 rounded-full"><X className="h-5 w-5 text-[#004D40]" /></button>
        </div>

        <div className="overflow-y-auto px-6 pb-20 relative z-10" style={{ maxHeight: "70vh" }}>
          {categories.map((cat) => (
            <div key={cat.id} className="mt-8 first:mt-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-[#004D40]/5 rounded-lg text-[#004D40]">{cat.icon}</div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#004D40]/40">{cat.label}</p>
              </div>
              <div className="space-y-4">
                {cat.items.map(s => {
                  const title = language === 'ar' ? s.achievement.titleAr : language === 'en' ? s.achievement.titleEn : language === 'so' ? s.achievement.titleSo : s.achievement.titleDa;
                  const desc = language === 'ar' ? s.achievement.descAr : language === 'en' ? s.achievement.descEn : language === 'so' ? s.achievement.descSo : s.achievement.descDa;
                  return (
                    <div key={s.achievement.id} className="flex items-center gap-4 py-2" style={{ opacity: s.earned ? 1 : 0.4 }}>
                      <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center text-3xl", s.earned ? "bg-[#DEA93E]/10" : "bg-neutral-200")}>
                        {s.achievement.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-[#004D40]">{title}</p>
                        <p className="text-xs text-[#004D40]/60 font-medium">{desc}</p>
                        {!s.earned && s.progress > 0 && (
                          <div className="mt-2.5">
                            <div className="h-1.5 rounded-full overflow-hidden bg-[#004D40]/5 w-full">
                              <motion.div className="h-full rounded-full bg-[#DEA93E]" initial={{ width: 0 }} animate={{ width: `${s.progress * 100}%` }} />
                            </div>
                            <p className="text-[9px] font-bold text-[#DEA93E] mt-1.5 uppercase tracking-wider">{s.currentValue} / {s.achievement.threshold}</p>
                          </div>
                        )}
                      </div>
                      {s.earned && <div className="h-8 w-8 rounded-full bg-[#DEA93E] flex items-center justify-center shadow-lg"><Star className="h-4 w-4 text-white fill-white" /></div>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </>
  );
}

// ── Main banner ────────────────────────────────────────────────────────
interface AchievementBannerProps {
  totalPages: number;
  streak: number;
  reviewCount: number;
}

export default function AchievementBanner({
  totalPages, streak, reviewCount,
}: AchievementBannerProps) {
  const { tGlobal } = useGlobalTranslation();
  const { language } = useLanguage();
  const [showPanel, setShowPanel] = useState(false);
  const statuses = useMemo(() => calculateAchievements(totalPages, streak, reviewCount), [totalPages, streak, reviewCount]);
  const latest = getLatestEarned(statuses);
  const dismissKey = latest ? `achievement_dismissed_${latest.achievement.id}` : "";

  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    if (!latest) return false;
    return localStorage.getItem(dismissKey) === "true";
  });

  const unearnedPreviews = statuses.filter(s => !s.earned).slice(0, 4);
  const earnedCount = statuses.filter(s => s.earned).length;

  const dismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(true);
    if (latest) localStorage.setItem(dismissKey, "true");
  };

  const openApp = () => {
    setDismissed(false);
    if (latest) localStorage.removeItem(dismissKey);
  };

  if (dismissed || !latest) {
    return (
      <motion.button
        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
        onClick={openApp}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-[90] bg-[#DEA93E] text-white p-3 pr-4 rounded-l-2xl shadow-2xl flex items-center gap-2 border border-white/20"
      >
        <Trophy className="h-5 w-5" />
        <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">{tGlobal('Dine Præstationer')}</span>
      </motion.button>
    );
  }

  const latestTitle = language === 'ar' ? latest.achievement.titleAr : language === 'en' ? latest.achievement.titleEn : language === 'so' ? latest.achievement.titleSo : latest.achievement.titleDa;

  return (
    <>
      <AnimatePresence>
        {showPanel && <AchievementsPanel statuses={statuses} onClose={() => setShowPanel(false)} />}
      </AnimatePresence>

      <motion.div
        layoutId="achievement-banner"
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="relative rounded-[32px] p-[2px] overflow-hidden group cursor-pointer shadow-xl mb-6"
        onClick={() => setShowPanel(true)}
      >
        <GoldBurst trigger={!!latest} />
        <div className="absolute inset-[-50%]" style={{ background: "conic-gradient(from 0deg, transparent 0%, transparent 60%, #DEA93E 75%, transparent 90%, transparent 100%)", animation: "spin 4s linear infinite" }} />

        <div className="relative z-10 w-full bg-[#004D40] rounded-[30px] p-4 text-white overflow-hidden">
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none"><div className="absolute inset-0 bg-[url('https://i.postimg.cc/xC74tT1V/flat-arabic-pattern-background-79603-1826.avif')] bg-cover" /></div>
            <div className="flex items-center gap-4 relative z-10">
                <div className="relative">
                    <motion.div initial={{ scale: 0.8 }} animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} className="h-16 w-16 bg-[#DEA93E]/20 rounded-2xl flex items-center justify-center text-4xl shadow-inner border border-[#DEA93E]/30">
                        {latest.achievement.icon}
                    </motion.div>
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#DEA93E] animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#DEA93E]">{tGlobal('Ny præstation optjent')}</span>
                    </div>
                    <h3 className="text-lg font-black tracking-tight">{latestTitle}</h3>
                    <p className="text-[10px] text-white/50 font-bold uppercase tracking-wider mt-1">{tGlobal('Tryk for at se alle præstationer').replace('{0}', ACHIEVEMENTS.length.toString())}</p>
                </div>
                <div className="flex flex-col items-center justify-center h-16 w-10">
                    <button onClick={dismiss} className="h-10 w-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-2xl transition-all active:scale-95"><X className="h-6 w-6 text-white" /></button>
                    <div className="mt-auto h-4 w-4" />
                </div>
            </div>
            <div className="mt-4 pt-3 flex items-center justify-between border-t border-white/10">
                <div className="flex gap-2">
                    {unearnedPreviews.map((s) => (
                        <div key={s.achievement.id} className="h-6 w-6 rounded-lg bg-white/5 flex items-center justify-center text-xs opacity-40">{s.achievement.icon}</div>
                    ))}
                    <div className="h-6 px-2 rounded-lg bg-white/5 flex items-center justify-center text-[9px] font-black uppercase text-white/30">{ACHIEVEMENTS.length - earnedCount} {tGlobal('tilbage')}</div>
                </div>
                <div className="flex items-center gap-1.5"><Trophy className="h-3 w-3 text-[#DEA93E]" /></div>
            </div>
        </div>
      </motion.div>
      <style jsx>{` @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } `}</style>
    </>
  );
}
