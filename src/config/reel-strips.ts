import type { ReelConfig } from 'reeljs';
import type { NekosloSymbol } from './symbol-definitions';
import { SYMBOLS } from './symbol-definitions';

/**
 * 3リール分のリールストリップ定義（各21コマ）
 * 全リールに7種類全てのシンボルを含む
 */
export const REEL_STRIPS: ReelConfig<NekosloSymbol>[] = [
  // リール1（左）
  {
    symbols: SYMBOLS,
    reelStrip: [
      'replay', 'cat5', 'falafel', 'petri', 'cat5', 'red7', 'replay', 'cat5',
      'falafel', 'bar', 'cat5', 'petri', 'replay', 'cat5', 'blue7', 'falafel',
      'cat5', 'petri', 'replay', 'cat5', 'bar',
    ],
  },
  // リール2（中）
  {
    symbols: SYMBOLS,
    reelStrip: [
      'cat5', 'replay', 'petri', 'falafel', 'cat5', 'red7', 'replay', 'cat5',
      'bar', 'petri', 'cat5', 'falafel', 'replay', 'cat5', 'blue7', 'petri',
      'cat5', 'falafel', 'replay', 'cat5', 'red7',
    ],
  },
  // リール3（右）
  {
    symbols: SYMBOLS,
    reelStrip: [
      'falafel', 'cat5', 'replay', 'petri', 'cat5', 'red7', 'bar', 'cat5',
      'replay', 'falafel', 'cat5', 'petri', 'blue7', 'cat5', 'replay', 'bar',
      'cat5', 'petri', 'falafel', 'cat5', 'replay',
    ],
  },
];
