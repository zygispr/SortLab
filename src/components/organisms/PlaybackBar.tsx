import { canReset, canStepBack, canStepForward, useAppStore } from '../../store/appStore';
import { Button } from '../atoms/Button';
import { MutedText } from '../atoms/MutedText';
import styles from './PlaybackBar.module.scss';
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
        <Button variant="primary" onClick={togglePlay}>
          {TOGGLE_LABEL[run.status]}
        </Button>
        <Button disabled={!canStepBack(run)} onClick={stepBack}>
          Step back
        </Button>
        <Button disabled={!canStepForward(run)} onClick={stepForward}>
          Step forward
        </Button>
        <Button disabled={!canReset(run)} onClick={reset}>
          Reset
        </Button>
        {startQueued && <MutedText as="span">Preparing…</MutedText>}
      </div>
      {run.prepareError && (
        <div className={styles.error}>
          <p>Couldn&apos;t prepare this sort. Try again.</p>
          <Button onClick={retryPrepare}>Retry</Button>
        </div>
      )}
      <SpeedSlider />
    </div>
  );
}
