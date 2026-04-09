import { useState } from 'react';
import type { UseNekosloGameReturn } from '../hooks/useNekosloGame';
import styles from './DebugPanel.module.css';

const FORCE_ROLES = [
  { id: 'super_big_bonus', label: 'SUPER BIG' },
  { id: 'big_bonus', label: 'BIG' },
  { id: 'reg_bonus', label: 'REG' },
  { id: 'chance_mode', label: 'チャンス' },
  { id: 'bar_hit', label: 'BAR揃い' },
  { id: 'cat5', label: 'cat5' },
  { id: 'replay', label: 'REPLAY' },
];

interface DebugPanelProps {
  game: UseNekosloGameReturn;
}

export function DebugPanel({ game }: DebugPanelProps) {
  const [open, setOpen] = useState(false);
  const { debug } = game;

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setOpen((p) => !p)}
      >
        🐛 {open ? '閉じる' : 'DEBUG'}
      </button>

      {open && (
        <div className={styles.panel}>
          <div className={styles.section}>
            <div className={styles.sectionTitle}>次ゲーム強制当選</div>
            <div className={styles.buttonGrid}>
              {FORCE_ROLES.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  className={`${styles.forceButton} ${debug.forcedRoleId === r.id ? styles.forceButtonActive : ''}`}
                  onClick={() => debug.forceNextRole(r.id)}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {debug.forcedRoleId && (
              <div className={styles.forced}>
                次ゲーム: {debug.forcedRoleId}
              </div>
            )}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>内部状態</div>
            <div className={styles.stateRow}>当選役: {debug.currentRoleId ?? '-'}</div>
            <div className={styles.stateRow}>isMiss: {String(debug.currentIsMiss)}</div>
            <div className={styles.stateRow}>持ち越し: {debug.hasCarryOver ? 'あり' : 'なし'}</div>
            <div className={styles.stateRow}>モード: {game.gameMode}</div>
            <div className={styles.stateRow}>フェーズ: {game.gamePhase}</div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>クレジット操作</div>
            <div className={styles.buttonGrid}>
              <button type="button" className={styles.actionButton} onClick={game.addCredit}>
                +100
              </button>
              <button
                type="button"
                className={styles.actionButton}
                onClick={() => {
                  for (let i = 0; i < 10; i++) game.addCredit();
                }}
              >
                +1000
              </button>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>天井カウンター</div>
            <div className={styles.stateRow}>現在: {game.normalSpinCount}G</div>
            <div className={styles.buttonGrid}>
              <button
                type="button"
                className={styles.actionButton}
                onClick={() => debug.setSpinCount(999)}
              >
                999Gにセット
              </button>
              <button
                type="button"
                className={styles.actionButton}
                onClick={() => debug.setSpinCount(0)}
              >
                リセット
              </button>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>設定変更</div>
            <div className={styles.buttonGrid}>
              {[1, 2, 3, 4, 5, 6].map((lv) => (
                <button
                  key={lv}
                  type="button"
                  className={styles.actionButton}
                  onClick={() => game.setDifficulty(lv)}
                >
                  設定{lv}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
