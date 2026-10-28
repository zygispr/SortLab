import { useId } from 'react';
import { MAX_SIZE, MIN_SIZE, SIZE_STEP } from '../dataset/random';
import { useAppStore } from '../store/appStore';
import controls from './controls.module.css';
import styles from './DataPanel.module.css';

/** Dataset size slider, Generate button, and the current dataset's label (FR-002). */
export function DataPanel() {
  const size = useAppStore((s) => s.datasetSize);
  const label = useAppStore((s) => s.dataset.label);
  const setDatasetSize = useAppStore((s) => s.setDatasetSize);
  const generateDataset = useAppStore((s) => s.generateDataset);
  const sliderId = useId();

  return (
    <div className={styles.panel}>
      <div className={controls.field}>
        <div className={controls.fieldHeader}>
          <label htmlFor={sliderId}>Dataset size</label>
          <span className={controls.fieldValue} aria-hidden="true">
            {size}
          </span>
        </div>
        <input
          id={sliderId}
          className={controls.slider}
          type="range"
          min={MIN_SIZE}
          max={MAX_SIZE}
          step={SIZE_STEP}
          value={size}
          aria-valuetext={`${String(size)} values`}
          onChange={(e) => {
            setDatasetSize(Number(e.target.value));
          }}
        />
      </div>
      <button type="button" className={controls.primary} onClick={generateDataset}>
        Generate
      </button>
      <p className={controls.muted}>
        Current data: <strong>{label}</strong>
      </p>
    </div>
  );
}
