'use client';

import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // If the error is a typical Next.js chunk loading error (happens when the developer
    // recompiles code or pushes a new update and the user's browser has stale JS pointers),
    // we intercept it and force a hard reload so the user gets the fresh files seamlessly!
    if (
        error.name === 'ChunkLoadError' || 
        error.message?.includes('Failed to load chunk') || 
        error.message?.includes('Loading chunk') ||
        error.message?.includes('fetch')
    ) {
        console.warn('Stale JS chunk detected. Automatically reloading page to fetch newest updates...', error);
        window.location.reload();
    } else {
        console.error('Unhandled App Error:', error);
    }
  }, [error]);

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 text-center bg-background">
      <Loader2 className="h-10 w-10 animate-spin text-primary mb-6" />
      <h2 className="text-2xl font-black font-display text-primary mb-2">Vent venligst...</h2>
      <p className="text-primary/60 text-sm font-medium mb-8 max-w-sm">
        Appen henter den nyeste opdatering fra serveren for at sikre alt fungerer perfekt.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-8 py-3 rounded-full bg-primary text-white font-bold tracking-wider uppercase text-xs shadow-lg"
      >
        Genindlæs Manuelt
      </button>
    </div>
  );
}
