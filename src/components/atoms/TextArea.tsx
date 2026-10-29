import type { TextareaHTMLAttributes } from 'react';
import styles from './TextArea.module.scss';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Marks the content as invalid: sets `aria-invalid="true"` and shows the error border. */
  invalid?: boolean;
}

/**
 * A multi-line text box. Every native prop goes to the `<textarea>`; a passed `className`
 * is appended to its own.
 */
export function TextArea({ invalid = false, className, ...props }: TextAreaProps) {
  return (
    <textarea
      className={className ? [styles.textarea, className].join(' ') : styles.textarea}
      aria-invalid={invalid ? true : undefined}
      {...props}
    />
  );
}
