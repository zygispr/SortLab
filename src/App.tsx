import { type ReactNode, useEffect } from 'react';
import styles from './App.module.css';
import { AlgorithmInfo } from './components/AlgorithmInfo';
import { AlgorithmPicker } from './components/AlgorithmPicker';
import { Counters } from './components/Counters';
import { DataPanel } from './components/DataPanel';
import { Legend } from './components/Legend';
import { LiveRegion } from './components/LiveRegion';
import { PlaybackBar } from './components/PlaybackBar';
import { RunSummary } from './components/RunSummary';
import { Visualizer } from './components/Visualizer';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { player, useAppStore } from './store/appStore';

interface RegionProps {
  id: string;
  title: string;
  /** Keep the heading for assistive technology but hide it visually. */
  hideTitle?: boolean;
  className?: string;
  children?: ReactNode;
}

/** A labelled page region (`<section>` named by its `<h2>`). */
function Region({ id, title, hideTitle = false, className, children }: RegionProps) {
  const headingId = `${id}-heading`;
  return (
    <section aria-labelledby={headingId} className={className ?? styles.panel}>
      <h2 id={headingId} className={hideTitle ? 'visually-hidden' : styles.panelHeading}>
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * Page shell (ui-contract.md → Layout): regions in reading order, stacked on phones, with
 * the data and algorithm controls beside the visualization from 1,024 px.
 */
export function App() {
  useKeyboardShortcuts();

  // FR-015: switching tabs mid-run pauses it, so no steps are skipped while hidden.
  useEffect(() => {
    const onVisibilityChange = () => {
      const { run, pause, announce } = useAppStore.getState();
      if (!document.hidden || run.status !== 'running') return;
      pause();
      announce('Paused.');
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  // FR-019: with reduced motion, bars move instantly and the sweep is skipped.
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      player.setReducedMotion(query.matches);
    };
    apply();
    query.addEventListener('change', apply);
    return () => {
      query.removeEventListener('change', apply);
    };
  }, []);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>SortLab</h1>
      </header>
      <main className={styles.main}>
        <div className={styles.controls}>
          <Region id="data" title="Data">
            <DataPanel />
          </Region>
          <Region id="algorithm" title="Algorithm">
            <AlgorithmPicker />
            <AlgorithmInfo />
          </Region>
        </div>
        <div className={styles.stage}>
          <Region id="visualization" title="Visualization" hideTitle>
            <div className={styles.stack}>
              <Visualizer />
              <Legend />
              <Counters />
            </div>
          </Region>
          <Region id="playback" title="Playback" hideTitle>
            <PlaybackBar />
          </Region>
          <Region id="sound" title="Sound" />
        </div>
        <Region
          id="summary"
          title="Run summary"
          className={[styles.panel, styles.summary].join(' ')}
        >
          <RunSummary />
        </Region>
        <LiveRegion />
      </main>
    </div>
  );
}
