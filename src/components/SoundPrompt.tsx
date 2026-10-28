import { useAppStore } from '../store/appStore';
import controls from './controls.module.css';
import styles from './Sound.module.css';

/** First-visit "Turn on sound" prompt next to Start, until the user answers (FR-026a). */
export function SoundPrompt() {
  const visible = useAppStore((s) => s.soundSupported && !s.soundPromptAnswered);
  const { enableSound, dismissSoundPrompt } = useAppStore.getState();
  if (!visible) return null;

  return (
    <span className={styles.prompt}>
      <button type="button" className={controls.button} onClick={enableSound}>
        Turn on sound
      </button>
      <button type="button" className={styles.dismiss} onClick={dismissSoundPrompt}>
        Not now
      </button>
    </span>
  );
}
