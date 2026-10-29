import styles from './Legend.module.css';

const ENTRIES = [
  { name: 'Unsorted', swatch: styles.unsorted, marker: '' },
  { name: 'Comparing', swatch: styles.comparing, marker: '▲' },
  { name: 'Moving', swatch: styles.moving, marker: '●' },
  { name: 'Sorted', swatch: styles.sorted, marker: '▬' },
];

/** Explains each bar state by color and by its non-color marker (FR-018). */
export function Legend() {
  return (
    <ul className={styles.legend} aria-label="Legend">
      {ENTRIES.map(({ name, swatch, marker }) => (
        <li key={name} className={styles.entry}>
          <span className={[styles.swatch, swatch].join(' ')} data-swatch aria-hidden="true" />
          {marker && (
            <span className={styles.marker} aria-hidden="true">
              {marker}
            </span>
          )}
          {name}
        </li>
      ))}
    </ul>
  );
}
