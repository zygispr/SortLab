import { getAlgorithm } from '../../algorithms/registry';
import { useAppStore } from '../../store/appStore';
import styles from './AlgorithmPanel.module.scss';

/** Description and typical complexity of the selected algorithm (FR-010). */
export function AlgorithmInfo() {
  const algorithm = getAlgorithm(useAppStore((s) => s.algorithmId));
  const { best, average, worst, space } = algorithm.complexity;
  const rows: [string, string][] = [
    ['Best', best],
    ['Average', average],
    ['Worst', worst],
    ['Space', space],
  ];

  return (
    <div className={styles.info}>
      <p>{algorithm.description}</p>
      <ul className={styles.complexity} aria-label="Complexity">
        {rows.map(([label, value]) => (
          <li key={label}>
            <span className={styles.complexityLabel}>{label}</span>
            <span className={styles.complexityValue}>{value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
