import { useAppStore } from '../../store/appStore';
import { Button } from '../atoms/Button';
import { MutedText } from '../atoms/MutedText';
import { RangeField } from '../molecules/RangeField';
import styles from './Sound.module.css';

/** Mute/Unmute toggle and Volume slider, both applied at once (FR-025). */
export function SoundControls() {
  const supported = useAppStore((s) => s.soundSupported);
  const muted = useAppStore((s) => s.muted);
  const volume = useAppStore((s) => s.volume);
  const { toggleMute, setVolume } = useAppStore.getState();

  if (!supported) {
    return <MutedText>Sound isn&apos;t supported in this browser.</MutedText>;
  }

  const percent = Math.round(volume * 100);
  return (
    <div className={styles.controls}>
      <Button aria-pressed={muted} onClick={toggleMute}>
        {muted ? 'Unmute' : 'Mute'}
      </Button>
      <RangeField
        label="Volume"
        min={0}
        max={100}
        value={percent}
        display={`${String(percent)}%`}
        valueText={`${String(percent)} percent`}
        onChange={(value) => {
          setVolume(value / 100);
        }}
        className={styles.volume}
      />
    </div>
  );
}
