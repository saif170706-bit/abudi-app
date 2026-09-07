import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_RECITER_ID, reciters } from '@/lib/reciters';

const STORAGE_KEY = 'selected_reciter_id';

/** Persisted reciter choice for Quran audio — mirrors the web app's localStorage("selected_reciter_id"). */
export function useSelectedReciter() {
  const [reciterId, setReciterIdState] = useState(DEFAULT_RECITER_ID);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (cancelled) return;
      if (stored && reciters.some((r) => r.id === stored)) setReciterIdState(stored);
      setIsLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setReciterId = useCallback((id: string) => {
    setReciterIdState(id);
    AsyncStorage.setItem(STORAGE_KEY, id).catch(() => {});
  }, []);

  const reciter = reciters.find((r) => r.id === reciterId) ?? reciters[0];

  return { reciterId, reciter, setReciterId, isLoaded };
}
