import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { GameMode } from 'reeljs';

/** ゲームモードごとのBGMトラックマッピング */
export const BGM_TRACK_MAP: Record<GameMode, string> = {
  Normal: `${import.meta.env.BASE_URL}bgm/normal.mp3`,
  Chance: `${import.meta.env.BASE_URL}bgm/chance.mp3`,
  Bonus: `${import.meta.env.BASE_URL}bgm/bonus.mp3`,
  BT: `${import.meta.env.BASE_URL}bgm/bt.mp3`,
};

export interface UseBGMReturn {
  isBGMEnabled: boolean;
  toggleBGM: () => void;
  currentTrack: string;
}

export function useBGM(gameMode: GameMode): UseBGMReturn {
  const [isBGMEnabled, setIsBGMEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const userInteractedRef = useRef(false);
  const currentTrack = useMemo(() => BGM_TRACK_MAP[gameMode], [gameMode]);

  useEffect(() => {
    const audio = new Audio();
    audio.loop = true;
    audio.volume = 0.4;
    audioRef.current = audio;

    const handleInteraction = () => {
      userInteractedRef.current = true;
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
    document.addEventListener('click', handleInteraction);
    document.addEventListener('keydown', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);

    return () => {
      audio.pause();
      audio.src = '';
      audioRef.current = null;
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.src.endsWith(currentTrack)) return;
    audio.src = currentTrack;
    if (isBGMEnabled && userInteractedRef.current) {
      audio.play().catch((err) => console.warn('BGM playback failed:', err));
    }
  }, [currentTrack, isBGMEnabled]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isBGMEnabled && userInteractedRef.current) {
      audio.play().catch((err) => console.warn('BGM playback failed:', err));
    } else {
      audio.pause();
    }
  }, [isBGMEnabled]);

  const toggleBGM = useCallback(() => {
    userInteractedRef.current = true;
    setIsBGMEnabled((prev) => !prev);
  }, []);

  return { isBGMEnabled, toggleBGM, currentTrack };
}
