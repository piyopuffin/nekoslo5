import type { SymbolDefinition } from 'reeljs';

/**
 * ねこスロ5のシンボルID型
 */
export type NekosloSymbol =
  | 'red7'
  | 'blue7'
  | 'bar'
  | 'cat5'
  | 'falafel'
  | 'petri'
  | 'replay';

/**
 * 7種類のシンボル定義
 */
export const SYMBOLS: SymbolDefinition<NekosloSymbol>[] = [
  { id: 'red7',    name: '赤7',         weight: 1 },
  { id: 'blue7',   name: '青7',         weight: 1 },
  { id: 'bar',     name: 'BAR',         weight: 2 },
  { id: 'cat5',    name: 'cat5',        weight: 8 },
  { id: 'falafel', name: 'ファラフェル', weight: 6 },
  { id: 'petri',   name: 'ペトリ皿',    weight: 10 },
  { id: 'replay',  name: 'REPLAY',      weight: 12 },
];

/**
 * 各シンボルの絵文字フォールバック表示マッピング
 */
export const SYMBOL_DISPLAY: Record<NekosloSymbol, string> = {
  red7:    '🔴7',
  blue7:   '🔵7',
  bar:     'BAR',
  cat5:    '🐱',
  falafel: '🧆',
  petri:   '🧫',
  replay:  '🔄',
};

/**
 * 各シンボルの画像パスマッピング（public/symbols/ に配置）
 * BASE_URLを考慮してパスを構築
 */
export const SYMBOL_IMAGE: Record<NekosloSymbol, string> = {
  red7:    `${import.meta.env.BASE_URL}symbols/red7.png`,
  blue7:   `${import.meta.env.BASE_URL}symbols/blue7.png`,
  bar:     `${import.meta.env.BASE_URL}symbols/bar.png`,
  cat5:    `${import.meta.env.BASE_URL}symbols/cat5.png`,
  falafel: `${import.meta.env.BASE_URL}symbols/falafel.png`,
  petri:   `${import.meta.env.BASE_URL}symbols/petri.png`,
  replay:  `${import.meta.env.BASE_URL}symbols/replay.png`,
};
