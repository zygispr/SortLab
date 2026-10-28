import { canReset, canStepBack, canStepForward, useAppStore } from '../store/appStore';
import controls from './controls.module.css';
import styles from './PlaybackBar.module.css';
import { SoundPrompt } from './SoundPrompt';
import { SpeedSlider } from './SpeedSlider';

const TOGGLE_LABEL = {
  preparing: 'Start',
  ready: 'Start',
  running: 'Pause',
  paused: 'Resume',
  finished: 'Start',
} as const;

/** Start/Pause/Resume, Step back/forward, Reset, and Speed (ui-contract.md → Controls). */
export function PlaybackBar() {
  const run = useAppStore((s) => s.run);
  const startQueued = useAppStore((s) => s.startQueued);
  const { togglePlay, stepBack, stepForward, reset, retryPrepare } = useAppStore.getState();

  return (
    <div className={styles.bar}>
      <div className={styles.buttons}>
        <button type="button" className={controls.primary} onClick={togglePlay}>
          {TOGGLE_LABEL[run.status]}
        </button>
        <SoundPrompt />
        <button
          type="button"
          className={controls.button}
          disabled={!canStepBack(run)}
          onClick={stepBack}
        >
          Step back
        </button>
        <button
          type="button"
          className={controls.button}
          disabled={!canStepForward(run)}
          onClick={stepForward}
        >
          Step forward
        </button>
        <button type="button" className={controls.button} disabled={!canReset(run)} onClick={reset}>
          Reset
        </button>
        {startQueued && <span className={controls.muted}>Preparing…</span>}
      </div>
      {run.prepareError && (
        <div className={styles.error}>
          <p>Couldn&apos;t prepare this sort. Try again.</p>
          <button type="button" className={controls.button} onClick={retryPrepare}>
            Retry
          </button>
        </div>
      )}
      <SpeedSlider />
    </div>
  );
}
