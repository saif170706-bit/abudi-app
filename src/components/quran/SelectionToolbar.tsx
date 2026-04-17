'use client';

import { Play, Copy, Repeat } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SelectionToolbarProps {
  onPlay: () => void;
  onRepeat: () => void;
  onCopy?: () => void; // Optional for now
}

export function SelectionToolbar({ onPlay, onRepeat, onCopy }: SelectionToolbarProps) {
  return (
    <div
      className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30"
      onClick={(e) => e.stopPropagation()} // Prevent closing the selection
    >
      <div className="flex items-center gap-2 p-2 rounded-full bg-background border shadow-lg">
        <Button variant="ghost" size="icon" onClick={onPlay} title="Play Selection">
          <Play className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onRepeat} title="Repeat Selection">
          <Repeat className="h-5 w-5" />
        </Button>
        {onCopy && (
            <Button variant="ghost" size="icon" onClick={onCopy} title="Copy">
                <Copy className="h-5 w-5" />
            </Button>
        )}
      </div>
    </div>
  );
}
