import type { ReactNode } from 'react';
import styles from './App.module.css';
import { LiveRegion } from './components/LiveRegion';

interface RegionProps {
  id: string;
  title: string;
  /** Keep the heading for assistive technology but hide it visually. */
  hideTitle?: boolean;
  className?: string;
  children?: ReactNode;
}

/** A labelled page region (`<section>` named by its `<h2>`). */
function Region({ id, title, hideTitle = false, className, children }: RegionProps) {
  const headingId = `${id}-heading`;
  return (
    <section aria-labelledby={headingId} className={className ?? styles.panel}>
      <h2 id={headingId} className={hideTitle ? 'visually-hidden' : styles.panelHeading}>
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * Page shell (ui-contract.md → Layout): regions in reading order, stacked on phones, with
 * the data and algorithm controls beside the visualization from 1,024 px.
 */
export function App() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>SortLab</h1>
      </header>
      <main className={styles.main}>
        <div className={styles.controls}>
          <Region id="data" title="Data" />
          <Region id="algorithm" title="Algorithm" />
        </div>
        <div className={styles.stage}>
          <Region id="visualization" title="Visualization" hideTitle />
          <Region id="playback" title="Playback" hideTitle />
          <Region id="sound" title="Sound" />
        </div>
        <Region
          id="summary"
          title="Run summary"
          className={[styles.panel, styles.summary].join(' ')}
        />
        <LiveRegion />
      </main>
    </div>
  );
}
