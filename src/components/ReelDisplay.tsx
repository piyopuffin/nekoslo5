import { Reel } from 'reeljs';
import type { NekosloSymbol } from '../config/symbol-definitions';
import { REEL_STRIPS } from '../config/reel-strips';
import { renderNekosloSymbol } from './SymbolRenderer';
import styles from './ReelDisplay.module.css';

const SYMBOL_HEIGHT = 64;
const ROW_COUNT = 3;

export interface ReelDisplayProps {
  /** 各リールの回転状態 [左, 中, 右] */
  reelSpinning: boolean[];
  /** 各リールの停止位置 [左, 中, 右] */
  reelStopPositions: number[];
}

/**
 * 3リール×3行の表示窓コンポーネント。
 * 各リールの停止位置を個別に追跡し、停止時のシンボルズレを防ぐ。
 */
export function ReelDisplay({ reelSpinning, reelStopPositions }: ReelDisplayProps) {
  return (
    <div className={styles.reelContainer}>
      <div className={styles.centerLine} />
      {REEL_STRIPS.map((reelConfig, idx) => (
        <div key={idx} className={styles.reelWrapper}>
          <Reel<NekosloSymbol>
            symbols={reelConfig.reelStrip}
            spinning={reelSpinning[idx] ?? false}
            stopPosition={reelStopPositions[idx] ?? 0}
            renderSymbol={renderNekosloSymbol}
            rowCount={ROW_COUNT}
            symbolHeight={SYMBOL_HEIGHT}
            spinDuration={1.0}
            direction="down"
          />
        </div>
      ))}
    </div>
  );
}
