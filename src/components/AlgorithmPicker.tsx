import { useId } from 'react';
import { ALGORITHMS, FAMILY_LABELS } from '../algorithms/registry';
import type { AlgorithmFamily } from '../algorithms/types';
import { useAppStore } from '../store/appStore';
import styles from './AlgorithmPanel.module.css';

const FAMILIES = Object.keys(FAMILY_LABELS) as AlgorithmFamily[];

/** Algorithm select, grouped by family in picker order (FR-009). */
export function AlgorithmPicker() {
  const algorithmId = useAppStore((s) => s.algorithmId);
  const selectAlgorithm = useAppStore((s) => s.selectAlgorithm);
  const selectId = useId();

  return (
    <div className={styles.picker}>
      <label htmlFor={selectId}>Algorithm</label>
      <select
        id={selectId}
        className={styles.select}
        value={algorithmId}
        onChange={(e) => {
          selectAlgorithm(e.target.value);
        }}
      >
        {FAMILIES.map((family) => (
          <optgroup key={family} label={FAMILY_LABELS[family]}>
            {ALGORITHMS.filter((a) => a.family === family).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
