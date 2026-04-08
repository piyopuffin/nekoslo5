import type { NekosloSymbol } from '../config/symbol-definitions';
import { SYMBOL_DISPLAY, SYMBOL_IMAGE } from '../config/symbol-definitions';
import styles from './SymbolRenderer.module.css';

export interface SymbolRendererProps {
  symbolId: NekosloSymbol;
}

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
