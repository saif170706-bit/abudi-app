'use client';

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Map, Trophy, MessageSquare,
  Star, Repeat, ChevronRight, X, Lightbulb, BookOpenText, Sparkles
} from "lucide-react";
import { useGlobalTranslation } from "@/hooks/useGlobalTranslation";

const STORAGE_KEY = "welcome_card_seen_count";

interface Feature {
  icon: React.ElementType;
  titleKey: string;
  descKey: string;
}

const FEATURES: Feature[] = [
  { icon: BookOpen, titleKey: "Registrer memorering", descKey: "Registrer daglig memorering efter surah og ayah" },
  { icon: Repeat, titleKey: "Gennemgangsplan", descKey: "Smart system til at gennemgå det du har memoreret" },
  { icon: Map, titleKey: "Korankort", descKey: "Følg dit fremskridt visuelt over 604 sider" },
  { icon: Trophy, titleKey: "Rangliste", descKey: "Konkurrér med dine halqa-kammerater" },
  { icon: Star, titleKey: "Præstationer", descKey: "Optjen motivationsbadges efterhånden" },
  { icon: MessageSquare, titleKey: "Beskeder", descKey: "Kommunikér direkte med din lærer" },
  { icon: BookOpenText, titleKey: "Mushaf-læser", descKey: "Læs den hellige Koran direkte i appen" },
];

export default function WelcomeCard({ forceOpen = false, onClose }: { forceOpen?: boolean; onClose?: () => void }) {
  const [visible, setVisible] = useState(false);
  const { tGlobal } = useGlobalTranslation();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (forceOpen) { setVisible(true); return; }
    const count = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
    if (count < 3) { localStorage.setItem(STORAGE_KEY, String(count + 1)); setVisible(true); }
  }, [forceOpen]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-10 pointer-events-auto overflow-hidden">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-[#004D40]/80 backdrop-blur-xl" onClick={() => setVisible(false)} />
          
          <motion.div initial={{ opacity: 0, scale: 0.9, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 40 }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="relative z-10 w-full max-w-sm max-h-[85vh] flex flex-col rounded-[56px] overflow-hidden bg-[#efebe1] shadow-[0_50px_100px_rgba(0,0,0,0.4)] border-4 border-white/20">
             <div className="absolute inset-0 opacity-[0.04] pointer-events-none">
                <div className="absolute inset-0 bg-[url('https://i.postimg.cc/xC74tT1V/flat-arabic-pattern-background-79603-1826.avif')] bg-cover" />
            </div>

            <button onClick={() => setVisible(false)} className="absolute top-8 right-8 z-20 w-12 h-12 rounded-[20px] flex items-center justify-center bg-white/40 backdrop-blur-md hover:bg-white shadow-xl transition-all">
              <X className="h-6 w-6 text-[#004D40]" />
            </button>

            <div className="px-10 pt-14 pb-8 text-center relative z-10">
              <motion.div initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", delay: 0.3 }} className="w-24 h-24 rounded-[36px] mx-auto mb-8 flex items-center justify-center bg-[#004D40] shadow-2xl relative">
                <Sparkles className="h-12 w-12 text-[#DEA93E]" />
                <div className="absolute -top-2 -right-2 h-8 w-8 bg-[#DEA93E] rounded-full flex items-center justify-center border-2 border-white animate-pulse"><Star className="h-4 w-4 text-white fill-current" /></div>
              </motion.div>
              <h2 className="text-4xl font-display text-[#004D40] tracking-tight leading-[1.1]">{tGlobal('Velkommen til')} <br/><span className="text-[#DEA93E]">Ibn Amer</span></h2>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[#004D40]/30 mt-4 leading-relaxed">{tGlobal('Udforsk de nyeste funktioner i din Quran app')}</p>
            </div>

            <div className="px-10 space-y-4 pb-12 flex-1 overflow-y-auto no-scrollbar relative z-10">
              {FEATURES.map((f, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.05 }} className="flex items-center gap-5 p-4 rounded-[28px] bg-white/40 border border-white transition-all hover:bg-white/60">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 bg-[#004D40] shadow-lg">
                     <f.icon className="h-7 w-7 text-[#DEA93E]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-black text-[#004D40] leading-tight">{tGlobal(f.titleKey)}</p>
                    <p className="text-[11px] text-[#004D40]/50 font-bold leading-tight mt-1">{tGlobal(f.descKey)}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="px-10 pb-12 pt-6 relative z-10 bg-gradient-to-t from-[#efebe1] via-[#efebe1] to-transparent">
              <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 }} onClick={() => setVisible(false)} className="w-full h-20 rounded-[32px] text-lg font-black uppercase tracking-[0.25em] text-white shadow-2xl flex items-center justify-center gap-4 transition-all active:scale-[0.98] bg-[#004D40] group">
                {tGlobal('Kom i gang')}
                <ChevronRight className="h-6 w-6 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
