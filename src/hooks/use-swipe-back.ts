'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UseSwipeBackOptions {
  onBack: () => void;
  /** Minimum horizontal swipe distance in px to trigger (default 60) */
  threshold?: number;
  /** Max vertical drift as fraction of swipe before cancelling (default 0.5) */
  maxVerticalRatio?: number;
  /** Only trigger when touch starts within this many px from the left edge (default 40) */
  edgeZone?: number;
  /** Set to false to disable (e.g. during Quran reader) */
  enabled?: boolean;
}

/**
 * Attaches a swipe-from-left-edge gesture to the window (like native iOS back swipe).
 * Only fires when the gesture starts within `edgeZone` px from the left edge.
 *
 * Usage:
 *   useSwipeBack({ onBack: () => setView('overview') });
 */
export function useSwipeBack({
  onBack,
  threshold = 60,
  maxVerticalRatio = 0.6,
  edgeZone = 48,
  enabled = true,
}: UseSwipeBackOptions) {
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const isActiveRef = useRef(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    const touch = e.touches[0];
    // Only activate for touches starting in the left edge zone
    if (touch.clientX <= edgeZone) {
      startXRef.current = touch.clientX;
      startYRef.current = touch.clientY;
      isActiveRef.current = true;
    }
  }, [enabled, edgeZone]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!isActiveRef.current || startXRef.current === null || startYRef.current === null) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - startXRef.current;
    const deltaY = Math.abs(touch.clientY - startYRef.current);

    // Check: long enough horizontal swipe AND not too vertical
    if (deltaX >= threshold && deltaY / deltaX <= maxVerticalRatio) {
      onBack();
    }

    // Reset
    startXRef.current = null;
    startYRef.current = null;
    isActiveRef.current = false;
  }, [onBack, threshold, maxVerticalRatio]);

  const handleTouchCancel = useCallback(() => {
    startXRef.current = null;
    startYRef.current = null;
    isActiveRef.current = false;
  }, []);

  useEffect(() => {
    if (!enabled) return;
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchCancel, { passive: true });
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [enabled, handleTouchStart, handleTouchEnd, handleTouchCancel]);
}
