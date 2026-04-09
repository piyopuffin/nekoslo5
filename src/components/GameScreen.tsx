import { useEffect, useRef, useState } from 'react';
import { useNekosloGame } from '../hooks/useNekosloGame';
import { useBGM } from '../hooks/useBGM';
import { useSoundEffects } from '../hooks/useSoundEffects';
import { ReelDisplay } from './ReelDisplay';
import { ControlPanel } from './ControlPanel';
import { InfoPanel } from './InfoPanel';
import { NotificationOverlay } from './NotificationOverlay';
import { LoopAnimationRenderer } from './LoopAnimationRenderer';
import { StageWindow } from './StageWindow';
import { DebugPanel } from './DebugPanel';
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

  // ボーナス成立時にbonusConfirm音を再生 + ボーナス終了時の獲得枚数表示
  const [bonusEndPayout, setBonusEndPayout] = useState<number | null>(null);
  const prevGameModeRef = useRef(game.gameMode);
  const prevBonusPayoutRef = useRef(game.bonusAccumulatedPayout);
  const bonusEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // bonusAccumulatedPayoutの追跡
  useEffect(() => {
    if (game.gameMode === 'Bonus' || game.gameMode === 'BT') {
      prevBonusPayoutRef.current = game.bonusAccumulatedPayout;
    }
  }, [game.bonusAccumulatedPayout, game.gameMode]);

  useEffect(() => {
    const prev = prevGameModeRef.current;
    const curr = game.gameMode;
    prevGameModeRef.current = curr;

    if (prev === curr) return;

    // ボーナス成立時
    if (curr === 'Bonus' && prev !== 'Bonus') {
      sound.playSound('bonusConfirm');
    }

    // ボーナス/BT終了時 → 獲得枚数オーバーレイ表示
    if ((prev === 'Bonus' || prev === 'BT') && curr !== 'Bonus' && curr !== 'BT') {
      const payout = prevBonusPayoutRef.current;
      if (payout > 0) {
        // 前のタイマーがあればクリア
        if (bonusEndTimerRef.current) clearTimeout(bonusEndTimerRef.current);
        setBonusEndPayout(payout);
        bonusEndTimerRef.current = setTimeout(() => {
          setBonusEndPayout(null);
          bonusEndTimerRef.current = null;
        }, 5000);
      }
    }
  }, [game.gameMode, sound]);
  const lastRoleName = (() => {
    const sr = game.spinResult;
    if (!sr) return null;
    // winLinesから実際に成立した小役名を取得（ボーナス中でも小役がわかる）
    if (sr.winLines.length > 0) {
      // 最も配当の高いwinLineの役名を表示
      const topWin = sr.winLines.reduce((a, b) => a.payout > b.payout ? a : b);
      const matched = topWin.matchedSymbols;
      // 配当表の役名にマッピング
      if (matched.every(s => s === 'cat5')) return 'cat5';
      if (matched.every(s => s === 'falafel')) return 'ファラフェル';
      if (matched[2] === 'petri') return 'ペトリ皿';
      if (matched.every(s => s === 'replay')) return 'REPLAY';
      if (matched.every(s => s === 'bar')) return 'BAR揃い';
      if (matched.every(s => s === 'red7')) return 'SUPER BIG';
      if (matched.every(s => s === 'blue7')) return 'BIG';
      return topWin.matchedSymbols.join(' ');
    }
    if (sr.isReplay) return 'REPLAY';
    return null;
  })();

  return (
    <div className={styles.screen}>
      {/* ヘッダー: 筐体の外 */}
      <header className={styles.header}>
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
      </header>

      {/* 情報欄: 筐体の外 */}
      <InfoPanel
        balance={game.creditState.balance}
        currentBet={game.creditState.currentBet}
        lastPayout={lastPayout}
        lastRoleName={lastRoleName}
        gameMode={game.gameMode}
        bonusType={game.bonusType}
        bonusAccumulatedPayout={game.bonusAccumulatedPayout}
        normalSpinCount={game.normalSpinCount}
        totalGameCount={game.totalGameCount}
        totalInvested={game.totalInvested}
        isReplay={game.isReplay}
        onAddCredit={game.addCredit}
      />

      {/* 筐体 */}
      <div className={styles.cabinet}>
        <LoopAnimationRenderer gameMode={game.gameMode} />

        {/* 演出ウィンドウ */}
        <StageWindow
          gameMode={game.gameMode}
          bonusType={game.bonusType}
          bonusAccumulatedPayout={game.bonusAccumulatedPayout}
          bonusRemainingSpins={game.bonusRemainingSpins}
          bonusMaxSpins={game.bonusMaxSpins}
          bonusEndPayout={bonusEndPayout}
        />

        {/* リール表示エリア */}
        <div className={styles.reelArea}>
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
      {import.meta.env.DEV && <DebugPanel game={game} />}
    </div>
  );
}
