import { useId } from 'react';
import styles from './FileButton.module.css';

interface FileButtonProps {
  /** Visible text and accessible name, e.g. "Upload file". */
  label: string;
  /** File types the picker offers (the input's `accept`). */
  accept: string;
  /** Called with the chosen file; not called when the selection is empty. */
  onFile: (file: File) => void;
}

/**
 * A file picker that looks like a secondary button. The native file input stays in the
 * tab order but is visually hidden; its label carries the button look and shows the focus
 * outline while the input has keyboard focus.
 */
export function FileButton({ label, accept, onFile }: FileButtonProps) {
  const id = useId();

  const onChange = (input: HTMLInputElement) => {
    const file = input.files?.[0];
    // Clearing the value lets the same file be chosen again after fixing it.
    input.value = '';
    if (file) onFile(file);
  };

  return (
    <div className={styles.upload}>
      <input
        id={id}
        className={['visually-hidden', styles.fileInput].join(' ')}
        type="file"
        accept={accept}
        onChange={(e) => {
          onChange(e.currentTarget);
        }}
      />
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
    </div>
  );
}
