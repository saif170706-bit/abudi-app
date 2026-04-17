'use client';

import { useEffect, useMemo, useRef } from 'react';
import { X } from 'lucide-react';
import { FullscreenSheet } from '@/components/ui/fullscreen-sheet';
import { useView } from '@/context/ViewContext';

interface Props {
  livestream: any;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * LivestreamPlayerSheet provides a native system playback experience.
 * By using native controls and disabling playsInline, we ensure vertical and horizontal 
 * recordings fit perfectly without white bars or square cropping.
 */
export default function LivestreamPlayerSheet({ livestream, isOpen, onClose }: Props) {
  const { setIsSubView } = useView();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const src = useMemo(() => livestream?.recordingUrl || '', [livestream]);

  useEffect(() => {
    if (!isOpen) return;

    const v = videoRef.current;
    if (!v) return;

    // Trigger the native OS player immediately upon playback start
    v.playsInline = false;
    v.muted = false;
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <FullscreenSheet
      open={isOpen}
      onOpenChange={(o) => !o && onClose()}
      title={livestream?.title || 'Optagelse'}
      headerClassName="bg-black border-white/10 text-white"
      containerClassName="bg-black"
      rightSlot={
        <button
          onClick={onClose}
          className="p-2 mr-2 bg-card/10 hover:bg-card/20 rounded-full transition-colors"
          aria-label="Luk afspiller"
        >
          <X className="h-6 w-6 text-white" />
        </button>
      }
    >
      <div className="fixed inset-0 bg-black flex flex-col overflow-hidden">
        <div className="flex-1 relative bg-black flex items-center justify-center">
          {src ? (
            <video
              ref={videoRef}
              src={src}
              controls
              preload="metadata"
              className="absolute inset-0 w-full h-full object-contain bg-black"
            />
          ) : (
            <div className="text-white/40 text-sm font-bold uppercase tracking-widest text-center px-10">
              Optagelsen behandles stadig...<br/>Prøv igen om et øjeblik.
            </div>
          )}
        </div>
        
        {/* Native feeling spacer for bottom swipe-up bars on iOS/Android */}
        <div className="h-[env(safe-area-inset-bottom)] bg-black" />
      </div>
    </FullscreenSheet>
  );
}
