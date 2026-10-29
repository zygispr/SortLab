import { useAppStore } from '../../store/appStore';
import { Button } from '../atoms/Button';
import styles from './Sound.module.css';

/** First-visit "Turn on sound" prompt next to Start, until the user answers (FR-026a). */
export function SoundPrompt() {
  const visible = useAppStore((s) => s.soundSupported && !s.soundPromptAnswered);
  const { enableSound, dismissSoundPrompt } = useAppStore.getState();
  if (!visible) return null;

  return (
    <span className={styles.prompt}>
      <Button onClick={enableSound}>Turn on sound</Button>
      <Button variant="quiet" onClick={dismissSoundPrompt}>
        Not now
      </Button>
    </span>
  );
}
