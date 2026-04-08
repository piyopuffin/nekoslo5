import { useState, useRef, useEffect, useCallback } from 'react';
import type { GameMode } from 'reeljs';

/** ゲームモードごとのBGMトラックマッピング */
export const BGM_TRACK_MAP: Record<GameMode, string> = {
  Normal: '/bgm/normal.mp3',
  Chance: '/bgm/chance.mp3',
  Bonus: '/bgm/bonus.mp3',
  BT: '/bgm/bt.mp3',
};

export interface UseBGMReturn {
  isBGMEnabled: boolean;
  toggleBGM: () => void;
  currentTrack: string | null;
}

/**
 * BGM管理フック。
 * GameModeの変更を監視し、モードに対応するBGMトラックに切り替える。
 * <audio> 要素でループ再生を行い、ブラウザAutoPlay制限に対応する。
 *
 * @param gameMode - 現在のゲームモード（propsとして受け取る）
 */
export function useBGM(gameMode: GameMode): UseBGMReturn {
  const [isBGMEnabled, setIsBGMEnabled] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const userInteractedRef = useRef(false);

  // audio要素の初期化（一度だけ）
  useEffect(() => {
    const audio = new Audio();
    audio.loop = true;
    audioRef.current = audio;

    // ユーザーインタラクション検知でAutoPlay制限を解除
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

  // GameMode変更時にBGMトラックを切り替え
  useEffect(() => {
    const track = BGM_TRACK_MAP[gameMode];
    setCurrentTrack(track);

    const audio = audioRef.current;
    if (!audio) return;

    // 同じトラックなら切り替え不要
    if (audio.src.endsWith(track)) return;

    audio.src = track;

    if (isBGMEnabled && userInteractedRef.current) {
      audio.play().catch((err) => {
        console.warn('BGM playback failed:', err);
      });
    }
  }, [gameMode, isBGMEnabled]);

  // BGM ON/OFF状態の変更に応じて再生/停止
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isBGMEnabled && userInteractedRef.current && currentTrack) {
      audio.play().catch((err) => {
        console.warn('BGM playback failed:', err);
      });
    } else {
      audio.pause();
    }
  }, [isBGMEnabled, currentTrack]);

  const toggleBGM = useCallback(() => {
    // トグル時にユーザーインタラクション済みとみなす
    userInteractedRef.current = true;
    setIsBGMEnabled((prev) => !prev);
  }, []);

  return {
    isBGMEnabled,
    toggleBGM,
    currentTrack,
  };
}
