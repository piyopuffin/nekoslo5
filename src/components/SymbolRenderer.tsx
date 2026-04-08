import type { NekosloSymbol } from '../config/symbol-definitions';
import { SYMBOL_DISPLAY, SYMBOL_IMAGE } from '../config/symbol-definitions';
import styles from './SymbolRenderer.module.css';

export interface SymbolRendererProps {
  symbolId: NekosloSymbol;
}

/**
 * NekosloSymbol のIDに基づいて画像または絵文字をレンダリングするコンポーネント。
 * 画像がある場合は画像を表示し、ない場合は絵文字フォールバック。
 */
export function SymbolRenderer({ symbolId }: SymbolRendererProps) {
  const imageSrc = SYMBOL_IMAGE[symbolId];
  const fallback = SYMBOL_DISPLAY[symbolId] ?? symbolId;

  if (imageSrc) {
    return (
      <span className={styles.symbol}>
        <img
          src={imageSrc}
          alt={fallback}
          className={styles.symbolImage}
          draggable={false}
        />
      </span>
    );
  }

  return <span className={styles.symbol}>{fallback}</span>;
}

/**
 * Reel コンポーネントの renderSymbol プロップ用関数。
 */
export function renderNekosloSymbol(symbolId: NekosloSymbol): React.ReactNode {
  return <SymbolRenderer symbolId={symbolId} />;
}
