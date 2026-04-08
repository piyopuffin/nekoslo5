import { useEffect, useRef } from 'react';
import { useNekosloGame } from '../hooks/useNekosloGame';
import { useBGM } from '../hooks/useBGM';
import { useSoundEffects } from '../hooks/useSoundEffects';
import { ReelDisplay } from './ReelDisplay';
import { ControlPanel } from './ControlPanel';
import { InfoPanel } from './InfoPanel';
import { NotificationOverlay } from './NotificationOverlay';
import { LoopAnimationRenderer } from './LoopAnimationRenderer';
import styles from './GameScreen.module.css';

export interface GameScreenProps {
  /** 選択された設定段階 */
  difficultyLevel: number;
}

/**
 * ゲーム画面コンポーネント。
 * useNekosloGame、useBGM、useSoundEffects フックを使用し、
 * 全UIコンポーネントを統合する。
 */
export function GameScreen({ difficultyLevel }: GameScreenProps) {
  const game = useNekosloGame(difficultyLevel);
  const bgm = useBGM(game.gameMode);
  const sound = useSoundEffects();

  const handleLeverOn = () => {
    sound.playSound('lever');
    game.handleLeverOn();
  };

  const handleStop = (reelIndex: number) => {
    sound.playSound('stop');
    game.handleStop(reelIndex);
  };

  const lastPayout = game.spinResult?.totalPayout ?? 0;

  // 配当発生時にpayout音を再生
  const prevSpinResultRef = useRef(game.spinResult);
  useEffect(() => {
    if (game.spinResult && game.spinResult !== prevSpinResultRef.current) {
      if (game.spinResult.totalPayout > 0) {
        sound.playSound('payout');
      }
    }
    prevSpinResultRef.current = game.spinResult;
  }, [game.spinResult, sound]);

  // ボーナス確定時にbonusConfirm音を再生
  const prevNotificationRef = useRef(game.notificationPayload);
  useEffect(() => {
    if (game.notificationPayload && game.notificationPayload !== prevNotificationRef.current) {
      sound.playSound('bonusConfirm');
    }
    prevNotificationRef.current = game.notificationPayload;
  }, [game.notificationPayload, sound]);

  return (
    <div className={styles.screen}>
      {/* ヘッダー: タイトル + サウンド/BGMトグル */}
      <div className={styles.header}>
        <h1 className={styles.title}>🐱 ねこスロ5</h1>
        <div className={styles.toggleRow}>
          <button
            type="button"
            className={`${styles.toggleButton} ${sound.isSoundEnabled ? styles.toggleButtonActive : ''}`}
            onClick={sound.toggleSound}
            aria-label="効果音トグル"
          >
            🔊 SE
          </button>
          <button
            type="button"
            className={`${styles.toggleButton} ${bgm.isBGMEnabled ? styles.toggleButtonActive : ''}`}
            onClick={bgm.toggleBGM}
            aria-label="BGMトグル"
          >
            🎵 BGM
          </button>
        </div>
      </div>

      {/* 情報パネル */}
      <div className={styles.gameBody}>
        <InfoPanel
          balance={game.creditState.balance}
          currentBet={game.creditState.currentBet}
          lastPayout={lastPayout}
          gameMode={game.gameMode}
          bonusType={game.bonusType}
          bonusAccumulatedPayout={game.bonusAccumulatedPayout}
          normalSpinCount={game.normalSpinCount}
          isReplay={game.isReplay}
        />

        {/* リール表示エリア（ループアニメーション + 告知オーバーレイ付き） */}
        <div className={styles.reelArea}>
          <LoopAnimationRenderer gameMode={game.gameMode} />
          <ReelDisplay
            reelSpinning={game.reelSpinning}
            reelStopPositions={game.reelStopPositions}
          />
          <NotificationOverlay payload={game.notificationPayload} />
        </div>

        {/* 操作パネル */}
        <ControlPanel
          handleLeverOn={handleLeverOn}
          handleStop={handleStop}
          setBet={game.setBet}
          reelSpinning={game.reelSpinning}
          currentBet={game.creditState.currentBet}
          balance={game.creditState.balance}
          isReplay={game.isReplay}
        />
      </div>
    </div>
  );
}
