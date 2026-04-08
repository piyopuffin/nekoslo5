import { SymbolRenderer } from './SymbolRenderer';
import type { NekosloSymbol } from '../config/symbol-definitions';

/**
 * Reel コンポーネントの renderSymbol プロップ用関数。
 */
export function renderNekosloSymbol(symbolId: NekosloSymbol): React.ReactNode {
  return <SymbolRenderer symbolId={symbolId} />;
}
