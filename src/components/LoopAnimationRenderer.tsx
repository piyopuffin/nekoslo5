import type { GameMode } from 'reeljs';
import styles from './LoopAnimationRenderer.module.css';

/** ゲームモードごとのパーティクルCSSクラス */
const MODE_PARTICLES: Record<GameMode, string[]> = {
  Normal: [styles.normalP1, styles.normalP2, styles.normalP3],
  Chance: [styles.chanceP1, styles.chanceP2, styles.chanceP3],
  Bonus: [styles.bonusP1, styles.bonusP2, styles.bonusP3],
  BT: [styles.btP1, styles.btP2, styles.btP3],
};

export interface LoopAnimationRendererProps {
  /** 現在のゲームモード */
  gameMode: GameMode;
}

/**
 * ループアニメーションレンダラー。
 * CSS @keyframes を使用した軽量な背景アニメーション。
 * ゲームモードごとに異なるアニメーションパターンを表示する。
 * GPU アクセラレーション（translate3d）を活用。
 */
export function LoopAnimationRenderer({ gameMode }: LoopAnimationRendererProps) {
  const particles = MODE_PARTICLES[gameMode] ?? MODE_PARTICLES.Normal;

  return (
    <div className={styles.container}>
      {particles.map((cls, i) => (
        <div key={`${gameMode}-${i}`} className={`${styles.particle} ${cls}`} />
      ))}
    </div>
  );
}
