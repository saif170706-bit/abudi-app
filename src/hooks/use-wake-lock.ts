import { useCallback, useEffect, useRef, useState } from 'react';

type WakeLockState = 'idle' | 'active' | 'unsupported' | 'blocked' | 'error';

export function useWakeLock(enabled: boolean) {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  const reacquireInFlightRef = useRef(false);
  const [state, setState] = useState<WakeLockState>('idle');
  const [lastError, setLastError] = useState<string | null>(null);

  const release = useCallback(async () => {
    try {
      if (sentinelRef.current && !sentinelRef.current.released) {
        await sentinelRef.current.release();
      }
    } catch {
      // ignore release errors
    } finally {
      sentinelRef.current = null;
      if (enabled) {
        setState('idle');
      } else {
        setState('idle');
      }
    }
  }, [enabled]);

  const acquire = useCallback(async () => {
    if (!enabled) return;
    if (typeof window === 'undefined') return;
    if (!('wakeLock' in navigator)) {
      setState('unsupported');
      return;
    }
    if (document.visibilityState !== 'visible') return;
    if (reacquireInFlightRef.current) return;

    if (sentinelRef.current && !sentinelRef.current.released) {
      setState('active');
      return;
    }

    reacquireInFlightRef.current = true;

    try {
      const sentinel = await navigator.wakeLock.request('screen');
      sentinelRef.current = sentinel;
      setState('active');
      setLastError(null);

      sentinel.addEventListener('release', () => {
        sentinelRef.current = null;
        if (!enabled) {
          setState('idle');
          return;
        }

        setState('idle');

        if (document.visibilityState === 'visible') {
          void acquire();
        }
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setLastError(message);

      if (
        message.includes('NotAllowedError') ||
        message.toLowerCase().includes('notallowederror')
      ) {
        setState('blocked');
      } else {
        setState('error');
      }

      console.warn('Wake lock request failed:', err);
    } finally {
      reacquireInFlightRef.current = false;
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      void release();
      return;
    }

    void acquire();

    const handleVisibility = () => {
      if (!enabled) return;
      if (document.visibilityState === 'visible') {
        void acquire();
      }
    };

    const handleFocus = () => {
      if (!enabled) return;
      void acquire();
    };

    const handlePageShow = () => {
      if (!enabled) return;
      void acquire();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pageshow', handlePageShow);
      void release();
    };
  }, [enabled, acquire, release]);

  return {
    isSupported: typeof navigator !== 'undefined' && 'wakeLock' in navigator,
    isActive: state === 'active',
    state,
    lastError,
    reacquire: acquire,
    release,
  };
}