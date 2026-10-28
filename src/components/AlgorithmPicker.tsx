import { useId } from 'react';
import { ALGORITHMS, checkSupport, FAMILY_LABELS } from '../algorithms/registry';
import type { AlgorithmFamily } from '../algorithms/types';
import { toFacts } from '../dataset/facts';
import { useAppStore } from '../store/appStore';
import styles from './AlgorithmPanel.module.css';

const FAMILIES = Object.keys(FAMILY_LABELS) as AlgorithmFamily[];

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

/**
 * Algorithm select, grouped by family in picker order (FR-009). Algorithms that cannot
 * sort the current data are disabled with their reason in the label (FR-009a).
 */
export function AlgorithmPicker() {
  const algorithmId = useAppStore((s) => s.algorithmId);
  const dataset = useAppStore((s) => s.dataset);
  const notice = useAppStore((s) => s.algorithmNotice);
  const selectAlgorithm = useAppStore((s) => s.selectAlgorithm);
  const selectId = useId();
  const facts = toFacts(dataset);

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
            {ALGORITHMS.filter((a) => a.family === family).map((a) => {
              const support = checkSupport(a, facts);
              return (
                <option key={a.id} value={a.id} disabled={!support.ok}>
                  {support.ok ? a.name : `${a.name} — ${lowerFirst(support.reason)}`}
                </option>
              );
            })}
          </optgroup>
        ))}
      </select>
      {notice && <p className={styles.notice}>{notice}</p>}
    </div>
  );
}
