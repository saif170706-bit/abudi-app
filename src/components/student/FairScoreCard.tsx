'use client';

import React from 'react';
import { calculateFairScore } from '@/lib/student-logic';
import { cn } from '@/lib/utils';
import { Star, LayoutGrid, Target, FileText } from 'lucide-react';
import { motion } from 'framer-motion';

interface FairScoreCardProps {
    assignments: any[];
    courseDuration: string;
    startDate: any; // Firebase Timestamp or Date
    className?: string;
}

export default function FairScoreCard({ assignments, courseDuration, startDate, className }: FairScoreCardProps) {
    const actualStartDate = startDate?.toDate ? startDate.toDate() : (startDate instanceof Date ? startDate : new Date());
    const fairScore = calculateFairScore(assignments, courseDuration || '3', actualStartDate);
    
    return (
        <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={cn("glass-card overflow-hidden", className)}
        >
            <div className="glass-card-inner">
                {/* Mandala Background Pattern */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                    <div className="absolute inset-0 bg-[url('https://i.postimg.cc/xC74tT1V/flat-arabic-pattern-background-79603-1826.avif')] bg-cover" />
                </div>

                <div className="flex items-center justify-between relative z-10">
                    <div className="space-y-1">
                        <h3 className="text-xl font-black tracking-tight text-primary">Din Fair Score</h3>
                        <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-accent">Baseret på din indsats</p>
                    </div>
                </div>

                <div className="mt-8 flex flex-col items-center justify-center relative z-10">
                    <div className="relative h-44 w-44">
                        <svg className="h-full w-full -rotate-90">
                            <circle
                                cx="88" cy="88" r="78"
                                fill="none" stroke="currentColor" strokeWidth="8"
                                className="text-primary/5"
                            />
                            <motion.circle
                                cx="88" cy="88" r="78"
                                fill="none" stroke="url(#goldGradient)" strokeWidth="10"
                                strokeDasharray={490}
                                initial={{ strokeDashoffset: 490 }}
                                animate={{ strokeDashoffset: 490 - (490 * fairScore) / 100 }}
                                transition={{ duration: 2, ease: "circOut" }}
                                strokeLinecap="round"
                            />
                            <defs>
                                <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#DEA93E" />
                                    <stop offset="100%" stopColor="#CC9933" />
                                </linearGradient>
                            </defs>
                        </svg>
                        
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <motion.span 
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.5, duration: 0.5 }}
                                className="text-5xl font-display text-primary leading-none"
                            >
                                {fairScore}
                            </motion.span>
                            <span className="text-[10px] font-black uppercase text-primary/30 tracking-widest mt-2">Point</span>
                        </div>
                    </div>

                    <div className="mt-10 grid grid-cols-2 gap-4 w-full">
                        <div className="p-5 rounded-[28px] bg-white/40 border border-white flex flex-col items-center text-center shadow-sm">
                            <div className="p-2 bg-primary/5 rounded-xl mb-3">
                                <Target className="h-4 w-4 text-accent" />
                            </div>
                            <span className="text-[10px] font-black uppercase text-primary/30 mb-1">Status</span>
                            <span className={cn(
                                "text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full",
                                fairScore > 80 ? "bg-emerald-100 text-emerald-700" :
                                fairScore > 60 ? "bg-orange-100 text-orange-700" :
                                "bg-red-100 text-red-700"
                            )}>
                                {fairScore > 80 ? 'Elite' : fairScore > 60 ? 'God' : 'Fokus'}
                            </span>
                        </div>
                        <div className="p-5 rounded-[28px] bg-white/40 border border-white flex flex-col items-center text-center shadow-sm">
                             <div className="p-2 bg-primary/5 rounded-xl mb-3">
                                <Star className="h-4 w-4 text-accent" />
                            </div>
                            <span className="text-[10px] font-black uppercase text-primary/30 mb-1">Mål</span>
                            <span className="text-[10px] font-black text-primary uppercase">Op til 100</span>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
