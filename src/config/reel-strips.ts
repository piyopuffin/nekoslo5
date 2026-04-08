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
      'falafel','cat5','red7','replay','blue7','petri','cat5','falafel',
      'replay','cat5','bar','cat5','falafel','replay','falafel','cat5',
      'petri','falafel','replay','petri','replay'
    ],
  },
  // リール2（中）
  {
    symbols: SYMBOLS,
    reelStrip: [
      'falafel','petri','cat5','replay','blue7','red7',
      'petri','bar','replay','cat5','cat5','petri','falafel',
      'replay','bar','cat5','replay','petri',
      'falafel','replay','cat5'
    ],
  },
  // リール3（右）
  {
    symbols: SYMBOLS,
    reelStrip: [
      'replay','blue7','falafel','cat5','red7','replay',
      'bar','falafel','cat5','replay','falafel','cat5',
      'replay','cat5','falafel','petri','cat5',
      'replay','falafel','petri','cat5'
    ],
  },
];
