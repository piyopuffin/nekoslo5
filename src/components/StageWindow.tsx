import type { GameMode, BonusType } from 'reeljs';
import styles from './StageWindow.module.css';

export interface StageWindowProps {
  gameMode: GameMode;
  bonusType: BonusType | null;
  bonusAccumulatedPayout: number;
  bonusRemainingSpins: number | null;
  bonusMaxSpins: number | null;
  /** ボーナス終了時の獲得枚数オーバーレイ */
  bonusEndPayout: number | null;
}

const MODE_BG: Record<GameMode, string> = {
  Normal: styles.bgNormal,
  Chance: styles.bgChance,
  Bonus: styles.bgBonus,
  BT: styles.bgBT,
};

const BONUS_LABEL: Record<string, string> = {
  SUPER_BIG_BONUS: 'SUPER BIG BONUS',
  BIG_BONUS: 'BIG BONUS',
  REG_BONUS: 'REG BONUS',
};

const BONUS_MAX_PAYOUT: Record<string, number> = {
  SUPER_BIG_BONUS: 400,
  BIG_BONUS: 220,
  REG_BONUS: 96,
};

export function StageWindow({
  gameMode,
  bonusType,
  bonusAccumulatedPayout,
  bonusRemainingSpins,
  bonusMaxSpins,
  bonusEndPayout,
}: StageWindowProps) {
  const bgClass = MODE_BG[gameMode] ?? styles.bgNormal;
  const consumed = bonusMaxSpins != null && bonusRemainingSpins != null
    ? bonusMaxSpins - bonusRemainingSpins
    : null;

  return (
    <div className={`${styles.window} ${bgClass}`}>
      {gameMode === 'Normal' && !bonusEndPayout && (
        <div className={styles.content}>🐱</div>
      )}

      {gameMode === 'Chance' && (
        <div className={styles.content}>
          <div className={styles.title}>ﾍﾟﾆｭﾌﾟﾋﾟﾘｭﾘｭﾘｭﾐﾋﾟﾋﾟｭﾎﾟｨﾎﾟﾋﾟﾘｨ</div>
          {consumed != null && bonusMaxSpins != null && (
            <div className={styles.gameCount}>{consumed} / {bonusMaxSpins} G</div>
          )}
        </div>
      )}

      {gameMode === 'Bonus' && bonusType && (
        <div className={styles.content}>
          <div className={styles.title}>{BONUS_LABEL[bonusType] ?? bonusType}</div>
          <div className={styles.payout}>
            {bonusAccumulatedPayout} / {BONUS_MAX_PAYOUT[bonusType] ?? 0} 枚
          </div>
          {consumed != null && bonusMaxSpins != null && (
            <div className={styles.gameCount}>{consumed} / {bonusMaxSpins} G</div>
          )}
        </div>
      )}

      {gameMode === 'BT' && (
        <div className={styles.content}>
          <div className={styles.title}>BT</div>
          {consumed != null && bonusMaxSpins != null && (
            <div className={styles.gameCount}>{consumed} / {bonusMaxSpins} G</div>
          )}
        </div>
      )}

      {bonusEndPayout != null && (
        <div className={styles.overlay}>
          <div className={styles.overlayTitle}>BONUS COMPLETE</div>
          <div className={styles.overlayPayout}>{bonusEndPayout} 枚獲得</div>
        </div>
      )}
    </div>
  );
}
