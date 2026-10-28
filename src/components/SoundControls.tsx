import { useId } from 'react';
import { useAppStore } from '../store/appStore';
import controls from './controls.module.css';
import styles from './Sound.module.css';

/** Mute/Unmute toggle and Volume slider, both applied at once (FR-025). */
export function SoundControls() {
  const supported = useAppStore((s) => s.soundSupported);
  const muted = useAppStore((s) => s.muted);
  const volume = useAppStore((s) => s.volume);
  const { toggleMute, setVolume } = useAppStore.getState();
  const id = useId();

  if (!supported) {
    return <p className={controls.muted}>Sound isn&apos;t supported in this browser.</p>;
  }

  const percent = Math.round(volume * 100);
  return (
    <div className={styles.controls}>
      <button type="button" className={controls.button} aria-pressed={muted} onClick={toggleMute}>
        {muted ? 'Unmute' : 'Mute'}
      </button>
      <div className={[controls.field, styles.volume].join(' ')}>
        <div className={controls.fieldHeader}>
          <label htmlFor={id}>Volume</label>
          <span className={controls.fieldValue} aria-hidden="true">
            {percent}%
          </span>
        </div>
        <input
          id={id}
          className={controls.slider}
          type="range"
          min={0}
          max={100}
          value={percent}
          aria-valuetext={`${String(percent)} percent`}
          onChange={(e) => {
            setVolume(Number(e.target.value) / 100);
          }}
        />
      </div>
    </div>
  );
}
