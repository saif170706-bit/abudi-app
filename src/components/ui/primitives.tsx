'use client';

import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

/**
 * Task 22 — Component Deduplication
 *
 * This file consolidates the three most copy-pasted UI primitives
 * found across student views, teacher views, and profile settings:
 *
 *  1. SectionLabel      — gold uppercase label with left border
 *  2. GoldStatItem      — stat number + label pair (used in WelcomeCard, student/page)
 *  3. GoldStatRow       — horizontal row of GoldStatItems with dividers
 *  4. EmptyState        — centered empty list placeholder
 *  5. LoadingSpinner    — consistent loading indicator
 */

// ── 1. SectionLabel ──────────────────────────────────────────────────────
/**
 * Replaces the repeated `<div className="section-label">` pattern.
 * The .section-label CSS class is kept for backward compatibility but
 * this component adds dark mode + sizing variants.
 */
export function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'text-[10px] font-black uppercase tracking-[0.2em]',
        'text-accent pl-3 border-l-2 border-accent mb-4',
        className
      )}
    >
      {children}
    </div>
  );
}

// ── 2. GoldStatItem ───────────────────────────────────────────────────────
/**
 * Replaces the repeated stat display pattern:
 * <div className="flex flex-col">
 *   <span className="text-[9px] font-black uppercase ...">Label</span>
 *   <span className="text-xl font-display text-primary">{value}</span>
 * </div>
 */
export function GoldStatItem({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col', className)}>
      <span className="text-[9px] font-black uppercase text-primary/30 dark:text-white/30 tracking-[0.15em] mb-0.5">
        {label}
      </span>
      <span className="text-xl font-display text-primary dark:text-white/90">
        {value}
      </span>
    </div>
  );
}

// ── 3. GoldStatRow ────────────────────────────────────────────────────────
/**
 * Replaces the repeated horizontal stat row pattern with dividers.
 * Usage:
 *   <GoldStatRow stats={[{ label: 'Sider', value: 42 }, ...]} />
 */
export function GoldStatRow({
  stats,
  className,
}: {
  stats: { label: string; value: React.ReactNode }[];
  className?: string;
}) {
  return (
    <div className={cn('flex gap-8 items-center', className)}>
      {stats.map((s, i) => (
        <React.Fragment key={s.label}>
          {i > 0 && (
            <div className="w-px h-6 bg-primary/5 dark:bg-white/10 shrink-0" />
          )}
          <GoldStatItem label={s.label} value={s.value} />
        </React.Fragment>
      ))}
    </div>
  );
}

// ── 4. EmptyState ─────────────────────────────────────────────────────────
/**
 * Replaces ad-hoc empty list messages scattered across the app.
 */
export function EmptyState({
  icon,
  title,
  description,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 gap-4 text-center', className)}>
      {icon && (
        <div className="h-16 w-16 rounded-2xl bg-primary/5 dark:bg-white/5 flex items-center justify-center text-accent">
          {icon}
        </div>
      )}
      <div>
        <p className="font-black text-primary dark:text-white/90 text-base">{title}</p>
        {description && (
          <p className="text-[11px] text-primary/40 dark:text-white/25 mt-1 font-medium">{description}</p>
        )}
      </div>
    </div>
  );
}

// ── 5. LoadingSpinner ─────────────────────────────────────────────────────
/**
 * Replaces repeated `animate-spin rounded-full border-2` patterns.
 */
export function LoadingSpinner({
  size = 24,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div
      className={cn('animate-spin rounded-full border-2 border-muted-foreground/20 border-t-[#DEA93E]', className)}
      style={{ width: size, height: size }}
      aria-label="Loading"
      role="status"
    />
  );
}

// ── 6. WavingHand ────────────────────────────────────────────────────────
/**
 * Uses a smooth CSS-based wave animation for the hand emoji.
 */
export function WavingHand() {
  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      const styleId = 'waving-hand-styles';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
          @keyframes wave-hand {
            0% { transform: rotate( 0.0deg) }
            10% { transform: rotate(14.0deg) }
            20% { transform: rotate(-8.0deg) }
            30% { transform: rotate(14.0deg) }
            40% { transform: rotate(-4.0deg) }
            50% { transform: rotate(10.0deg) }
            60% { transform: rotate( 0.0deg) }
            100% { transform: rotate( 0.0deg) }
          }
        `;
        document.head.appendChild(style);
      }
    }
  }, []);

  return (
    <span 
      className="inline-block origin-[70%_70%] animate-[wave-hand_2.5s_infinite]"
      aria-hidden="true"
    >
      👋
    </span>
  );
}

// ── 7. IslamicDivider ─────────────────────────────────────────────────────
/**
 * A stylized divider featuring a central geometric diamond and subtle 
 * gradient lines, matching the overall premium aesthetic.
 */
export function IslamicDivider({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-4 py-4', className)}>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-primary/10 dark:to-white/10" />
      <div className="flex gap-1.5 items-center opacity-40">
        <div className="h-1 w-1 rounded-full bg-accent" />
        <div className="h-2 w-2 rotate-45 border border-accent bg-white dark:bg-black/20 shadow-[0_0_8px_rgba(222,169,62,0.3)]" />
        <div className="h-1 w-1 rounded-full bg-accent" />
      </div>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-primary/10 dark:to-white/10" />
    </div>
  );
}

// ── 8. UpwardShootingStars ────────────────────────────────────────────────
/**
 * A luxury background effect featuring shooting stars that travel 
 * from the bottom-left toward the top-right.
 */
export function UpwardShootingStars() {
  const containerRef = useRef<HTMLDivElement>(null);
  const starsRef = useRef<any[]>([]);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let width = container.offsetWidth;
    let height = container.offsetHeight;

    const STAR_COUNT = 5;
    const stars: any[] = [];
    const random = (min: number, max: number) => Math.random() * (max - min) + min;

    const createStar = () => ({
      x: random(-width * 0.2, width * 0.5),
      y: random(height * 0.8, height * 1.5),
      length: random(60, 150),
      speed: random(1.0, 2.2),
      size: random(0.6, 1.0),
      opacity: random(0.3, 0.6),
      delay: random(0, 400),
    });

    for (let i = 0; i < STAR_COUNT; i++) stars.push(createStar());
    starsRef.current = stars;

    const animate = () => {
      width = container.offsetWidth;
      height = container.offsetHeight;
      const starEls = container.querySelectorAll('.lux-star');

      starsRef.current.forEach((star, index) => {
        if (star.delay > 0) {
          star.delay -= 1;
        } else {
          star.x += star.speed; 
          star.y -= star.speed * 1.8; 

          const el = starEls[index] as HTMLElement;
          if (el) {
            el.style.transform = `translate(${star.x}px, ${star.y}px) rotate(-60deg)`;
            el.style.width = `${star.length}px`;
            el.style.height = `${star.size}px`;
            el.style.opacity = String(star.opacity);
          }

          if (star.x > width + 100 || star.y < -150) {
            starsRef.current[index] = createStar();
            starsRef.current[index].x = random(-40, width * 0.7);
            starsRef.current[index].y = random(height + 20, height + 100);
          }
        }
      });
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    const ro = new ResizeObserver(() => { width = container.offsetWidth; height = container.offsetHeight; });
    ro.observe(container);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none overflow-hidden rounded-[32px]">
      <div className="absolute inset-0 bg-accent/[0.04]" />
      
      {/* 4-Point Stationary Stars */}
      <div className="absolute inset-0 z-[1] opacity-30">
        <svg className="absolute top-[20%] left-[15%] w-2.5 h-2.5 text-accent animate-[luxuryTwinkle_3.2s_ease-in-out_infinite_alternate]" viewBox="0 0 100 100">
          <path fill="currentColor" d="M50 0 C50 40 60 50 100 50 C60 50 50 60 50 100 C50 60 40 50 0 50 C40 50 50 40 50 0 Z" />
        </svg>
        <svg className="absolute top-[65%] left-[30%] w-2.5 h-2.5 text-primary animate-[luxuryTwinkle_4.2s_ease-in-out_infinite_alternate] drop-shadow-[0_0_8px_hsl(var(--primary))]" style={{ animationDelay: '0.8s' }} viewBox="0 0 100 100">
          <path fill="currentColor" d="M50 0 C50 40 60 50 100 50 C60 50 50 60 50 100 C50 60 40 50 0 50 C40 50 50 40 50 0 Z" />
        </svg>
        <svg className="absolute top-[40%] left-[55%] w-4 h-4 text-accent animate-[luxuryTwinkle_3.8s_ease-in-out_infinite_alternate] drop-shadow-[0_0_10px_hsl(var(--accent))]" style={{ animationDelay: '1.5s' }} viewBox="0 0 100 100">
          <path fill="currentColor" d="M50 0 C50 40 60 50 100 50 C60 50 50 60 50 100 C50 60 40 50 0 50 C40 50 50 40 50 0 Z" />
        </svg>
        <svg className="absolute top-[22%] left-[75%] w-2 h-2 text-primary animate-[luxuryTwinkle_3.5s_ease-in-out_infinite_alternate]" style={{ animationDelay: '0.3s' }} viewBox="0 0 100 100">
          <path fill="currentColor" d="M50 0 C50 40 60 50 100 50 C60 50 50 60 50 100 C50 60 40 50 0 50 C40 50 50 40 50 0 Z" />
        </svg>
        <svg className="absolute top-[75%] left-[80%] w-3.5 h-3.5 text-accent animate-[luxuryTwinkle_4.5s_ease-in-out_infinite_alternate] drop-shadow-[0_0_6px_hsl(var(--accent))]" style={{ animationDelay: '2.1s' }} viewBox="0 0 100 100">
          <path fill="currentColor" d="M50 0 C50 40 60 50 100 50 C60 50 50 60 50 100 C50 60 40 50 0 50 C40 50 50 40 50 0 Z" />
        </svg>
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="lux-star" />
      ))}
    </div>
  );
}
