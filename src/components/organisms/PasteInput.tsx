import { useId, useState } from 'react';
import { parseDataset } from '../../dataset/parse';
import { useAppStore } from '../../store/appStore';
import controls from '../../styles/controls.module.css';
import styles from './DataPanel.module.css';

interface PasteInputProps {
  /** Id of the data error message, linked to the text box while an error is shown. */
  errorId: string;
}

/** Text box for typing or pasting numbers, using the same rules as uploads (FR-004). */
export function PasteInput({ errorId }: PasteInputProps) {
  const [text, setText] = useState('');
  const dataError = useAppStore((s) => s.dataError);
  const loadUserDataset = useAppStore((s) => s.loadUserDataset);
  const setDataError = useAppStore((s) => s.setDataError);
  const id = useId();

  const use = () => {
    const result = parseDataset(text);
    if (result.ok) loadUserDataset(result.values, 'paste', 'Pasted numbers');
    else setDataError(result.error.message);
  };

  return (
    <div className={controls.field}>
      <label htmlFor={id} className={controls.fieldHeader}>
        Paste numbers
      </label>
      <textarea
        id={id}
        className={styles.textarea}
        rows={3}
        value={text}
        placeholder="e.g. 5, 3, 8, 1"
        aria-describedby={dataError ? errorId : undefined}
        aria-invalid={dataError ? true : undefined}
        onChange={(e) => {
          setText(e.target.value);
        }}
      />
      <button type="button" className={controls.button} disabled={text.trim() === ''} onClick={use}>
        Use these numbers
      </button>
    </div>
  );
}
