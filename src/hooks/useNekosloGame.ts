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
import { BONUS_MAX_SPINS, CHANCE_MAX_SPINS, BT_MAX_SPINS } from '../config/nekoslo-config';
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
  // デバッグ用（DEVのみ）
  debug: {
    forceNextRole: (roleId: string) => void;
    forcedRoleId: string | null;
    setSpinCount: (count: number) => void;
    currentRoleId: string | null;
    currentIsMiss: boolean;
    hasCarryOver: boolean;
  };
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
  const forcedRoleIdRef = useRef<string | null>(null);
  const [debugCurrentRoleId, setDebugCurrentRoleId] = useState<string | null>(null);
  const [debugIsMiss, setDebugIsMiss] = useState(false);
  const [debugHasCarryOver, setDebugHasCarryOver] = useState(false);
  const [debugForcedRoleId, setDebugForcedRoleId] = useState<string | null>(null);

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
      setBonusMaxSpins(BONUS_MAX_SPINS[currentBonusType] ?? null);
    } else if (modules.gameModeManager.currentMode === 'Chance') {
      setBonusMaxSpins(CHANCE_MAX_SPINS);
    } else if (modules.gameModeManager.currentMode === 'BT') {
      setBonusMaxSpins(BT_MAX_SPINS);
    } else {
      setBonusMaxSpins(null);
    }
    setGamePhase(modules.gameCycleManager.currentPhase);
    // isReplayはhandleStop内で直接管理するためsyncStateでは上書きしない
  }, [modules]);

  // ── handleLeverOn ──
  const handleLeverOn = useCallback(() => {
    const {
      internalLottery, creditManager,
      notificationManager, gameModeManager,
      difficultyPreset,
    } = modules;

    // リプレイ時はBETスキップ（isReplayはReact stateで管理）
    if (!isReplay) {
      const betOk = creditManager.bet();
      if (!betOk) return;
    }
    // リプレイフラグをリセット
    setIsReplay(false);

    setGamePhase('LEVER_ON');
    setTotalGameCount(prev => prev + 1);

    // 内部抽選（強制当選がセットされていればそちらを使用）
    let role: WinningRole;
    if (forcedRoleIdRef.current) {
      const config = createNekosloConfig(difficultyPreset.currentLevel);
      const forced = config.winningRoleDefinitions.find(d => d.id === forcedRoleIdRef.current);
      if (forced) {
        role = { ...forced, bonusType: undefined };
      } else {
        role = internalLottery.draw(gameModeManager.currentMode, difficultyPreset.currentLevel);
      }
      forcedRoleIdRef.current = null;
      setDebugForcedRoleId(null);
    } else {
      role = internalLottery.draw(gameModeManager.currentMode, difficultyPreset.currentLevel);
    }
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
  }, [modules, syncState, isReplay]);
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

    // 全リール停止 → evaluateFromStopResultsでSpinResult構築
    const activePaylines = PAYLINES_PER_BET[creditManager.currentBet] ?? [0, 1, 2, 3, 4];
    const stopResults = individualStopResultsRef.current.map((sr, i) => ({
      reelIndex: i,
      targetPosition: (stopTimingsRef.current as number[])[i],
      actualPosition: sr.actualPosition,
      slipCount: 0,
      isMiss: sr.isMiss,
    }));

    const result = spinEngine.evaluateFromStopResults(stopResults, role, {
      activePaylineIndices: activePaylines,
    }) as SpinResult<NekosloSymbol>;

    // ペトリ皿の中段停止時1枚配当
    let payoutAdjustment = 0;
    const adjustedWinLines = result.winLines.map(wl => {
      if (wl.matchedSymbols[2] === 'petri' && wl.payline.positions.every(p => p === 1)) {
        const diff = wl.payout - 1;
        payoutAdjustment -= diff;
        return { ...wl, payout: 1 };
      }
      return wl;
    });
    if (payoutAdjustment !== 0) {
      result.winLines = adjustedWinLines;
      result.totalPayout = Math.max(0, result.totalPayout + payoutAdjustment);
    }

    // BTモード中のBAR揃いは200枚加算
    if (gameModeManager.currentMode === 'BT' && role.id === 'bar_hit' && !result.isMiss) {
      result.totalPayout += 200;
    }

    setSpinResult(result);
    setGamePhase('RESULT_CONFIRMED');
    setDebugCurrentRoleId(role.id);
    setDebugIsMiss(result.isMiss);
    setDebugHasCarryOver(modules.internalLottery.getCarryOverFlag() != null);

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

    // ボーナス当選役のbonusTypeはInternalLotteryが自動解決済み
    // 取りこぼし時はbonusTypeをundefinedにしてボーナス遷移を防ぐ
    const roleForTransition = result.isMiss
      ? { ...role, bonusType: undefined }
      : role;
    gameModeManager.evaluateTransition(result, roleForTransition);

    // デバッグ: モード遷移ログ
    if (gameModeManager.currentMode !== prevMode) {
      console.log('[MODE TRANSITION]', prevMode, '→', gameModeManager.currentMode,
        '| role:', role.id, '| isMiss:', result.isMiss,
        '| bonusType:', roleForTransition.bonusType ?? 'none',
        '| grid:', result.grid.map(r => r.join(',')).join(' | '));
    }

    // ボーナス成立時のスピンカウンターリセット
    if (role.type === 'BONUS' && !result.isMiss) {
      spinCounter.checkResetCondition('BonusMode');
    }

    // カウンター更新（通常モード時のみ）
    if (prevMode === 'Normal') {
      spinCounter.increment('normalSpins');
    }

    // 天井到達チェック → forceTransitionでBT直接突入
    const normalCount = spinCounter.get('normalSpins');
    if (gameModeManager.currentMode === 'Normal' && thresholdTrigger.check('normalSpins', normalCount)) {
      gameModeManager.forceTransition('BT');
      creditManager.payout(90);
      spinCounter.reset('normalSpins');
      console.log('[CEILING] 天井到達! BT直接突入');
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

  const forceNextRole = useCallback((roleId: string) => {
    forcedRoleIdRef.current = roleId;
    setDebugForcedRoleId(roleId);
  }, []);

  const setSpinCount = useCallback((count: number) => {
    modules.spinCounter.reset('normalSpins');
    for (let i = 0; i < count; i++) {
      modules.spinCounter.increment('normalSpins');
    }
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
    debug: {
      forceNextRole,
      forcedRoleId: debugForcedRoleId,
      setSpinCount,
      currentRoleId: debugCurrentRoleId,
      currentIsMiss: debugIsMiss,
      hasCarryOver: debugHasCarryOver,
    },
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
