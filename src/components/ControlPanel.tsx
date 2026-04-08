import leverImg from '../assets/lever.png';
import styles from './ControlPanel.module.css';

export interface ControlPanelProps {
  handleLeverOn: () => void;
  handleStop: (reelIndex: number) => void;
  setBet: (amount: number) => void;
  reelSpinning: boolean[];
  currentBet: number;
  balance: number;
  isReplay: boolean;
}

export function ControlPanel({
  handleLeverOn,
  handleStop,
  setBet,
  reelSpinning,
  currentBet,
  balance,
  isReplay,
}: ControlPanelProps) {
  const anySpinning = reelSpinning.some(Boolean);
  const leverDisabled = anySpinning || (!isReplay && balance < currentBet);

  return (
    <div className={styles.panel}>
      {/* ストップボタン */}
      <div className={styles.stopRow}>
        {[0, 1, 2].map((idx) => (
          <button
            key={idx}
            type="button"
            className={`${styles.stopButton} ${reelSpinning[idx] ? styles.stopButtonActive : ''}`}
            disabled={!reelSpinning[idx]}
            onClick={() => handleStop(idx)}
            aria-label={`リール${idx + 1}停止`}
          />
        ))}
      </div>

      {/* レバー */}
      <div className={styles.leverRow}>
        <button
          type="button"
          className={styles.leverButton}
          disabled={leverDisabled}
          onClick={handleLeverOn}
          aria-label="レバーON"
        >
          <img
            src={leverImg}
            alt="レバー"
            className={styles.leverImage}
            draggable={false}
          />
        </button>
      </div>

      {/* BET変更 */}
      <div className={styles.betRow}>
        <span className={styles.betLabel}>BET:</span>
        {[1, 2, 3].map((bet) => (
          <button
            key={bet}
            type="button"
            className={`${styles.betButton} ${currentBet === bet ? styles.betButtonActive : ''}`}
            disabled={anySpinning}
            onClick={() => setBet(bet)}
            aria-label={`BET ${bet}枚`}
          >
            {bet}
          </button>
        ))}
      </div>
    </div>
  );
}
