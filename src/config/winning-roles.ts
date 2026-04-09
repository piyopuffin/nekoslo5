import type { WinningRoleDefinition } from 'reeljs';

/**
 * ねこスロ5の全当選役定義
 */
export const WINNING_ROLE_DEFINITIONS: WinningRoleDefinition[] = [
  // ボーナス役
  {
    id: 'super_big_bonus',
    name: 'SUPER BIG BONUS',
    type: 'BONUS',
    bonusType: 'SUPER_BIG_BONUS',
    payout: 0,
    patterns: [['red7', 'red7', 'red7']],
    priority: 100,
  },
  {
    id: 'big_bonus',
    name: 'BIG BONUS',
    type: 'BONUS',
    bonusType: 'BIG_BONUS',
    payout: 0,
    patterns: [['blue7', 'blue7', 'blue7']],
    priority: 90,
  },
  {
    id: 'reg_bonus',
    name: 'REG BONUS',
    type: 'BONUS',
    bonusType: 'REG_BONUS',
    payout: 0,
    patterns: [['red7', 'red7', 'bar'], ['blue7', 'blue7', 'bar']],
    priority: 80,
  },
  {
    id: 'chance_mode',
    name: 'ﾍﾟﾆｭﾌﾟﾋﾟﾘｭﾘｭﾘｭﾐﾋﾟﾋﾟｭﾎﾟｨﾎﾟﾋﾟﾘｨ',
    type: 'BONUS',
    payout: 90,
    patterns: [['red7', 'red7', 'blue7'], ['blue7', 'blue7', 'red7']],
    priority: 70,
  },
  // BT中BAR揃い
  {
    id: 'bar_hit',
    name: 'BAR揃い',
    type: 'SMALL_WIN',
    payout: 200,
    patterns: [['bar', 'bar', 'bar']],
    priority: 60,
  },
  // 小役
  {
    id: 'cat5',
    name: 'cat5',
    type: 'SMALL_WIN',
    payout: 10,
    patterns: [['cat5', 'cat5', 'cat5']],
    priority: 30,
  },
  {
    id: 'falafel',
    name: 'ファラフェル',
    type: 'SMALL_WIN',
    payout: 6,
    patterns: [['falafel', 'falafel', 'falafel']],
    priority: 20,
  },
  {
    id: 'petri',
    name: 'ペトリ皿',
    type: 'SMALL_WIN',
    payout: 2,
    patterns: [['ANY', 'ANY', 'petri']],
    priority: 10,
  },
  // リプレイ
  {
    id: 'replay',
    name: 'REPLAY',
    type: 'REPLAY',
    payout: 0,
    patterns: [['replay', 'replay', 'replay']],
    priority: 5,
  },
  // ハズレ
  {
    id: 'miss',
    name: 'ハズレ',
    type: 'MISS',
    payout: 0,
    patterns: [],
    priority: 0,
  },
];
