import { memo, useEffect, useMemo, useRef, useState } from 'react';
import Particles, { initParticlesEngine } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import type { ISourceOptions, Container } from '@tsparticles/engine';
import type { GameMode } from 'reeljs';
import styles from './LoopAnimationRenderer.module.css';

const MODE_CONFIGS: Record<GameMode, ISourceOptions> = {
  Normal: {
    particles: {
      number: { value: 15 },
      color: { value: '#4caf50' },
      opacity: { value: { min: 0.3, max: 0.7 } },
      size: { value: { min: 2, max: 5 } },
      move: { enable: true, speed: 0.5, direction: 'top' as const },
      shape: { type: 'circle' },
    },
    background: { color: 'transparent' },
  },
  Chance: {
    particles: {
      number: { value: 20 },
      color: { value: '#ffffff' },
      opacity: { value: { min: 0.7, max: 1 } },
      size: { value: { min: 10, max: 20 } },
      move: { enable: true, speed: 2, direction: 'none' as const, outModes: 'bounce' as const },
      shape: {
        type: 'emoji',
        options: { emoji: { value: '🐧' } },
      },
    },
    background: { color: 'transparent' },
  },
  Bonus: {
    particles: {
      number: { value: 40 },
      color: { value: ['#f44336', '#e91e63', '#ff5722'] },
      opacity: { value: { min: 0.5, max: 1 } },
      size: { value: { min: 3, max: 10 } },
      move: { enable: true, speed: 3, direction: 'none' as const, outModes: 'bounce' as const },
      shape: { type: 'star' },
    },
    background: { color: 'transparent' },
  },
  BT: {
    particles: {
      number: { value: 25 },
      color: { value: ['#e040fb', '#ce93d8', '#ab47bc'] },
      opacity: { value: { min: 0.4, max: 1 } },
      size: { value: { min: 2, max: 7 } },
      move: { enable: true, speed: 1.5, direction: 'none' as const, outModes: 'out' as const },
      shape: { type: 'circle' },
      twinkle: { particles: { enable: true, frequency: 0.1, color: { value: '#ffffff' } } },
    },
    background: { color: 'transparent' },
  },
};

export interface LoopAnimationRendererProps {
  gameMode: GameMode;
}

function LoopAnimationRendererInner({ gameMode }: LoopAnimationRendererProps) {
  const [ready, setReady] = useState(false);
  const containerRef = useRef<Container | null>(null);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => setReady(true));
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const opts = MODE_CONFIGS[gameMode] ?? MODE_CONFIGS.Normal;
    void container.loadTheme('default');
    container.options.load(opts);
    void container.refresh();
  }, [gameMode]);

  const options = useMemo(() => MODE_CONFIGS[gameMode] ?? MODE_CONFIGS.Normal, [gameMode]);

  if (!ready) return null;

  return (
    <div className={styles.container}>
      <Particles
        id="nekoslo-particles"
        options={options}
        particlesLoaded={async (container) => {
          if (container) {
            containerRef.current = container;
          }
        }}
      />
    </div>
  );
}

export const LoopAnimationRenderer = memo(LoopAnimationRendererInner);
