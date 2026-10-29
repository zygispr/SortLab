import { useEffect } from 'react';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';
import { player, useAppStore } from '../../store/appStore';
import { Legend } from '../molecules/Legend';
import { AlgorithmInfo } from '../organisms/AlgorithmInfo';
import { AlgorithmPicker } from '../organisms/AlgorithmPicker';
import { Counters } from '../organisms/Counters';
import { DataPanel } from '../organisms/DataPanel';
import { LiveRegion } from '../organisms/LiveRegion';
import { PlaybackBar } from '../organisms/PlaybackBar';
import { RunSummary } from '../organisms/RunSummary';
import { SoundControls } from '../organisms/SoundControls';
import { Visualizer } from '../organisms/Visualizer';
import { PageLayout } from '../templates/PageLayout';
import { Region } from '../templates/Region';
import styles from './SortLabPage.module.scss';

/**
 * The SortLab screen: fills the page layout with the app's regions (feature 001
 * ui-contract.md → Layout) and runs the page-wide behavior: keyboard shortcuts, pausing
 * when the tab is hidden, and reduced motion.
 */
export function SortLabPage() {
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
    <PageLayout
      title="SortLab"
      controls={
        <>
          <Region id="data" title="Data">
            <DataPanel />
          </Region>
          <Region id="algorithm" title="Algorithm">
            <AlgorithmPicker />
            <AlgorithmInfo />
          </Region>
        </>
      }
      stage={
        <>
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
          <Region id="sound" title="Sound">
            <SoundControls />
          </Region>
        </>
      }
      summary={
        <Region id="summary" title="Run summary">
          <RunSummary />
        </Region>
      }
      announcements={<LiveRegion />}
    />
  );
}
