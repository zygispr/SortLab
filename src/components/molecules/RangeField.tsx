import { useId } from 'react';
import { Slider } from '../atoms/Slider';
import styles from './RangeField.module.css';

export interface RangeFieldProps {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  /** Shown next to the label; hidden from assistive technology, which reads `valueText`. */
  display: string;
  /** Spoken value, e.g. "50 values" (`aria-valuetext`). */
  valueText: string;
  onChange: (value: number) => void;
  className?: string;
}

/**
 * A labelled slider with its current value shown beside the label: the label names the
 * slider, the visible value is hidden from assistive technology, and `valueText` is spoken
 * instead. A passed `className` is appended to the field's own.
 */
export function RangeField({
  label,
  min,
  max,
  step,
  value,
  display,
  valueText,
  onChange,
  className,
}: RangeFieldProps) {
  const id = useId();
  return (
    <div className={className ? [styles.field, className].join(' ') : styles.field}>
      <div className={styles.fieldHeader}>
        <label htmlFor={id}>{label}</label>
        <span className={styles.fieldValue} aria-hidden="true">
          {display}
        </span>
      </div>
      <Slider
        id={id}
        min={min}
        max={max}
        step={step}
        value={value}
        valueText={valueText}
        onChange={onChange}
      />
    </div>
  );
}
