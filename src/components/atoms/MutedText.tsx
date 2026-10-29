import type { ReactNode } from 'react';
import styles from './MutedText.module.scss';

interface MutedTextProps {
  /** `p` (default) for a line of its own, `span` where it sits inline among controls. */
  as?: 'p' | 'span';
  children: ReactNode;
}

/** Secondary helper text in the muted color and small size. */
export function MutedText({ as: Element = 'p', children }: MutedTextProps) {
  return <Element className={styles.muted}>{children}</Element>;
}
