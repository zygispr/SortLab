import type { ReactNode } from 'react';
import styles from './PageLayout.module.scss';

interface PageLayoutProps {
  /** The `<h1>` in the page header. */
  title: string;
  /** Left column from 1,024 px (the Data and Algorithm regions). */
  controls: ReactNode;
  /** Right column from 1,024 px (the Visualization, Playback, and Sound regions). */
  stage: ReactNode;
  /** Full-width row below both columns. */
  summary: ReactNode;
  /** Rendered last inside `<main>`: the screen-reader live region. */
  announcements: ReactNode;
}

/**
 * Page shell (feature 001 ui-contract.md → Layout): regions in reading order, stacked on
 * phones, with the controls beside the stage from 1,024 px. Pure layout; the page passes
 * in every slot.
 */
export function PageLayout({ title, controls, stage, summary, announcements }: PageLayoutProps) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
      </header>
      <main className={styles.main}>
        <div className={styles.controls}>{controls}</div>
        <div className={styles.stage}>{stage}</div>
        <div className={styles.summary}>{summary}</div>
        {announcements}
      </main>
    </div>
  );
}
