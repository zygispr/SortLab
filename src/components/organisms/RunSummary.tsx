import { getAlgorithm } from '../../algorithms/registry';
import { useAppStore } from '../../store/appStore';
import controls from '../../styles/controls.module.css';
import { formatSeconds } from '../../util/format';
import styles from './RunSummary.module.css';

/** Comparisons, moves, and time for every finished run on the current dataset (FR-022). */
export function RunSummary() {
  const history = useAppStore((s) => s.history);

  if (history.length === 0) {
    return <p className={controls.muted}>No runs yet. Press Start to sort this dataset.</p>;
  }

  return (
    // Focusable so keyboard users can scroll it if a narrow or zoomed screen makes it overflow.
    <div className={styles.scroll} role="region" aria-label="Run summary table" tabIndex={0}>
      <table className={styles.table}>
        <caption className="visually-hidden">Run summary</caption>
        <thead>
          <tr>
            <th scope="col">Algorithm</th>
            <th scope="col">Comparisons</th>
            <th scope="col">Moves</th>
            <th scope="col">Time</th>
          </tr>
        </thead>
        <tbody>
          {history.map((record, i) => (
            <tr key={i}>
              <td>{getAlgorithm(record.algorithmId).name}</td>
              <td>{record.comparisons.toLocaleString()}</td>
              <td>{record.moves.toLocaleString()}</td>
              <td>{formatSeconds(record.elapsedMs)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
