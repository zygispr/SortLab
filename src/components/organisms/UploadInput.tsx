import { useId } from 'react';
import { readDatasetFile } from '../../dataset/parse';
import { useAppStore } from '../../store/appStore';
import controls from '../../styles/controls.module.css';
import styles from './DataPanel.module.css';

/**
 * "Upload file" button for a .txt or .csv of numbers (FR-003). The native file input stays
 * in the tab order but is visually hidden; its label is styled as the button.
 */
export function UploadInput() {
  const loadUserDataset = useAppStore((s) => s.loadUserDataset);
  const setDataError = useAppStore((s) => s.setDataError);
  const id = useId();

  const onChange = async (input: HTMLInputElement) => {
    const file = input.files?.[0];
    // Clearing the value lets the same file be chosen again after fixing it.
    input.value = '';
    if (!file) return;
    const result = await readDatasetFile(file);
    if (result.ok) loadUserDataset(result.values, 'upload', file.name);
    else setDataError(result.error.message);
  };

  return (
    <div className={styles.upload}>
      <input
        id={id}
        className={['visually-hidden', styles.fileInput].join(' ')}
        type="file"
        accept=".txt,.csv,text/plain,text/csv"
        onChange={(e) => void onChange(e.currentTarget)}
      />
      <label htmlFor={id} className={controls.button}>
        Upload file
      </label>
    </div>
  );
}
