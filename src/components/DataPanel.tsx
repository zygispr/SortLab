import { useId } from 'react';
import { MAX_SIZE, MIN_SIZE, SIZE_STEP } from '../dataset/random';
import { useAppStore } from '../store/appStore';
import controls from './controls.module.css';
import styles from './DataPanel.module.css';
import { PasteInput } from './PasteInput';
import { RangeField } from './RangeField';
import { UploadInput } from './UploadInput';

/**
 * Data sources: a random dataset of the chosen size (FR-002), an uploaded file (FR-003),
 * or pasted numbers (FR-004), plus the current dataset's label and any input error.
 */
export function DataPanel() {
  const size = useAppStore((s) => s.datasetSize);
  const label = useAppStore((s) => s.dataset.label);
  const dataError = useAppStore((s) => s.dataError);
  const setDatasetSize = useAppStore((s) => s.setDatasetSize);
  const generateDataset = useAppStore((s) => s.generateDataset);
  const errorId = useId();

  return (
    <div className={styles.panel}>
      <RangeField
        label="Dataset size"
        min={MIN_SIZE}
        max={MAX_SIZE}
        step={SIZE_STEP}
        value={size}
        display={String(size)}
        valueText={`${String(size)} values`}
        onChange={setDatasetSize}
      />
      <button type="button" className={controls.primary} onClick={generateDataset}>
        Generate
      </button>

      <div className={styles.divider} aria-hidden="true">
        or use your own numbers
      </div>
      <UploadInput />
      <PasteInput errorId={errorId} />
      {dataError && (
        <p id={errorId} className={styles.error}>
          <span aria-hidden="true">⚠ </span>
          {dataError}
        </p>
      )}

      <p className={controls.muted}>
        Current data: <strong>{label}</strong>
      </p>
    </div>
  );
}
