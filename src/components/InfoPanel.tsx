import type { GameMode, BonusType } from 'reeljs';
import styles from './InfoPanel.module.css';

/** ボーナス種別ごとの最大獲得枚数 */
const BONUS_MAX_PAYOUT: Record<string, number> = {
  SUPER_BIG_BONUS: 400,
  BIG_BONUS: 220,
  REG_BONUS: 96,
};

/** ゲームモードの表示名 */
const MODE_DISPLAY: Record<GameMode, string> = {
  Normal: '通常',
  Chance: 'ﾍﾟﾆｭﾌﾟﾋﾟﾘｭﾘｭﾘｭﾐﾋﾟﾋﾟｭﾎﾟｨﾎﾟﾋﾟﾘｨ',
  Bonus: 'ボーナス',
  BT: 'BT',
};

/** ゲームモードのCSSクラス */
const MODE_CLASS: Record<GameMode, string> = {
  Normal: styles.modeNormal,
  Chance: styles.modeChance,
  Bonus: styles.modeBonus,
  BT: styles.modeBT,
};

export interface InfoPanelProps {
  balance: number;
  currentBet: number;
  lastPayout: number;
  lastRoleName: string | null;
  gameMode: GameMode;
  bonusType: BonusType | null;
  bonusAccumulatedPayout: number;
  normalSpinCount: number;
  totalGameCount: number;
  totalInvested: number;
  isReplay?: boolean;
  onAddCredit: () => void;
}

export function InfoPanel({
  balance,
  currentBet,
  lastPayout,
  lastRoleName,
  gameMode,
  bonusType,
  bonusAccumulatedPayout,
  normalSpinCount,
  totalGameCount,
  totalInvested,
  isReplay = false,
  onAddCredit,
}: InfoPanelProps) {
  const maxPayout = bonusType ? (BONUS_MAX_PAYOUT[bonusType] ?? 0) : 0;
  const ceilingRemaining = 1000 - normalSpinCount;
  const isInsufficientCredit = !isReplay && balance < currentBet;

  return (
    <div className={styles.panel}>
      <div className={styles.item}>
        <span className={styles.label}>CREDIT</span>
        <span className={styles.value}>{balance}</span>
      </div>
      <div className={styles.item}>
        <span className={styles.label}>WIN</span>
        <span className={styles.value}>{lastPayout}</span>
        <span className={styles.roleName}>{lastRoleName ?? '\u00A0'}</span>
      </div>
      <div className={styles.item}>
        <span className={styles.label}>投資</span>
        <span className={styles.value}>{totalInvested}</span>
      </div>

      <div className={styles.item}>
        <span className={styles.label}>MODE</span>
        <span className={`${styles.value} ${MODE_CLASS[gameMode]}`}>
          {MODE_DISPLAY[gameMode]}
        </span>
      </div>
      <div className={styles.item}>
        <span className={styles.label}>GAME</span>
        <span className={styles.value}>{totalGameCount}</span>
      </div>

      {gameMode === 'Bonus' && bonusType && (
        <div className={styles.bonusInfo}>
          {bonusType.replace(/_/g, ' ')} — {bonusAccumulatedPayout} / {maxPayout}枚
        </div>
      )}

      {gameMode === 'Normal' && (
        <div className={styles.spinCounter}>
          天井まで: {ceilingRemaining}G
        </div>
      )}

      {isInsufficientCredit && (
        <div className={styles.warning}>
          クレジット不足
          <button
            type="button"
            className={styles.addCreditButton}
            onClick={onAddCredit}
          >
            +100枚追加
          </button>
        </div>
      )}
    </div>
  );
}
