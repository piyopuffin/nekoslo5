import type { NotificationPayload } from 'reeljs';
import styles from './NotificationOverlay.module.css';

export interface NotificationOverlayProps {
  payload: NotificationPayload | null;
}

/**
 * 告知演出オーバーレイコンポーネント。
 * payloadがnull以外の時に表示される。表示/非表示は親コンポーネントが制御する。
 */
export function NotificationOverlay({ payload }: NotificationOverlayProps) {
  if (!payload) return null;

  const isPreSpin = payload.type === 'PRE_SPIN';
  const animClass = isPreSpin ? styles.preSpin : styles.postSpin;

  return (
    <div className={`${styles.overlay} ${animClass}`}>
      <div className={styles.content}>
        🎉 {payload.winningRole.name} 確定！
      </div>
    </div>
  );
}
