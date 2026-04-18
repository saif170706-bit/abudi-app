'use client';

import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { CheckCircle2, Lock, Star, BookOpen, Award } from "lucide-react";
import { useGlobalTranslation } from "@/hooks/useGlobalTranslation";

import { getInitials, cn } from "@/lib/utils";

type Milestone = {
  id: string;
  label: string;
  sublabel?: string;
  pagesRequired: number;
  type?: "badge" | "quarter" | "juz" | "final";
};

type Props = {
  completedPages: number;
  totalPages?: number;
  className?: string;
};

const TOTAL_QURAN_PAGES = 604;

const milestonesBase: Milestone[] = [
  { id: "start", label: "Start", sublabel: "Rejsen begynder", pagesRequired: 0, type: "badge" },
  { id: "p10", label: "10 Sider", sublabel: "Første badge", pagesRequired: 10, type: "badge" },
  { id: "juz1", label: "1 Juz", sublabel: "Flot start", pagesRequired: 20, type: "juz" },
  { id: "p50", label: "50 Sider", sublabel: "Momentum", pagesRequired: 50, type: "badge" },
  { id: "juz5", label: "5 Juz", sublabel: "Låst op", pagesRequired: 101, type: "juz" },
  { id: "quarter1", label: "¼ Quran", sublabel: "Stort skridt", pagesRequired: 151, type: "quarter" },
  { id: "juz10", label: "10 Juz", sublabel: "Fremragende", pagesRequired: 201, type: "juz" },
  { id: "p250", label: "250 Sider", sublabel: "Stærk indsats", pagesRequired: 250, type: "badge" },
  { id: "half", label: "½ Quran", sublabel: "Halvvejs", pagesRequired: 302, type: "quarter" },
  { id: "juz15", label: "15 Juz", sublabel: "Bliv ved", pagesRequired: 302, type: "juz" },
  { id: "juz20", label: "20 Juz", sublabel: "Fantastisk", pagesRequired: 403, type: "juz" },
  { id: "threequarters", label: "¾ Quran", sublabel: "Næsten i mål", pagesRequired: 453, type: "quarter" },
  { id: "p500", label: "500 Sider", sublabel: "Elite badge", pagesRequired: 500, type: "badge" },
  { id: "juz29", label: "29 Juz", sublabel: "Kun ét skridt", pagesRequired: 584, type: "juz" },
  { id: "khatmah", label: "Khatmah", sublabel: "Fuld Quran", pagesRequired: 604, type: "final" },
].sort((a, b) => a.pagesRequired - b.pagesRequired) as Milestone[];

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

const CrescentMoon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" fill="currentColor" fillOpacity="0.1" />
    <circle cx="18" cy="5" r="1.2" fill="currentColor" />
  </svg>
);

const PrayerMat = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="5" y="3" width="14" height="18" rx="1" fill="currentColor" fillOpacity="0.05" />
    <path d="M5 3l.5-1M19 3l.5-1M5 21l.5 1M19 21l.5 1" />
    <path d="M8 18V9c0-2 1.5-3.5 4-3.5s4 1.5 4 3.5v9" />
    <path d="M10 18v-6c0-1 .5-1.5 2-1.5s2 .5 2 1.5v6" />
  </svg>
);

const QuranRihal = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 21l16-8M4 13l16 8" strokeWidth="2.5" stroke="#8B4513" />
    <path d="M12 14c-3-2.5-6-1-8-1v-8c2 0 5-1.5 8 1 3-2.5 6-1 8-1v8c-2 0-5-1.5-8 1z" fill="currentColor" fillOpacity="0.1" />
    <path d="M12 6v8" />
  </svg>
);

const PalmTreeRealistic = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M7 21a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2H7z" opacity="0.2" />
    <path d="M9 21c.5-3 .5-6 1-9" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <path d="M10 12c-3-1-6-1-8 2 0 0 1-5 8-2z" />
    <path d="M10 12c-1-3-2-6 1-8 0 0 1 3-1 8z" />
    <path d="M10 12c1-3 4-6 7-4 0 0-5 2-7 4z" />
    <path d="M10 12c3-1 6-1 8 2 0 0-6-1-8-2z" />
    <path d="M15 21c.5-2 .5-4 1-6" stroke="currentColor" strokeWidth="1.2" fill="none" />
    <path d="M16 15c-2-1-4-1-5 1 0 0 1-3 5-1z" />
    <path d="M16 15c0-2-2-4 0-5 0 0 1 2 0 5z" />
    <path d="M16 15c2-1 4-2 5-1 0 0-4 1-5 1z" />
  </svg>
);

const RealisticMosque5Juz = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 21h18" />
    <path d="M7 21a5 5 0 0 1 10 0" fill="currentColor" fillOpacity="0.1" />
    <path d="M9 16c0-2.5 1.5-4.5 3-4.5s3 2 3 4.5v5" />
    <path d="M12 11.5V9m-1.5 0h3" />
    <path d="M4 21V10l1.5-2 1.5 2v11" />
    <path d="M17 21V10l1.5-2 1.5 2v11" />
    <path d="M5.5 8l-1 1M18.5 8l1 1" />
  </svg>
);

const KaabaRealistic = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" className={className}>
    <path d="M5 8l7-4 7 4v8l-7 4-7-4V8z" fill="black" fillOpacity="0.85" />
    <path d="M5 8l7 4 7-4" stroke="currentColor" strokeOpacity="0.1" />
    <path d="M12 20V12" stroke="currentColor" strokeOpacity="0.1" />
    <path d="M5 11l7 4 7-4" stroke="#DEA93E" strokeWidth="2.5" />
    <path d="M5 12l7 4 7-4" stroke="#DEA93E" strokeWidth="0.5" opacity="0.5" />
    <path d="M13 15v3.5l3 1.5v-3.5L13 15z" fill="#DEA93E" fillOpacity="0.3" stroke="#DEA93E" strokeWidth="0.5" />
    <path d="M5 16l2 1.2M9 18.2l2 1.2M13 18.2l2-1.2M17 15.8l2-1.2" stroke="currentColor" strokeOpacity="0.2" />
  </svg>
);

const DuaHandsDetailedRefined = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Widely Separated Realistic Hands */}
    <g transform="translate(-3.5, 0) rotate(-2, 10, 20)">
      <path d="M10 20c-1 0-2-.5-3-2l-1.5-3.5c-.3-1 .5-2 1.5-2 .5 0 1 .3 1.2.8.2.5.5 1 .8 1.7" />
      <path d="M7 12V8a1 1 0 0 1 2 0v4m0-4V7a1 1 0 0 1 2 0v5m0-5V6a1 1 0 0 1 2 0v6" />
    </g>
    <g transform="translate(3.5, 0) rotate(2, 14, 20)">
      <path d="M14 20c1 0 2-.5 3-2l1.5-3.5c.3-1-.5-2-1.5-2-.5 0-1 .3-1.2.8-.2.5-.5 1-.8 1.7" />
      <path d="M17 12V8a1 1 0 0 0-2 0v4m0-4V7a1 1 0 0 0-2 0v5m0-5V6a1 1 0 0 0-2 0v6" />
    </g>
    {/* Ground / Connection point opacity */}
    <path d="M9 21c2 1 4 1 6 0" strokeOpacity="0.1" />
  </svg>
);

const CamelPhotoRefined = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Head - Seamlessly caps the neck */}
    <path d="M21.5 7.5l-2.5-.5-1 .5v1.5l.5.5h3z" fill="currentColor" fillOpacity="0.2" />
    
    {/* Fully seamless continuous body outline (no crossing lines) */}
    <path d="M19 7c-.5 3 -1.5 5 -1.5 7c0 2 -1 3 -2.5 3h-9c-1.5 0 -2 -1 -2 -2v-1c0 -1.5 1 -2 2.5 -2c.5 -2.5 1 -3.5 1.5 -3.5s1.5 1 1.5 3.5c0 -3 1 -5 2 -5s2 2 2 5c2 -1 3.5 -3 4.5 -5" fill="currentColor" fillOpacity="0.1" />
    
    {/* Tall Legs */}
    <path d="M7 17v4.5" strokeWidth="2" />
    <path d="M10 17v4.5" strokeWidth="2" />
    <path d="M13 17v4.5" strokeWidth="2" />
    <path d="M16 17v4.5" strokeWidth="2" />
  </svg>
);



const DomeOfRockRealistic = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" className={className}>
    <path d="M4 21h16v-6l-4-3H8l-4 3v6z" fill="currentColor" fillOpacity="0.05" />
    <path d="M6 21v-5M9 21v-5M12 21v-5M15 21v-5M18 21v-5" strokeOpacity="0.2" />
    <path d="M7 16h1v-1.5H7z" fill="#006064" fillOpacity="0.2" stroke="none" />
    <path d="M10 16h1v-1.5H10z" fill="#006064" fillOpacity="0.2" stroke="none" />
    <path d="M13 16h1v-1.5H13z" fill="#006064" fillOpacity="0.2" stroke="none" />
    <path d="M16 16h1v-1.5H16z" fill="#006064" fillOpacity="0.2" stroke="none" />
    <path d="M7 12c0-4 2.2-6.5 5-6.5s5 2.5 5 6.5" fill="#DEA93E" fillOpacity="0.75" stroke="#DEA93E" strokeWidth="1.5" />
    <path d="M12 6V3.5h-1l1-1 1 1h-1" stroke="#DEA93E" />
  </svg>
);

const MasbahaRealistic = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 16c4 0 7-3 7-7s-3-7-7-7-7 3-7 7 3 7 7 7z" strokeDasharray="1 3.5" strokeWidth="3.5" />
    <path d="M5 14s-2 2-2 4 1 2 2 1" />
    <circle cx="2.5" cy="18.5" r="1.2" fill="currentColor" />
    <circle cx="5.5" cy="20.5" r="1.2" fill="currentColor" />
  </svg>
);

const DefinedSujudPerson = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 21c3 0 3-1 3-3 0-3 2-6 6-6 3 0 3 4 5 5m-5-5l1 4m-7 1c.5-1 1.5-2.5 3-2.5" />
    <path d="M7 18c-1-2-1-4 1-5.5 2-1 5-1 6.5 1.5" />
    <path d="M16 16l2 2m-4-1l1-2" opacity="0.4" />
    <circle cx="17.5" cy="19" r="1.8" />
    <path d="M4 21h16" strokeWidth="1" strokeOpacity="0.3" />
  </svg>
);

const OrnateFanoosLamp = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Pulsing glowing aura (rhythmic pulsing light effect) */}
    <circle cx="12" cy="11.5" r="4.5" fill="#DEA93E" className="animate-pulse" stroke="none" opacity="0.4" />
    
    {/* Inner Lit Flame */}
    <path d="M12 13.5c-1 0-1.5-.8-1.5-1.5 0-1.5 1.5-3 1.5-3s1.5 1.5 1.5 3c0 .7-.5 1.5-1.5 1.5z" fill="#DEA93E" stroke="none" />
    
    {/* Lamp Frame Top */}
    <path d="M12 2v2m-3 0h6l1 2H8l1-2z" />
    
    {/* Main Glass Frame */}
    <path d="M8 6l-2 4v8l2 2h8l2-2v-8l-2-4H8z" fill="currentColor" fillOpacity="0.05" />
    <path d="M10 6v14m4-14v14" opacity="0.4" />
    <path d="M6 10h12M6 14h12" opacity="0.15" />
    
    {/* Lamp Base */}
    <path d="M12 21v1" strokeWidth="2" />
  </svg>
);

const GreenDomeOldWay = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 18c0-4 3.5-7.5 8-7.5s8 3.5 8 7.5" fill="#2E7D32" fillOpacity="0.8" />
    <path d="M12 10.5V7m-1.5 0h3" stroke="#2E7D32" />
    <path d="M3 21h18" />
    <path d="M18 21V5l1-1v17" strokeWidth="2" />
  </svg>
);

const InkQuillIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M4 21h8l2-2H6l-2 2z" fill="currentColor" fillOpacity="0.1" />
    <path d="M18 4s-4 1-7 8c-1 2-2 5-2 5l3-1s2-2 4-5c3-6 2-7 2-7z" fill="currentColor" fillOpacity="0.2" />
    <path d="M15 7l2 2" />
  </svg>
);

function getMilestoneIcon(id: string, unlocked?: boolean) {
  const className = `w-7 h-7 sm:w-8 sm:h-8 transition-all duration-300 ${unlocked ? "text-white drop-shadow-md" : "text-neutral-500 opacity-50"}`;

  switch (id) {
    case 'start': return <CrescentMoon className={className} />;
    case 'p10': return <PrayerMat className={className} />;
    case 'juz1': return <QuranRihal className={className} />;
    case 'p50': return <PalmTreeRealistic className={className} />;
    case 'juz5': return <RealisticMosque5Juz className={className} />;
    case 'quarter1': return <KaabaRealistic className={className} />;
    case 'juz10': return <DuaHandsDetailedRefined className={className} />;
    case 'p250': return <CamelPhotoRefined className={className} />;
    case 'half': return <DomeOfRockRealistic className={className} />;
    case 'juz15': return <MasbahaRealistic className={className} />;
    case 'juz20': return <DefinedSujudPerson className={className} />;
    case 'threequarters': return <OrnateFanoosLamp className={className} />;
    case 'p500': return <GreenDomeOldWay className={className} />;
    case 'juz29': return <InkQuillIcon className={className} />;
    case 'khatmah': return <Award className={className} />;
    default: return <Star className={className} />;
  }
}

export default function HifdhJourneyPath({
  completedPages,
  totalPages = TOTAL_QURAN_PAGES,
  className,
}: Props) {
  const { tGlobal } = useGlobalTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 85%", "end 15%"],
  });

  const smoothScrollProgress = useSpring(scrollYProgress, {
    stiffness: 40,
    damping: 22,
    mass: 0.9,
  });

  const milestones = useMemo(() => milestonesBase, []);

  const pathHeight = Math.max(780, milestones.length * 120);
  const centerX = 160;
  const amplitude = 34; // keep tight for phone
  const topPad = 40;
  const bottomPad = 90;

  const points = useMemo(() => {
    const usableHeight = pathHeight - topPad - bottomPad;
    return milestones.map((m, i) => {
      const t = milestones.length === 1 ? 0 : i / (milestones.length - 1);
      const y = topPad + t * usableHeight;
      const x = centerX + Math.sin(i * 1.15) * amplitude;
      const side = m.id === "start" ? "center" : i % 2 === 0 ? "right" : "left" as const;
      return { ...m, x, y, side };
    });
  }, [milestones, pathHeight]);

  const pathD = useMemo(() => {
    if (points.length === 0) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cy1 = prev.y + (curr.y - prev.y) * 0.35;
      const cy2 = prev.y + (curr.y - prev.y) * 0.65;
      d += ` C ${prev.x} ${cy1}, ${curr.x} ${cy2}, ${curr.x} ${curr.y}`;
    }
    return d;
  }, [points]);

  // Calculate granular progress ratio based on milestones
  const actualProgressRatio = useMemo(() => {
    if (completedPages <= 0) return 0;
    if (completedPages >= totalPages) return 1;

    // Find the interval we are in
    let lowerIdx = 0;
    for (let i = 0; i < milestones.length; i++) {
      if (completedPages >= milestones[i].pagesRequired) {
        lowerIdx = i;
      } else {
        break;
      }
    }

    if (lowerIdx === milestones.length - 1) return 1;

    const lowerMilestone = milestones[lowerIdx];
    const upperMilestone = milestones[lowerIdx + 1];
    
    // Progress within this specific interval
    const range = upperMilestone.pagesRequired - lowerMilestone.pagesRequired;
    const progressInRange = completedPages - lowerMilestone.pagesRequired;
    const localRatio = range > 0 ? progressInRange / range : 0;

    // Map to global t scale (i / total-1)
    const totalSteps = milestones.length - 1;
    return (lowerIdx + localRatio) / totalSteps;
  }, [completedPages, milestones, totalPages]);

  const visualProgressRatio = useTransform(smoothScrollProgress, (v) => {
    return Math.min(v, actualProgressRatio);
  });

  const [pathLength, setPathLength] = useState(0);
  const measureRef = useRef<SVGPathElement | null>(null);

  useEffect(() => {
    if (measureRef.current) {
      setPathLength(measureRef.current.getTotalLength());
    }
  }, [pathD]);

  return (
    <div
      ref={containerRef}
      className={cn("relative mx-auto w-full max-w-md overflow-hidden px-3 sm:px-4 mb-20", className)}
      style={{ minHeight: pathHeight }}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white via-orange-50/20 to-white opacity-40" />

      <svg
        className="absolute left-1/2 top-0 -translate-x-1/2"
        width={320}
        height={pathHeight}
        viewBox={`0 0 320 ${pathHeight}`}
        fill="none"
      >
        <path
          ref={measureRef}
          d={pathD}
          stroke="#111111"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
          strokeDasharray="2 12"
          opacity="0.1"
          style={{
            // @ts-ignore
            pathLength: 1,
          }}
        />

        <motion.path
          d={pathD}
          stroke="#DEA93E"
          strokeWidth="5"
          strokeLinecap="round"
          fill="none"
          strokeDasharray="2 12"
          style={{
            pathLength: visualProgressRatio,
          }}
        />
      </svg>

      {points.map((point, index) => {
        const unlocked = completedPages >= point.pagesRequired;
        const isFinal = point.type === "final";

        const revealStart = Math.max(0, index / points.length - 0.12);
        const revealEnd = Math.min(1, revealStart + 0.16);

        const opacity = useTransform(smoothScrollProgress, [revealStart, revealEnd], [0.15, 1]);
        const yMotion = useTransform(smoothScrollProgress, [revealStart, revealEnd], [18, 0]);
        const scale = useTransform(smoothScrollProgress, [revealStart, revealEnd], [0.92, 1]);

        const isLeft = point.side === "left";

        return (
          <motion.div
            key={point.id}
            className="absolute"
            style={{
              top: point.y - (isFinal ? 34 : 24),
              left: isLeft ? "calc(50% - 116px)" : "calc(50% + 22px)",
              opacity,
              y: yMotion,
              scale,
              width: isFinal ? 150 : 108,
            }}
          >
            <div className={`flex ${isLeft ? "justify-end text-right" : "justify-start text-left"}`}>
              <div className="max-w-[108px] sm:max-w-[120px]">
                <div
                  className={[
                    "mx-auto flex items-center justify-center rounded-2xl shadow-sm transition-colors duration-500",
                    isFinal
                      ? unlocked
                        ? "h-16 w-16 bg-primary"
                        : "h-16 w-16 bg-neutral-300"
                      : unlocked
                      ? "h-11 w-11 bg-accent"
                      : "h-11 w-11 bg-neutral-200",
                  ].join(" ")}
                >
                  {getMilestoneIcon(point.id, unlocked)}
                </div>

                <div className={`mt-2 ${isLeft ? "pr-1" : "pl-1"}`}>
                  <p
                    className={`text-[12px] sm:text-[13px] font-bold leading-tight text-black break-words`}
                  >
                    {tGlobal(point.label)}
                  </p>
                  <p
                    className={`mt-0.5 text-[10px] sm:text-[11px] leading-tight text-slate-400 break-words font-medium`}
                  >
                    {tGlobal(point.sublabel || '')}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}

      <div style={{ height: pathHeight }} />
    </div>
  );
}
