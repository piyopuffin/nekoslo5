import type { Payline, PayTable } from 'reeljs';
import type { NekosloSymbol } from './symbol-definitions';

/**
 * ペトリ皿のANYワイルドカードを含むシンボル型
 */
export type PayTableSymbol = NekosloSymbol | 'ANY';

/**
 * 5本のPayline定義
 */
export const PAYLINES: Payline[] = [
  { index: 0, positions: [0, 0, 0] }, // 上段横一列
  { index: 1, positions: [1, 1, 1] }, // 中段横一列
  { index: 2, positions: [2, 2, 2] }, // 下段横一列
  { index: 3, positions: [0, 1, 2] }, // 右下がり斜め
  { index: 4, positions: [2, 1, 0] }, // 右上がり斜め
];

/**
 * BET額ごとの有効Paylineインデックス
 */
export const PAYLINES_PER_BET: Record<number, number[]> = {
  1: [1],              // 中段のみ
  2: [0, 1, 2],        // 上段・中段・下段
  3: [0, 1, 2, 3, 4],  // 全5本
};

/**
 * 配当表定義
 * ボーナス役のpayoutは0（GameModeManagerで管理）
 */
export const PAY_TABLE: PayTable<PayTableSymbol> = {
  entries: [
    // ボーナス役
    { pattern: ['red7', 'red7', 'red7'],       payout: 0,   roleType: 'BONUS' },     // SUPER_BIG
    { pattern: ['blue7', 'blue7', 'blue7'],     payout: 0,   roleType: 'BONUS' },    // BIG
    { pattern: ['red7', 'red7', 'bar'],         payout: 0,   roleType: 'BONUS' },    // REG
    { pattern: ['blue7', 'blue7', 'bar'],       payout: 0,   roleType: 'BONUS' },    // REG
    { pattern: ['red7', 'red7', 'blue7'],       payout: 0,   roleType: 'BONUS' },    // チャンス
    { pattern: ['blue7', 'blue7', 'red7'],      payout: 0,   roleType: 'BONUS' },    // チャンス
    // BT中BAR揃い
    { pattern: ['bar', 'bar', 'bar'],           payout: 200, roleType: 'SMALL_WIN' },
    // 小役
    { pattern: ['cat5', 'cat5', 'cat5'],        payout: 8,  roleType: 'SMALL_WIN' },
    { pattern: ['falafel', 'falafel', 'falafel'], payout: 6, roleType: 'SMALL_WIN' },
    { pattern: ['ANY', 'ANY', 'petri'],         payout: 2,   roleType: 'SMALL_WIN' },
    // リプレイ
    { pattern: ['replay', 'replay', 'replay'],  payout: 0,   roleType: 'REPLAY' },
  ],
};
