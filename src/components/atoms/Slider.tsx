import styles from './Slider.module.css';

interface SliderProps {
  /** Links the slider to its `<label htmlFor>`. */
  id: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  /** Spoken value, e.g. "50 values" (`aria-valuetext`). */
  valueText: string;
  /** Called with the new value as a number. */
  onChange: (value: number) => void;
}

/** A range input. It has no label of its own; `RangeField` names it. */
export function Slider({ id, min, max, step, value, valueText, onChange }: SliderProps) {
  return (
    <input
      id={id}
      className={styles.slider}
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
  );
}
