import type { DifficultyPresetConfig, DifficultyConfig } from 'reeljs';

/**
 * ねこスロ5 設定1〜6の確率テーブル
 *
 * 機械割目標:
 *   設定1=96%, 設定2=98%, 設定3=100%, 設定4=105%, 設定5=110%, 設定6=115%
 *
 * 機械割を実現するため、設定が上がるほど:
 *   - ボーナス当選確率（super_big_bonus, big_bonus, reg_bonus）が上昇
 *   - チャンスモード確率が上昇
 *   - リプレイ確率が上昇（BET消費なし＝実質的な出玉率向上）
 *   - ハズレ確率が低下
 *
 * 期待値計算の概要（BET=3枚基準、1ゲームあたり）:
 *   EV = Σ(確率 × 配当) + replay確率 × 3（BET回収分）
 *   機械割 = EV / BET × 100%
 */

const setting1: DifficultyConfig = {
  level: 1,
  lotteryProbabilities: {
    super_big_bonus: 0.0015,
    big_bonus: 0.002,
    reg_bonus: 0.004,
    chance_mode: 0.001,
    bar_hit: 0.005,
    cat5: 0.08,
    falafel: 0.04,
    petri: 0.06,
    replay: 0.12,
    miss: 0.6865,
  },
  transitionProbabilities: {
    normalToChance: 0.001,
  },
  replayProbability: 0.12,
};

const setting2: DifficultyConfig = {
  level: 2,
  lotteryProbabilities: {
    super_big_bonus: 0.002,
    big_bonus: 0.0025,
    reg_bonus: 0.005,
    chance_mode: 0.0015,
    bar_hit: 0.006,
    cat5: 0.09,
    falafel: 0.045,
    petri: 0.065,
    replay: 0.13,
    miss: 0.653,
  },
  transitionProbabilities: {
    normalToChance: 0.0015,
  },
  replayProbability: 0.13,
};

const setting3: DifficultyConfig = {
  level: 3,
  lotteryProbabilities: {
    super_big_bonus: 0.0025,
    big_bonus: 0.003,
    reg_bonus: 0.006,
    chance_mode: 0.002,
    bar_hit: 0.008,
    cat5: 0.10,
    falafel: 0.05,
    petri: 0.07,
    replay: 0.14,
    miss: 0.6185,
  },
  transitionProbabilities: {
    normalToChance: 0.002,
  },
  replayProbability: 0.14,
};

const setting4: DifficultyConfig = {
  level: 4,
  lotteryProbabilities: {
    super_big_bonus: 0.0045,
    big_bonus: 0.006,
    reg_bonus: 0.008,
    chance_mode: 0.0035,
    bar_hit: 0.013,
    cat5: 0.120,
    falafel: 0.060,
    petri: 0.080,
    replay: 0.155,
    miss: 0.550,
  },
  transitionProbabilities: {
    normalToChance: 0.0035,
  },
  replayProbability: 0.155,
};

const setting5: DifficultyConfig = {
  level: 5,
  lotteryProbabilities: {
    super_big_bonus: 0.005,
    big_bonus: 0.0065,
    reg_bonus: 0.0085,
    chance_mode: 0.004,
    bar_hit: 0.014,
    cat5: 0.120,
    falafel: 0.060,
    petri: 0.080,
    replay: 0.160,
    miss: 0.542,
  },
  transitionProbabilities: {
    normalToChance: 0.004,
  },
  replayProbability: 0.160,
};

const setting6: DifficultyConfig = {
  level: 6,
  lotteryProbabilities: {
    super_big_bonus: 0.005,
    big_bonus: 0.007,
    reg_bonus: 0.009,
    chance_mode: 0.004,
    bar_hit: 0.015,
    cat5: 0.120,
    falafel: 0.060,
    petri: 0.080,
    replay: 0.165,
    miss: 0.535,
  },
  transitionProbabilities: {
    normalToChance: 0.004,
  },
  replayProbability: 0.165,
};

/**
 * 設定段階プリセット（設定1〜6）
 * 初期設定段階: 3
 */
export const DIFFICULTY_PRESETS: DifficultyPresetConfig = {
  levels: {
    1: setting1,
    2: setting2,
    3: setting3,
    4: setting4,
    5: setting5,
    6: setting6,
  },
  initialLevel: 3,
};
