'use client';

import { cn } from '@/lib/utils';
import React from 'react';
import { useTheme } from 'next-themes';

type Word = {
    content: string;
    wordId?: number;
}

interface AyahProps {
  verseKey: string;
  words: Word[];
  isSelected: boolean;
  isPlaying: boolean;
  activeWordId: number | null;
  onSelectionStart: (verseKey: string, e: React.MouseEvent | React.TouchEvent) => void;
  onSelectionMove: (verseKey: string) => void;
  onSelectionEnd: () => void;
  onClick: (verseKey: string, e: React.MouseEvent | React.TouchEvent) => void;
}

export function Ayah({
  verseKey,
  words,
  isSelected,
  isPlaying,
  activeWordId,
  onSelectionStart,
  onSelectionMove,
  onSelectionEnd,
  onClick
}: AyahProps) {
  const { resolvedTheme } = useTheme();
  const forcedColor = resolvedTheme === 'dark' ? '#ffffff' : '#000000';
  
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      onSelectionStart(verseKey, e);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    onSelectionStart(verseKey, e);
  };

  const handleMouseEnter = () => {
    onSelectionMove(verseKey);
  };

  const handleClick = (e: React.MouseEvent | React.TouchEvent) => {
    onClick(verseKey, e);
  };

  return (
    <span
      data-verse-key={verseKey}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      onMouseEnter={handleMouseEnter}
      onClick={handleClick}
      className={cn(
        'ayah-word-group transition-colors duration-200 rounded-md text-inherit',
        isPlaying
          ? 'bg-yellow-200/50 dark:bg-yellow-500/30'
          : isSelected
          ? 'bg-primary/20'
          : 'bg-transparent'
      )}
      style={{
        color: forcedColor,
        WebkitTextFillColor: forcedColor,
      }}
    >
      {words.map((word, index) => (
        <span
          key={index}
          className={cn(
            'transition-colors text-inherit',
            isPlaying && word.wordId === activeWordId ? 'text-blue-600 dark:text-blue-400' : ''
          )}
          style={{
            color: isPlaying && word.wordId === activeWordId ? undefined : forcedColor,
            WebkitTextFillColor:
              isPlaying && word.wordId === activeWordId ? undefined : forcedColor,
          }}
        >
          {word.content}
        </span>
      ))}
    </span>
  );
}
