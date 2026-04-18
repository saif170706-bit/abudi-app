'use client';

import React, { useMemo } from 'react';
import { calculateForecast, calculateHistory, TOTAL_PAGES } from '@/lib/student-logic';
import { cn } from '@/lib/utils';
import { CalendarDays, TrendingUp, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { motion } from 'framer-motion';

import { useGlobalTranslation } from '@/hooks/useGlobalTranslation';

interface PlanForecastCardProps {
    assignments: any[];
    courseDuration: string;
    className?: string;
}

export default function PlanForecastCard({ assignments, courseDuration, className }: PlanForecastCardProps) {
    const { tGlobal, language } = useGlobalTranslation();
    const forecast = useMemo(() => calculateForecast(assignments, courseDuration || '3'), [assignments, courseDuration]);
    const history = useMemo(() => calculateHistory(assignments), [assignments]);
    
    const isAhead = forecast.status === 'ahead';
    const isOnTrack = forecast.status === 'on-track';

    const localeMap = {
        da: 'da-DK',
        en: 'en-US',
        ar: 'ar-SA',
        so: 'so-SO'
    };
    const currentLocale = localeMap[language] || 'da-DK';

    // SVG Graph data preparation
    const chartData = useMemo(() => {
        if (!forecast.startDate) return null;
        
        const start = forecast.startDate.getTime();
        const end = (forecast.targetFinishDate || new Date()).getTime();
        const duration = end - start;
        
        if (duration <= 0) return null;

        // Start point (0 pages)
        const points = [{ x: 0, y: 100 }];
        
        history.forEach(h => {
            const d = new Date(h.date).getTime();
            const x = ((d - start) / duration) * 100;
            const y = 100 - (h.pages / TOTAL_PAGES) * 100;
            // Cap X at 100 for visual sanity
            points.push({ x: Math.min(100, Math.max(0, x)), y: Math.min(100, Math.max(0, y)) });
        });

        // Current point (Today)
        const now = new Date().getTime();
        const currentX = ((now - start) / duration) * 100;
        const currentY = 100 - (forecast.completedPages / TOTAL_PAGES) * 100;
        points.push({ x: Math.min(100, Math.max(0, currentX)), y: Math.min(100, Math.max(0, currentY)) });

        return points;
    }, [history, forecast]);
    
    return (
        <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={cn("glass-card overflow-hidden h-full", className)}
        >
            <div className="glass-card-inner !p-6 sm:!p-8">
                 {/* Mandala Background Pattern */}
                 <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                    <div className="absolute inset-0 bg-[url('https://i.postimg.cc/xC74tT1V/flat-arabic-pattern-background-79603-1826.avif')] bg-cover" />
                </div>

                <div className="flex items-start justify-between relative z-10 mb-6">
                    <div className="space-y-1">
                        <h3 className="text-xl font-black tracking-tight text-primary">{tGlobal('Hifdh Prognose')}</h3>
                        <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-accent">{tGlobal('Tidslinje for fuldførelse')}</p>
                    </div>
                    <div className={cn(
                        "p-3 rounded-2xl shadow-sm",
                        isAhead ? "bg-emerald-500 text-white" : 
                        isOnTrack ? "bg-accent text-white" : 
                        "bg-rose-500 text-white"
                    )}>
                        {isAhead ? <CheckCircle2 className="h-6 w-6" /> : <TrendingUp className="h-6 w-6" />}
                    </div>
                </div>

                {/* Main Graph */}
                <div className="relative h-44 w-full mb-8 z-10 group bg-primary/[0.02] rounded-3xl border border-primary/5 p-4">
                    <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible" preserveAspectRatio="none">
                        {/* Grid lines */}
                        <line x1="0" y1="0" x2="100" y2="0" stroke="currentColor" strokeWidth="0.5" className="text-primary/5" />
                        <line x1="0" y1="50" x2="100" y2="50" stroke="currentColor" strokeWidth="0.5" className="text-primary/5" />
                        <line x1="0" y1="100" x2="100" y2="100" stroke="currentColor" strokeWidth="1" className="text-primary/10" />

                        {/* Expected Progress Line (Dashed) */}
                        <motion.line 
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            x1="0" y1="100" x2="100" y2="0" 
                            stroke="currentColor" 
                            strokeWidth="1.5" 
                            strokeDasharray="4 3" 
                            className="text-accent/40" 
                        />

                        {/* Actual Progress Path */}
                        {chartData && chartData.length > 1 && (
                            <>
                                <defs>
                                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#DEA93E" stopOpacity="0.2" />
                                        <stop offset="100%" stopColor="#DEA93E" stopOpacity="1" />
                                    </linearGradient>
                                </defs>
                                <motion.path
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                    d={`M ${chartData.map(p => `${p.x},${p.y}`).join(' L ')}`}
                                    fill="none"
                                    stroke="url(#progressGradient)"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                                {/* Current status glow point */}
                                {(() => {
                                    const lastPoint = chartData[chartData.length - 1];
                                    return (
                                        <circle 
                                            cx={lastPoint.x} 
                                            cy={lastPoint.y} 
                                            r="2.5" 
                                            className="fill-accent animate-pulse"
                                        />
                                    );
                                })()}
                            </>
                        )}
                    </svg>

                    {/* Labels for graph */}
                    <div className="absolute bottom-1 left-2 text-[8px] font-black uppercase text-primary/20 tracking-tighter">{tGlobal('Start')}</div>
                    <div className="absolute top-1 right-2 text-[8px] font-black uppercase text-accent/40 tracking-tighter">{tGlobal('Mål')} (604p)</div>
                    
                    {/* Tooltip-like stats */}
                    <div className="absolute top-4 right-4 text-right">
                         <div className={cn(
                            "text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-xl shadow-lg border border-white/20",
                            forecast.percentAheadBehind >= 0 ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                         )}>
                            {forecast.percentAheadBehind >= 0 
                                ? `${forecast.percentAheadBehind.toFixed(1)}% ${tGlobal('Forud')}` 
                                : `${Math.abs(forecast.percentAheadBehind).toFixed(1)}% ${tGlobal('Bagud')}`}
                         </div>
                    </div>
                </div>

                <div className="space-y-6 relative z-10">
                    <div className="grid grid-cols-2 gap-8 px-2">
                        <div>
                            <p className="text-[10px] font-black uppercase text-primary/30 tracking-widest mb-1.5">{tGlobal('Forventet færdig')}</p>
                            <p className={cn(
                                "text-lg font-display",
                                forecast.percentAheadBehind >= 0 ? "text-emerald-600" : "text-rose-600"
                            )}>
                                {forecast.estimatedFinishDate 
                                    ? forecast.estimatedFinishDate.toLocaleDateString(currentLocale, { day: 'numeric', month: 'short', year: 'numeric' })
                                    : tGlobal('Beregner...')}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase text-primary/30 tracking-widest mb-1.5">{tGlobal('Planlagt mål')}</p>
                            <p className="text-lg font-display text-accent">
                                {forecast.targetFinishDate 
                                    ? forecast.targetFinishDate.toLocaleDateString(currentLocale, { day: 'numeric', month: 'short', year: 'numeric' })
                                    : tGlobal('Ingen plan')}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-3">
                         <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary/40 mb-1">
                            <Info className="h-3.5 w-3.5" />
                            {tGlobal('Prognosen er baseret på din gennemsnitlige pace de sidste 4 uger.')}
                        </div>
                        <div className="h-3 w-full bg-primary/5 rounded-full overflow-hidden p-[2px] border border-white/20">
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${(forecast.completedPages / TOTAL_PAGES) * 100}%` }}
                                transition={{ duration: 1.5, ease: "circOut" }}
                                className="h-full bg-gradient-to-r from-accent to-[#CC9933] rounded-full shadow-md" 
                            />
                        </div>
                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-primary/30">
                            <span>{forecast.completedPages} {tGlobal('sider fuldført')}</span>
                            <span>{604 - forecast.completedPages} {tGlobal('sider tilbage')}</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-6 border-t border-primary/5">
                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-primary/[0.02] border border-primary/5">
                            <div className="p-2 bg-white/60 rounded-xl shadow-sm">
                                <CalendarDays className="h-4 w-4 text-primary/60" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-primary/30 uppercase tracking-widest">{tGlobal('Tempo')}</p>
                                <p className="text-xs font-black text-primary">{(forecast.actualPace4Weeks * 7).toFixed(1)} {tGlobal('sider/uge')}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-2xl bg-primary/[0.02] border border-primary/5">
                            <div className="p-2 bg-white/60 rounded-xl shadow-sm">
                                <AlertCircle className="h-4 w-4 text-primary/60" />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-primary/30 uppercase tracking-widest">{tGlobal('Resterende')}</p>
                                <p className="text-xs font-black text-primary">{forecast.daysRemaining} {tGlobal('Dage')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
