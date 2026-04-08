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
  totalGameCount: number;
  bonusAccumulatedPayout: number;
  bonusRemainingSpins: number | null;
  bonusMaxSpins: number | null;
  totalInvested: number;
  notificationPayload: NotificationPayload | null;
  // アクション
  handleLeverOn: () => void;
  handleStop: (reelIndex: number) => void;
  setBet: (amount: number) => void;
  setDifficulty: (level: number) => void;
  addCredit: () => void;
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
  const [totalGameCount, setTotalGameCount] = useState(0);
  const [bonusAccumulatedPayout, setBonusAccumulatedPayout] = useState(0);
  const [bonusRemainingSpins, setBonusRemainingSpins] = useState<number | null>(null);
  const [bonusMaxSpins, setBonusMaxSpins] = useState<number | null>(null);
  const [totalInvested, setTotalInvested] = useState(100);
  const [notificationPayload, setNotificationPayload] = useState<NotificationPayload | null>(null);

  // ── 内部抽選結果の一時保持 ──
  const currentRoleRef = useRef<WinningRole | null>(null);
  const stopTimingsRef = useRef<(number | null)[]>([null, null, null]);
  const individualStopResultsRef = useRef<{ isMiss: boolean; actualPosition: number }[]>([]);

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
    setBonusRemainingSpins(modules.gameModeManager.getRemainingSpins());
    // maxSpinsはモード遷移時に設定される
    const currentBonusType = modules.gameModeManager.currentBonusType;
    if (currentBonusType && modules.gameModeManager.currentMode === 'Bonus') {
      const bonusConfigs: Record<string, number> = {
        SUPER_BIG_BONUS: 100,
        BIG_BONUS: 60,
        REG_BONUS: 30,
      };
      setBonusMaxSpins(bonusConfigs[currentBonusType] ?? null);
    } else if (modules.gameModeManager.currentMode === 'Chance') {
      setBonusMaxSpins(10);
    } else if (modules.gameModeManager.currentMode === 'BT') {
      setBonusMaxSpins(100);
    } else {
      setBonusMaxSpins(null);
    }
    setGamePhase(modules.gameCycleManager.currentPhase);
    setIsReplay(modules.gameCycleManager.isReplay);
  }, [modules]);

  // ── handleLeverOn ──
  const handleLeverOn = useCallback(() => {
    const {
      internalLottery, creditManager,
      notificationManager, gameModeManager,
      difficultyPreset,
    } = modules;

    // リプレイ時はBETスキップ
    if (!modules.gameCycleManager.isReplay) {
      const betOk = creditManager.bet();
      if (!betOk) return;
    }

    setGamePhase('LEVER_ON');
    setTotalGameCount(prev => prev + 1);

    // 内部抽選
    const role = internalLottery.draw(
      gameModeManager.currentMode,
      difficultyPreset.currentLevel,
    );
    currentRoleRef.current = role;

    // 告知チェック（PRE_SPIN）
    notificationManager.check('PRE_SPIN', role);

    // リール回転開始（spinはまだ呼ばない。ストップ時に目押しタイミングで呼ぶ）
    stopTimingsRef.current = [null, null, null];
    individualStopResultsRef.current = [];
    setReelSpinning([true, true, true]);
    setSpinResult(null);
    setNotificationPayload(null);
    setGamePhase('REEL_SPINNING');

    syncState();
  }, [modules, syncState]);

  // ── handleStop ──
  const handleStop = useCallback((reelIndex: number) => {
    const {
      spinEngine, creditManager,
      gameModeManager, notificationManager, spinCounter,
      thresholdTrigger, internalLottery, reelController,
    } = modules;

    const role = currentRoleRef.current;
    if (!role) return;
    if (stopTimingsRef.current[reelIndex] !== null) return; // 既に停止済み

    // 目押しタイミング: 現在のリール位置をランダムにシミュレート
    const strip = modules.reelController.getReelStrip(reelIndex);
    const stopTiming = Math.floor(Math.random() * strip.length);
    stopTimingsRef.current[reelIndex] = stopTiming;

    // ReelControllerで引き込み・蹴飛ばしを適用して停止位置を決定
    const stopResult = reelController.determineStopPosition(reelIndex, role, stopTiming);
    individualStopResultsRef.current[reelIndex] = {
      isMiss: stopResult.isMiss,
      actualPosition: stopResult.actualPosition,
    };

    // リール回転状態を更新
    setReelSpinning(prev => {
      const next = [...prev];
      next[reelIndex] = false;
      return next;
    });

    // 個別リール停止位置を更新（即座に表示に反映）
    setReelStopPositions(prev => {
      const next = [...prev];
      next[reelIndex] = stopResult.actualPosition;
      return next;
    });

    // 全リール停止チェック
    const allStopped = stopTimingsRef.current.every(t => t !== null);
    if (!allStopped) return;

    // 全リール停止 → SpinEngine.spinで結果を生成
    // stopTimingsを渡すことで、SpinEngine内部のReelControllerが引き込み・蹴飛ばしを適用
    const timings = stopTimingsRef.current as number[];
    const activePaylines = PAYLINES_PER_BET[creditManager.currentBet] ?? [0, 1, 2, 3, 4];

    const result = spinEngine.spin(role, timings, {
      activePaylineIndices: activePaylines,
    }) as SpinResult<NekosloSymbol>;

    // SpinEngine.spinは内部でcontrolReelsを再実行するため、isMissが不整合になる
    // 個別に決定したstopResultのisMissを使用する
    const actualIsMiss = individualStopResultsRef.current.some(sr => sr.isMiss);
    result.isMiss = actualIsMiss;

    // ペトリ皿の中段停止時1枚配当の特殊ロジック
    const petriAdj = adjustPetriPayout(result);
    if (petriAdj !== 0) {
      result.totalPayout = Math.max(0, result.totalPayout + petriAdj);
    }

    // BTモード中のBAR揃いは200枚加算
    if (gameModeManager.currentMode === 'BT' && role.id === 'bar_hit' && !result.isMiss) {
      result.totalPayout += 200;
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
      internalLottery.clearCarryOver();
    }

    // モード遷移
    const prevMode = gameModeManager.currentMode;

    // ボーナス当選役にbonusTypeを付与してからevaluateTransitionに渡す
    const roleForTransition = { ...role };
    if (role.type === 'BONUS' && !result.isMiss) {
      if (role.id === 'super_big_bonus') {
        roleForTransition.bonusType = 'SUPER_BIG_BONUS';
      } else if (role.id === 'big_bonus') {
        roleForTransition.bonusType = 'BIG_BONUS';
      } else if (role.id === 'reg_bonus') {
        roleForTransition.bonusType = 'REG_BONUS';
      }
    }
    gameModeManager.evaluateTransition(result, roleForTransition);

    // ボーナス成立時のスピンカウンターリセット
    if (role.type === 'BONUS' && !result.isMiss) {
      spinCounter.checkResetCondition('BonusMode');
    }

    // カウンター更新（通常モード時のみ）
    if (prevMode === 'Normal') {
      spinCounter.increment('normalSpins');
    }

    // 天井到達チェック → BT直接突入
    const normalCount = spinCounter.get('normalSpins');
    if (gameModeManager.currentMode === 'Normal' && thresholdTrigger.check('normalSpins', normalCount)) {
      // 天井恩恵: BT確定。Chance経由で即BT突入
      // Normal→Chanceに遷移
      const chanceGrid = [['red7','red7','blue7'],['red7','red7','blue7'],['red7','red7','blue7']] as unknown as NekosloSymbol[][];
      const chanceResult: SpinResult<NekosloSymbol> = {
        grid: chanceGrid,
        stopResults: result.stopResults,
        winLines: [],
        totalPayout: 0,
        isReplay: false,
        isMiss: false,
        winningRole: { id: 'chance_mode', name: 'ﾍﾟﾆｭﾌﾟﾋﾟﾘｭﾘｭﾘｭﾐﾋﾟﾋﾟｭﾎﾟｨﾎﾟﾋﾟﾘｨ', type: 'BONUS', payout: 90, patterns: [], priority: 70 },
      };
      // Normal→Chance遷移（normalToChance確率を100%にするため直接evaluateTransition）
      gameModeManager.evaluateTransition(chanceResult, chanceResult.winningRole);
      // Chance→BT遷移（winPatternマッチで即BT突入）
      gameModeManager.evaluateTransition(chanceResult, chanceResult.winningRole);
      // 90枚付与
      creditManager.payout(90);
      spinCounter.reset('normalSpins');
    }

    // リプレイ判定
    setIsReplay(result.isReplay);

    // WAITINGフェーズへ
    setGamePhase('WAITING');

    syncState();
  }, [modules, syncState]);

  // ── setBet ──
  const setBetAction = useCallback((amount: number) => {
    modules.creditManager.setBet(amount);
    syncState();
  }, [modules, syncState]);

  // ── addCredit ──
  const addCredit = useCallback(() => {
    modules.creditManager.payout(100);
    setTotalInvested(prev => prev + 100);
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
    totalGameCount,
    bonusAccumulatedPayout,
    bonusRemainingSpins,
    bonusMaxSpins,
    totalInvested,
    notificationPayload,
    handleLeverOn,
    handleStop,
    setBet: setBetAction,
    setDifficulty: setDifficultyAction,
    addCredit,
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

  // BTモード: BAR揃い + SUPER BIG当選
  // SUPER BIG確率: 設定1=20%, 設定6=35%（段階的に上昇）
  const btSuperBigRate = [0, 0.20, 0.23, 0.25, 0.28, 0.32, 0.35][level] ?? 0.25;
  const btProbs: Record<string, number> = {
    super_big_bonus: btSuperBigRate,
    bar_hit: 0.05,
    cat5: 0.10,
    falafel: 0.08,
    petri: 0.06,
    replay: 0.10,
    miss: 0.0,
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
