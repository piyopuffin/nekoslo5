import { useState } from 'react';
import { SettingsScreen } from './components/SettingsScreen';
import { GameScreen } from './components/GameScreen';

type Screen = 'settings' | 'game';

/**
 * ルートコンポーネント。
 * SettingsScreen と GameScreen の切り替えロジックを管理する。
 */
function App() {
  const [screen, setScreen] = useState<Screen>('settings');
  const [difficultyLevel, setDifficultyLevel] = useState(3);

  const handleStart = (level: number) => {
    setDifficultyLevel(level);
    setScreen('game');
  };

  if (screen === 'settings') {
    return <SettingsScreen onStart={handleStart} />;
  }

  return <GameScreen difficultyLevel={difficultyLevel} />;
}

export default App;
