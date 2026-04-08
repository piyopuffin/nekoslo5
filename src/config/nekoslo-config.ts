import type { GameConfig, PayTable } from 'reeljs';
import type { NekosloSymbol } from './symbol-definitions';
import { REEL_STRIPS } from './reel-strips';
import { PAY_TABLE, PAYLINES, PAYLINES_PER_BET } from './pay-table';
import { WINNING_ROLE_DEFINITIONS } from './winning-roles';
import { DIFFICULTY_PRESETS } from './difficulty-presets';

/**
 * ねこスロ5のゲーム全体設定を構築する。
 *
 * @param difficultyLevel - 初期設定段階（1〜6、デフォルト3）
 * @returns GameConfig<NekosloSymbol>
 */
export function createNekosloConfig(
  difficultyLevel: number = 3,
): GameConfig<NekosloSymbol> {
  return {
    reelConfigs: REEL_STRIPS,

    // PAY_TABLE uses 'ANY' wildcard for petri pattern; cast to satisfy generic constraint
    payTable: PAY_TABLE as unknown as PayTable<NekosloSymbol>,

    paylines: PAYLINES,

    modeTransitionConfig: {
      normalToChance: DIFFICULTY_PRESETS.levels[difficultyLevel]?.transitionProbabilities.normalToChance ?? 0.003,
      chanceTobt: 1.0,   // チャンスモード成立 → 必ずBT突入
      btToSuperBigBonus: 0.1,
    },

    bonusConfigs: {
      SUPER_BIG_BONUS: {
        type: 'SUPER_BIG_BONUS',
        payoutMultiplier: 1,
        maxSpins: 100,
        maxPayout: 400,
      },
      BIG_BONUS: {
        type: 'BIG_BONUS',
        payoutMultiplier: 1,
        maxSpins: 60,
        maxPayout: 220,
      },
      REG_BONUS: {
        type: 'REG_BONUS',
        payoutMultiplier: 1,
        maxSpins: 30,
        maxPayout: 96,
      },
    },

    btConfig: {
      maxSpins: 100,
      maxPayout: 1000,
      winPatterns: [{ symbols: ['bar', 'bar', 'bar'] }],
    },

    chanceConfig: {
      maxSpins: 1,
      maxPayout: 90,
      winPatterns: [
        { symbols: ['red7', 'red7', 'blue7'] },
        { symbols: ['blue7', 'blue7', 'red7'] },
      ],
    },

    notificationConfig: {
      enabledTypes: { PRE_SPIN: true, POST_SPIN: true },
      targetRoleTypes: ['BONUS'],
    },

    zoneConfigs: {
      normal: {
        name: '通常区間',
        maxGames: 1500,
        maxNetCredits: 2400,
        resetTargets: ['spinCounter'],
        nextZone: 'normal',
        isSpecial: false,
      },
    },

    betConfig: {
      initialCredit: 100,
      betOptions: [1, 2, 3],
      defaultBet: 3,
      paylinesPerBet: PAYLINES_PER_BET,
    },

    thresholdConfigs: [
      {
        counterName: 'normalSpins',
        targetGameMode: 'Normal',
        threshold: 1000,
        action: 'forceChance',
        resetCondition: 'BonusMode',
      },
    ],

    difficultyConfigs: DIFFICULTY_PRESETS.levels,

    winningRoleDefinitions: WINNING_ROLE_DEFINITIONS,
  };
}
