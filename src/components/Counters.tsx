import { useAppStore } from '../store/appStore';
import styles from './Counters.module.css';

/** Live comparison and move counts, elapsed time, and step position (FR-021). */
export function Counters() {
  const { comparisons, moves, elapsedMs, position, total } = useAppStore((s) => s.run);
  const rows: [string, string][] = [
    ['Comparisons', comparisons.toLocaleString()],
    ['Moves', moves.toLocaleString()],
    ['Time', `${(elapsedMs / 1000).toFixed(1)} s`],
    ['Step', `${position.toLocaleString()} / ${total.toLocaleString()}`],
  ];

  return (
    <ul className={styles.counters} aria-label="Counters">
      {rows.map(([label, value]) => (
        <li key={label}>
          <span className={styles.label}>{label}</span>
          <span className={styles.value}>{value}</span>
        </li>
      ))}
    </ul>
  );
}
