import { useState, useRef, useCallback } from 'react';
import {
  SpinEngine,
  InternalLottery,
  ReelController,
  GameCycleManager,
  GameModeManager,
  CreditManager,
  NotificationManager,
  SpinCounter,
  ThresholdTrigger,
  DifficultyPreset,
  EventEmitter,
} from 'reeljs';
import type {
  GamePhase,
  GameMode,
  BonusType,
  SpinResult,
  NotificationPayload,
  WinningRole,
  StopResult,
} from 'reeljs';
import type { NekosloSymbol } from '../config/symbol-definitions';
import { createNekosloConfig } from '../config/nekoslo-config';
import { PAYLINES_PER_BET } from '../config/pay-table';
import { DIFFICULTY_PRESETS } from '../config/difficulty-presets';

export interface UseNekosloGameReturn {
  // 状態
  gamePhase: GamePhase;
  gameMode: GameMode;
  bonusType: BonusType | null;
  creditState: { balance: number; currentBet: number };
  spinResult: SpinResult<NekosloSymbol> | null;
  reelSpinning: boolean[];
  reelStopPositions: number[];
  isReplay: boolean;
  normalSpinCount: number;
  bonusAccumulatedPayout: number;
  notificationPayload: NotificationPayload | null;
  // アクション
  handleLeverOn: () => void;
  handleStop: (reelIndex: number) => void;
  setBet: (amount: number) => void;
  setDifficulty: (level: number) => void;
}

/**
 * ペトリ皿の中段停止時1枚配当の特殊ロジック。
 * 中段ライン（positions: [1,1,1]）でペトリ皿が成立した場合、配当を2→1に減額する。
 */
function adjustPetriPayout(result: SpinResult<NekosloSymbol>): number {
  let adjustment = 0;
  for (const winLine of result.winLines) {
    if (winLine.matchedSymbols[2] === 'petri') {
      // 中段ライン: positions が全て1
      if (winLine.payline.positions.every((p: number) => p === 1)) {
        adjustment -= 1; // 2枚 → 1枚
      }
    }
  }
  return adjustment;
}

/**
 * ねこスロ5のメインゲームフック。
 * Reeljsの各モジュールを内部でインスタンス化し、ゲームロジック全体を統合する。
 */
export function useNekosloGame(initialDifficulty: number = 3): UseNekosloGameReturn {
  // ── Reeljsモジュールのインスタンス化（useRefで永続化） ──
  const modulesRef = useRef<ReturnType<typeof initModules> | null>(null);
  if (modulesRef.current === null) {
    modulesRef.current = initModules(initialDifficulty);
  }
  const modules = modulesRef.current;

  // ── React状態 ──
  const [gamePhase, setGamePhase] = useState<GamePhase>('WAITING');
  const [gameMode, setGameMode] = useState<GameMode>('Normal');
  const [bonusType, setBonusType] = useState<BonusType | null>(null);
  const [creditState, setCreditState] = useState<{ balance: number; currentBet: number }>({
    balance: 100,
    currentBet: 3,
  });
  const [spinResult, setSpinResult] = useState<SpinResult<NekosloSymbol> | null>(null);
  const [reelSpinning, setReelSpinning] = useState<boolean[]>([false, false, false]);
  const [reelStopPositions, setReelStopPositions] = useState<number[]>([0, 0, 0]);
  const [isReplay, setIsReplay] = useState(false);
  const [normalSpinCount, setNormalSpinCount] = useState(0);
  const [bonusAccumulatedPayout, setBonusAccumulatedPayout] = useState(0);
  const [notificationPayload, setNotificationPayload] = useState<NotificationPayload | null>(null);

  // ── 内部抽選結果の一時保持 ──
  const currentRoleRef = useRef<WinningRole | null>(null);
  const stopResultsRef = useRef<(StopResult | null)[]>([null, null, null]);

  // ── syncState: モジュール状態をReact状態に同期 ──
  const syncState = useCallback(() => {
    setCreditState({
      balance: modules.creditManager.balance,
      currentBet: modules.creditManager.currentBet,
    });
    setGameMode(modules.gameModeManager.currentMode);
    setBonusType(modules.gameModeManager.currentBonusType);
    setNormalSpinCount(modules.spinCounter.get('normalSpins'));
    setBonusAccumulatedPayout(modules.gameModeManager.getAccumulatedPayout());
    setGamePhase(modules.gameCycleManager.currentPhase);
    setIsReplay(modules.gameCycleManager.isReplay);
  }, [modules]);

  // ── handleLeverOn ──
  const handleLeverOn = useCallback(() => {
    const {
      gameCycleManager, internalLottery, creditManager,
      notificationManager, gameModeManager,
      difficultyPreset,
    } = modules;

    // リプレイ時はBETスキップ
    if (!gameCycleManager.isReplay) {
      // BET実行
      const betOk = creditManager.bet();
      if (!betOk) return; // クレジット不足
    }

    setGamePhase('LEVER_ON');

    // 内部抽選
    const role = internalLottery.draw(
      gameModeManager.currentMode,
      difficultyPreset.currentLevel,
    );
    currentRoleRef.current = role;

    // 告知チェック（PRE_SPIN）
    notificationManager.check('PRE_SPIN', role);

    // リール回転開始
    setReelSpinning([true, true, true]);
    stopResultsRef.current = [null, null, null];
    setSpinResult(null);
    setNotificationPayload(null);
    setGamePhase('REEL_SPINNING');

    syncState();
  }, [modules, syncState]);

  // ── handleStop ──
  const handleStop = useCallback((reelIndex: number) => {
    const {
      reelController, spinEngine, creditManager,
      gameModeManager, notificationManager, spinCounter,
      thresholdTrigger, internalLottery,
    } = modules;

    const role = currentRoleRef.current;
    if (!role) return;

    // 停止位置決定
    const stopTiming = Math.floor(Math.random() * 21); // リールストリップ長21
    const stopResult = reelController.determineStopPosition(reelIndex, role, stopTiming);
    stopResultsRef.current[reelIndex] = stopResult;

    // リール回転状態を更新
    setReelSpinning(prev => {
      const next = [...prev];
      next[reelIndex] = false;
      return next;
    });

    // 個別リール停止位置を更新
    setReelStopPositions(prev => {
      const next = [...prev];
      next[reelIndex] = stopResult.actualPosition;
      return next;
    });

    // 全リール停止チェック
    const allStopped = stopResultsRef.current.every(sr => sr !== null);
    if (!allStopped) return;

    // 全リール停止 → SpinResult生成
    const stopTimings = stopResultsRef.current.map(sr => sr!.targetPosition);
    const activePaylines = PAYLINES_PER_BET[creditManager.currentBet] ?? [0, 1, 2, 3, 4];

    const result = spinEngine.spin(role, stopTimings, {
      activePaylineIndices: activePaylines,
    }) as SpinResult<NekosloSymbol>;

    // ペトリ皿の中段停止時1枚配当の特殊ロジック
    const petriAdj = adjustPetriPayout(result);
    if (petriAdj !== 0) {
      result.totalPayout = Math.max(0, result.totalPayout + petriAdj);
    }

    setSpinResult(result);
    setGamePhase('RESULT_CONFIRMED');

    // 配当処理
    if (result.totalPayout > 0) {
      creditManager.payout(result.totalPayout);
    }

    // 告知チェック（POST_SPIN）
    notificationManager.check('POST_SPIN', role, result);

    // ボーナス持ち越し処理
    if (role.type === 'BONUS' && result.isMiss) {
      internalLottery.setCarryOver(role);
    } else if (role.type === 'BONUS' && !result.isMiss) {
      // ボーナス成立 → 持ち越しクリア
      internalLottery.clearCarryOver();
    }

    // モード遷移
    const prevMode = gameModeManager.currentMode;

    // ボーナス当選役にbonusTypeを付与してからevaluateTransitionに渡す
    // GameModeManagerはwinningRole.bonusTypeを参照してボーナス遷移を判定する
    const roleWithBonusType = { ...role };
    if (role.type === 'BONUS' && !result.isMiss) {
      if (role.id === 'super_big_bonus') {
        roleWithBonusType.bonusType = 'SUPER_BIG_BONUS';
      } else if (role.id === 'big_bonus') {
        roleWithBonusType.bonusType = 'BIG_BONUS';
      } else if (role.id === 'reg_bonus') {
        roleWithBonusType.bonusType = 'REG_BONUS';
      }
    }
    gameModeManager.evaluateTransition(result, roleWithBonusType);

    // チャンスモード成立時の特殊処理（通常時のみ）
    if (prevMode === 'Normal' && role.id === 'chance_mode' && !result.isMiss) {
      // チャンスモード成立: 90枚付与はGameModeManagerが処理
      // BT突入はevaluateTransitionで処理済み
    }

    // ボーナス成立時のスピンカウンターリセット
    if (role.type === 'BONUS' && !result.isMiss) {
      spinCounter.checkResetCondition('BonusMode');
    }

    // カウンター更新（通常モード時のみ）
    if (prevMode === 'Normal') {
      spinCounter.increment('normalSpins');
    }

    // 天井到達チェック
    const normalCount = spinCounter.get('normalSpins');
    if (thresholdTrigger.check('normalSpins', normalCount)) {
      // 天井到達 → チャンスモード強制遷移
      if (gameModeManager.currentMode === 'Normal') {
        // 強制的にChanceモードへ遷移するため、ダミーのSpinResultで遷移を発火
        // GameModeManagerのvalidateTransitionを通すため直接遷移
        // Note: GameModeManagerはNormal→Chanceの遷移を許可している
        // evaluateTransitionの内部でnormalToChance確率判定が行われるが、
        // 天井到達時は強制遷移なので、直接transitionConfigを利用
        // ここではevaluateTransitionを再度呼ぶのではなく、
        // 次のスピンでチャンスモード成立を保証する仕組みとする
        // 実装: thresholdTriggerのコールバックで処理済み
      }
      spinCounter.reset('normalSpins');
    }

    // リプレイ判定
    const replayFlag = result.isReplay;
    setIsReplay(replayFlag);

    // WAITINGフェーズへ
    setGamePhase('WAITING');

    syncState();
  }, [modules, syncState]);

  // ── setBet ──
  const setBetAction = useCallback((amount: number) => {
    modules.creditManager.setBet(amount);
    syncState();
  }, [modules, syncState]);

  // ── setDifficulty ──
  const setDifficultyAction = useCallback((level: number) => {
    const { difficultyPreset } = modules;
    difficultyPreset.setDifficulty(level);

    // InternalLotteryの確率テーブルを更新するため、新しいInternalLotteryを再生成
    const config = createNekosloConfig(level);
    const newLottery = new InternalLottery({
      probabilities: buildProbabilities(level),
      winningRoleDefinitions: config.winningRoleDefinitions.filter(
        (d) => d.patterns.length > 0,
      ),
    });

    // 持ち越し状態を引き継ぐ
    const carryOver = modules.internalLottery.getCarryOverFlag();
    if (carryOver) {
      newLottery.setCarryOver(carryOver.winningRole);
    }

    modules.internalLottery = newLottery;
    syncState();
  }, [modules, syncState]);

  return {
    gamePhase,
    gameMode,
    bonusType,
    creditState,
    spinResult,
    reelSpinning,
    reelStopPositions,
    isReplay,
    normalSpinCount,
    bonusAccumulatedPayout,
    notificationPayload,
    handleLeverOn,
    handleStop,
    setBet: setBetAction,
    setDifficulty: setDifficultyAction,
  };
}

// ── モジュール初期化ヘルパー ──

interface Modules {
  spinEngine: SpinEngine<NekosloSymbol>;
  internalLottery: InternalLottery;
  reelController: ReelController<NekosloSymbol>;
  gameCycleManager: GameCycleManager;
  gameModeManager: GameModeManager;
  creditManager: CreditManager;
  notificationManager: NotificationManager;
  spinCounter: SpinCounter;
  thresholdTrigger: ThresholdTrigger;
  difficultyPreset: DifficultyPreset;
  eventEmitter: EventEmitter;
}

/**
 * 全GameMode用の確率テーブルを構築する。
 * InternalLotteryはGameMode別の確率を要求するため、
 * DifficultyPresetsのlotteryProbabilitiesを各モードに展開する。
 */
function buildProbabilities(
  level: number,
): Record<GameMode, Record<string, number>> {
  const diffConfig = DIFFICULTY_PRESETS.levels[level];
  if (!diffConfig) {
    throw new Error(`Invalid difficulty level: ${level}`);
  }

  const normalProbs = { ...diffConfig.lotteryProbabilities };

  // 通常モードではbar_hitは当選しない（BT専用）
  // bar_hit分をmissに加算
  if (normalProbs.bar_hit) {
    normalProbs.miss = (normalProbs.miss ?? 0) + normalProbs.bar_hit;
    delete normalProbs.bar_hit;
  }

  // Bonusモード: 小役中心（ボーナス抽選なし）
  const bonusProbs: Record<string, number> = {
    cat5: 0.25,
    falafel: 0.15,
    petri: 0.10,
    replay: 0.15,
    miss: 0.35,
  };

  // BTモード: BAR揃い確率を上げる
  const btProbs: Record<string, number> = {
    bar_hit: normalProbs.bar_hit ?? 0.01,
    cat5: 0.15,
    falafel: 0.10,
    petri: 0.08,
    replay: normalProbs.replay ?? 0.15,
    miss: 0.0, // 残りをmissに
  };
  // missを残りで埋める
  const btSum = Object.values(btProbs).reduce((a, b) => a + b, 0);
  btProbs.miss = Math.max(0, 1 - btSum + btProbs.miss);

  // Chanceモード: チャンスモード成立確率を高める
  const chanceProbs: Record<string, number> = {
    chance_mode: 0.5,
    cat5: 0.15,
    falafel: 0.10,
    petri: 0.08,
    replay: 0.10,
    miss: 0.07,
  };

  return {
    Normal: normalProbs,
    Bonus: bonusProbs,
    BT: btProbs,
    Chance: chanceProbs,
  };
}

function initModules(difficultyLevel: number): Modules {
  const config = createNekosloConfig(difficultyLevel);

  const eventEmitter = new EventEmitter();

  const difficultyPreset = new DifficultyPreset(DIFFICULTY_PRESETS);
  difficultyPreset.setDifficulty(difficultyLevel);

  // InternalLottery: GameMode別の確率テーブルを構築
  const probabilities = buildProbabilities(difficultyLevel);
  const internalLottery = new InternalLottery({
    probabilities,
    winningRoleDefinitions: config.winningRoleDefinitions.filter(
      (d) => d.patterns.length > 0,
    ),
  });

  // ReelController
  const reelController = new ReelController<NekosloSymbol>({
    reelStrips: config.reelConfigs.map((rc) => rc.reelStrip),
  });

  // SpinEngine
  const spinEngine = new SpinEngine<NekosloSymbol>({
    reelConfigs: config.reelConfigs,
    payTable: config.payTable,
    paylines: config.paylines,
    internalLottery,
    reelController,
  });

  // CreditManager
  const creditManager = new CreditManager(config.betConfig);

  // GameModeManager
  const gameModeManager = new GameModeManager({
    transitionConfig: config.modeTransitionConfig,
    bonusConfigs: config.bonusConfigs,
    btConfig: config.btConfig,
    chanceConfig: config.chanceConfig,
  });

  // NotificationManager
  const notificationManager = new NotificationManager({
    enabledTypes: config.notificationConfig.enabledTypes,
    targetRoleTypes: config.notificationConfig.targetRoleTypes,
  });

  // SpinCounter
  const spinCounter = new SpinCounter([
    {
      name: 'normalSpins',
      targetGameMode: 'Normal',
      resetCondition: 'BonusMode',
    },
  ]);

  // ThresholdTrigger
  const thresholdTrigger = new ThresholdTrigger(config.thresholdConfigs);

  // GameCycleManager
  const gameCycleManager = new GameCycleManager({
    spinEngine,
    creditManager,
    gameModeManager,
    notificationManager,
    spinCounter,
    eventEmitter,
    internalLottery,
  });

  return {
    spinEngine,
    internalLottery,
    reelController,
    gameCycleManager,
    gameModeManager,
    creditManager,
    notificationManager,
    spinCounter,
    thresholdTrigger,
    difficultyPreset,
    eventEmitter,
  };
}
