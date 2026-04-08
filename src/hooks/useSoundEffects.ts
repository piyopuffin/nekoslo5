import { useState, useCallback, useRef } from 'react';

/** ねこスロ5固有のサウンドイベント種別 */
export type SoundEvent = 'lever' | 'stop' | 'payout' | 'bonusConfirm';

/** サウンドイベントとファイルパスのマッピング */
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

/**
 * 効果音管理フック。
 * ねこスロ5固有のサウンドマッピングを定義し、各ゲームイベントに対応する効果音を再生する。
 * サウンドファイル読み込み失敗時はコンソール警告を出力し続行する。
 */
export function useSoundEffects(): UseSoundEffectsReturn {
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const isSoundEnabledRef = useRef(isSoundEnabled);
  isSoundEnabledRef.current = isSoundEnabled;

  const playSound = useCallback((event: SoundEvent) => {
    if (!isSoundEnabledRef.current) return;

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
  }, []);

  const toggleSound = useCallback(() => {
    setIsSoundEnabled((prev) => !prev);
  }, []);

  return {
    isSoundEnabled,
    toggleSound,
    playSound,
  };
}
