import type { ReactNode } from 'react';
import styles from './Region.module.css';

interface RegionProps {
  /** Base id; the heading gets `${id}-heading`, which names the section. */
  id: string;
  /** The `<h2>` text and the region's accessible name. */
  title: string;
  /** Keep the heading for assistive technology but hide it visually. */
  hideTitle?: boolean;
  children?: ReactNode;
}

/**
 * A labelled page region: a `<section>` named by its `<h2>`, drawn as a panel. Pure
 * layout; everything it shows comes from `children`.
 */
export function Region({ id, title, hideTitle = false, children }: RegionProps) {
  const headingId = `${id}-heading`;
  return (
    <section aria-labelledby={headingId} className={styles.panel}>
      <h2 id={headingId} className={hideTitle ? 'visually-hidden' : styles.panelHeading}>
        {title}
      </h2>
      {children}
    </section>
  );
}
