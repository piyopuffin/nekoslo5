import { useState, useCallback } from 'react';

export type SoundEvent = 'lever' | 'stop' | 'payout' | 'bonusConfirm';

export const SOUND_MAP: Record<SoundEvent, string> = {
  lever: '/sounds/lever.mp3',
  stop: '/sounds/stop.mp3',
  payout: '/sounds/payout.mp3',
  bonusConfirm: '/sounds/bonus-confirm.mp3',
};

export interface UseSoundEffectsReturn {
  isSoundEnabled: boolean;
  toggleSound: () => void;
  playSound: (event: SoundEvent) => void;
}

export function useSoundEffects(): UseSoundEffectsReturn {
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);

  const playSound = useCallback(
    (event: SoundEvent) => {
      if (!isSoundEnabled) return;
      const src = SOUND_MAP[event];
      if (!src) return;
      try {
        const audio = new Audio(src);
        audio.volume = 1.0;
        audio.play().catch((err) => {
          console.warn(`Sound playback failed for "${event}" (${src}):`, err);
        });
      } catch (err) {
        console.warn(`Failed to load sound "${event}" (${src}):`, err);
      }
    },
    [isSoundEnabled],
  );

  const toggleSound = useCallback(() => {
    setIsSoundEnabled((prev) => !prev);
  }, []);

  return { isSoundEnabled, toggleSound, playSound };
}
