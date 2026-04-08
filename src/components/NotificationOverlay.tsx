import { useEffect, useState } from 'react';
import type { NotificationPayload } from 'reeljs';
import styles from './NotificationOverlay.module.css';

export interface NotificationOverlayProps {
  /** 告知ペイロード（nullの場合は非表示） */
  payload: NotificationPayload | null;
}

/**
 * 告知演出オーバーレイコンポーネント。
 * 先告知（PRE_SPIN）と後告知（POST_SPIN）で異なるアニメーションを表示する。
 */
export function NotificationOverlay({ payload }: NotificationOverlayProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (payload) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 1200);
      return () => clearTimeout(timer);
    }
    setVisible(false);
  }, [payload]);

  if (!visible || !payload) return null;

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
