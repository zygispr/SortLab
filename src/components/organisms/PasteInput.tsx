import { useId, useState } from 'react';
import { parseDataset } from '../../dataset/parse';
import { useAppStore } from '../../store/appStore';
import { Button } from '../atoms/Button';
import { TextArea } from '../atoms/TextArea';
import styles from './DataPanel.module.scss';

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
    <div className={styles.field}>
      <label htmlFor={id} className={styles.fieldHeader}>
        Paste numbers
      </label>
      <TextArea
        id={id}
        rows={3}
        value={text}
        placeholder="e.g. 5, 3, 8, 1"
        aria-describedby={dataError ? errorId : undefined}
        invalid={Boolean(dataError)}
        onChange={(e) => {
          setText(e.target.value);
        }}
      />
      <Button disabled={text.trim() === ''} onClick={use}>
        Use these numbers
      </Button>
    </div>
  );
}
