import { useState } from 'react';
import styles from './SettingsScreen.module.css';

/** 各設定段階の機械割（%） */
const PAYOUT_RATES: Record<number, number> = {
  1: 93,
  2: 96,
  3: 99,
  4: 103,
  5: 108,
  6: 113,
};

export interface SettingsScreenProps {
  onStart: (difficultyLevel: number) => void;
}

/**
 * 設定画面コンポーネント。
 * 設定段階（1〜6）を選択し、「ゲーム開始」ボタンで GameScreen へ遷移する。
 */
export function SettingsScreen({ onStart }: SettingsScreenProps) {
  const [selected, setSelected] = useState(3);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>🐱 ねこスロ5</h1>
      <p className={styles.subtitle}>設定を選択してください</p>

      <div className={styles.settingsList} role="radiogroup" aria-label="設定段階">
        {[1, 2, 3, 4, 5, 6].map((level) => (
          <button
            key={level}
            type="button"
            role="radio"
            aria-checked={selected === level}
            className={`${styles.settingOption} ${selected === level ? styles.settingOptionSelected : ''}`}
            onClick={() => setSelected(level)}
          >
            <span className={styles.settingLabel}>設定{level}</span>
            <span className={styles.settingPayout}>機械割 {PAYOUT_RATES[level]}%</span>
          </button>
        ))}
      </div>

      <button
        type="button"
        className={styles.startButton}
        onClick={() => onStart(selected)}
      >
        ゲーム開始
      </button>
    </div>
  );
}
