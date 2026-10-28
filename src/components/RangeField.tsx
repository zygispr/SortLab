import { useId } from 'react';
import controls from './controls.module.css';

interface RangeFieldProps {
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

/** A labelled slider with its current value shown beside the label. */
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
    <div className={className ? [controls.field, className].join(' ') : controls.field}>
      <div className={controls.fieldHeader}>
        <label htmlFor={id}>{label}</label>
        <span className={controls.fieldValue} aria-hidden="true">
          {display}
        </span>
      </div>
      <input
        id={id}
        className={controls.slider}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={valueText}
        onChange={(e) => {
          onChange(Number(e.target.value));
        }}
      />
    </div>
  );
}
