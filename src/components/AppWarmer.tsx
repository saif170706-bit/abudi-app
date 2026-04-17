'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * AppWarmer is a silent background component that pings critical API routes
 * and prefetches pages to mitigate serverless cold start delays.
 * 
 * It focuses on:
 * 1. Warming Stream token generation APIs.
 * 2. Warming common action routes (like leaving chat).
 * 3. Prefetching static pages like Terms of Service.
 */
export default function AppWarmer() {
  const pathname = usePathname();
  const hasWarmed = useRef(false);

  useEffect(() => {
    // We only want to fire the primary warmup once per session load
    if (hasWarmed.current) return;
    hasWarmed.current = true;

    const warmupRoutes = [
      '/api/stream/token',
      '/api/stream/video-token',
      '/api/stream/leave'
    ];

    // Fire pings to all critical routes
    // Even if them return 401/405, the serverless instance is woken up.
    warmupRoutes.forEach(route => {
      fetch(route, { method: 'GET' })
        .catch(() => {
          // Silent catch - we don't care about the result, only the trigger
        });
    });

  }, []);

  // Periodic warming to keep functions alive if the tab is open for a long time
  useEffect(() => {
    const interval = setInterval(() => {
      // Re-warm the most critical route every 4 minutes (most serverless sleep is 5-15 mins)
      fetch('/api/stream/token', { method: 'GET' }).catch(() => {});
    }, 4 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return null;
}
