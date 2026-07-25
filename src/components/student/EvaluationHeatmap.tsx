'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Flame } from 'lucide-react';
import { motion } from 'framer-motion';

interface EvaluationHeatmapProps {
    assignments: any[];
    className?: string;
}

export default function EvaluationHeatmap({ assignments, className }: EvaluationHeatmapProps) {
    const today = new Date();
    
    const activityMap = useMemo(() => {
        const map: Record<string, number> = {};
        assignments.forEach(a => {
            const dateObj = a.gradedAt?.toDate ? a.gradedAt.toDate() : (a.assignedAt?.toDate ? a.assignedAt.toDate() : null);
            if (dateObj) {
                const date = dateObj.toISOString().split('T')[0];
                const grade = a.gradeHifz || a.gradeMurajara;
                if (grade === 'Perfekt') map[date] = 3;
                else if (grade === 'Meget godt') map[date] = 2;
                else if (grade === 'Godt') map[date] = 1;
                else map[date] = 0;
            }
        });
        return map;
    }, [assignments]);

    const weeks = useMemo(() => {
        const result = [];
        let currentWeek = [];
        const lastSunday = new Date(today);
        lastSunday.setDate(today.getDate() - today.getDay());
        const totalDays = 14 * 7;
        const startDate = new Date(lastSunday);
        startDate.setDate(lastSunday.getDate() - totalDays + 7);

        for (let i = 0; i < totalDays; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            currentWeek.push({
                date,
                intensity: activityMap[dateStr] || 0
            });
            if (currentWeek.length === 7) {
                result.push(currentWeek);
                currentWeek = [];
            }
        }
        return result;
    }, [activityMap]);

    return (
        <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={cn("glass-card overflow-hidden", className)}
        >
            <div className="glass-card-inner !p-6 sm:!p-8">
                {/* Mandala Background Pattern */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                    <div className="absolute inset-0 bg-[url('https://i.postimg.cc/xC74tT1V/flat-arabic-pattern-background-79603-1826.avif')] bg-cover" />
                </div>

                <div className="pb-8 relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-accent/10 flex items-center justify-center border border-accent/20">
                            <Flame className="h-6 w-6 text-accent" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black tracking-tight text-primary">Konsistens</h3>
                            <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-accent">Din ugentlige indsats</p>
                        </div>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-primary/5 border border-primary/10 text-[9px] font-black uppercase tracking-widest text-primary/40">
                        Mål: 2-3 gange/uge
                    </div>
                </div>

                <div className="relative z-10">
                    <div className="flex flex-col gap-8">
                        <div className="overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2">
                            <div className="flex gap-2 min-w-max">
                                {weeks.map((week, weekIdx) => (
                                    <div key={weekIdx} className="flex flex-col gap-2">
                                        {week.map((day, dayIdx) => (
                                            <motion.div
                                                key={dayIdx}
                                                whileHover={{ scale: 1.4, zIndex: 10 }}
                                                initial={{ scale: 0, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                transition={{ 
                                                    delay: (weekIdx * 0.03) + (dayIdx * 0.01),
                                                    type: "spring",
                                                    stiffness: 300
                                                }}
                                                title={`${day.date.toLocaleDateString()}: ${day.intensity === 3 ? 'Perfekt' : day.intensity === 2 ? 'Meget godt' : day.intensity === 1 ? 'Godt' : 'Mangler'}`}
                                                className={cn(
                                                    "h-4.5 w-4.5 rounded-[5px] transition-all duration-500 shadow-sm",
                                                    day.intensity === 0 ? "bg-primary/5 border border-white/40" :
                                                    day.intensity === 1 ? "bg-primary/30 shadow-black/5" :
                                                    day.intensity === 2 ? "bg-primary/60 shadow-black/10" :
                                                    "bg-primary shadow-[0_2px_8px_rgba(0,0,0,0.25)] ring-1 ring-white/20"
                                                )}
                                            />
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="flex items-center justify-between pt-6 border-t border-primary/5">
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-sm bg-primary/10" />
                                    <span className="text-[10px] uppercase font-black tracking-widest text-primary/40">Lav</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="h-3 w-3 rounded-sm bg-primary shadow-sm" />
                                    <span className="text-[10px] uppercase font-black tracking-widest text-primary/40">Høj</span>
                                </div>
                            </div>
                            <div className="text-[9px] uppercase font-black tracking-[0.15em] text-primary/20 bg-primary/5 px-4 py-1.5 rounded-full">
                                Seneste 14 uger
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
