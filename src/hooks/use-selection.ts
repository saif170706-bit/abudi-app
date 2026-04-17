'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

const LONG_PRESS_DURATION = 300; // ms

export function useSelection(ayahsByKey?: Map<string, any>, versePageMap?: Map<string, number>) {
  const [startKey, setStartKey] = useState<string | null>(null);
  const [endKey, setEndKey] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const longPressTimeout = useRef<NodeJS.Timeout | null>(null);
  const isDragSelection = useRef(false);

  // Memoize the array of all verse keys for efficient lookup.
  const allVerseKeys = useMemo(() => {
    if (!ayahsByKey) return [];
    return Array.from(ayahsByKey.keys()).sort((a, b) => {
      const [aSurah, aAyah] = a.split(':').map(Number);
      const [bSurah, bAyah] = b.split(':').map(Number);
      if (aSurah !== bSurah) return aSurah - bSurah;
      return aAyah - bAyah;
    });
  }, [ayahsByKey]);
  
  const getAyahIndex = useCallback((key: string) => allVerseKeys.indexOf(key), [allVerseKeys]);

  const selectedKeys = useMemo(() => {
    if (!startKey || !endKey) return [];
    
    const startIndex = getAyahIndex(startKey);
    const endIndex = getAyahIndex(endKey);

    if (startIndex === -1 || endIndex === -1) return [];

    const low = Math.min(startIndex, endIndex);
    const high = Math.max(startIndex, endIndex);
    
    return allVerseKeys.slice(low, high + 1);
  }, [startKey, endKey, allVerseKeys, getAyahIndex]);

  const handleAyahClick = useCallback((verseKey: string, e: React.MouseEvent | React.TouchEvent) => {
    if (isDragSelection.current) {
        e.stopPropagation();
    }
  }, []);
  
  const clearSelection = useCallback(() => {
    setStartKey(null);
    setEndKey(null);
    isDragSelection.current = false;
  }, []);

  const isAyahSelected = useCallback(
    (verseKey: string) => selectedKeys.includes(verseKey),
    [selectedKeys]
  );
  
  const getSelectionText = useCallback(() => {
    if (!ayahsByKey) return '';
    return selectedKeys.map(key => ayahsByKey.get(key)?.text_uthmani || '').join(' ');
  }, [selectedKeys, ayahsByKey]);
  
  const handleSelectionStart = useCallback((verseKey: string, e: React.MouseEvent | React.TouchEvent) => {
    if (longPressTimeout.current) {
        clearTimeout(longPressTimeout.current);
    }
    
    longPressTimeout.current = setTimeout(() => {
      // e.preventDefault(); // This can be added back if needed, but might interfere with scrolling.
      isDragSelection.current = true;
      setIsSelecting(true);
      setStartKey(verseKey);
      setEndKey(verseKey);
    }, LONG_PRESS_DURATION);
  }, []);

  const handleSelectionMove = useCallback((verseKey: string) => {
    if (isSelecting) {
        setEndKey(verseKey);
    }
  }, [isSelecting]);

  const handleSelectionEnd = useCallback(() => {
    if (longPressTimeout.current) {
        clearTimeout(longPressTimeout.current);
    }
    setIsSelecting(false); // This will re-enable carousel drag
    
    // Use a short delay before resetting the drag flag.
    // This ensures a final click doesn't register if the user lifts their finger
    // at the end of a drag selection.
    setTimeout(() => {
        if (!isSelecting) { // Only reset if we are truly done
            isDragSelection.current = false;
        }
    }, 100);

  }, [isSelecting]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (longPressTimeout.current) {
        clearTimeout(longPressTimeout.current);
      }
    };
  }, []);


  return {
    startKey,
    endKey,
    selectedKeys,
    isSelecting, 
    isAnythingSelected: selectedKeys.length > 0,
    isAyahSelected,
    handleAyahClick,
    clearSelection,
    getSelectionText,
    handleSelectionStart,
    handleSelectionMove,
    handleSelectionEnd,
    allVerseKeys,
    getAyahIndex
  };
}
