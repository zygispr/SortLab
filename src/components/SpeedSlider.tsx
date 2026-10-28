import { useId } from 'react';
import { MAX_SPEED, MIN_SPEED, useAppStore } from '../store/appStore';
import controls from './controls.module.css';

/** Slider resolution: positions 0…1000 map logarithmically onto 2…60,000 steps/s. */
const POSITIONS = 1000;
const RANGE = MAX_SPEED / MIN_SPEED;

/** Speed in steps per second for a slider position, rounded to 2 significant figures. */
export function speedFromPosition(position: number): number {
  const raw = MIN_SPEED * RANGE ** (position / POSITIONS);
  return Math.min(MAX_SPEED, Math.max(MIN_SPEED, Number(raw.toPrecision(2))));
}

/** Slider position closest to a speed in steps per second. */
export function positionFromSpeed(speed: number): number {
  return Math.round((POSITIONS * Math.log(speed / MIN_SPEED)) / Math.log(RANGE));
}

/** Logarithmic speed slider (FR-013); changes apply on the next frame. */
export function SpeedSlider() {
  const speed = useAppStore((s) => s.speed);
  const setSpeed = useAppStore((s) => s.setSpeed);
  const id = useId();
  const text = `${speed.toLocaleString()} steps per second`;

  return (
    <div className={controls.field}>
      <div className={controls.fieldHeader}>
        <label htmlFor={id}>Speed</label>
        <span className={controls.fieldValue} aria-hidden="true">
          {speed.toLocaleString()} steps/s
        </span>
      </div>
      <input
        id={id}
        className={controls.slider}
        type="range"
        min={0}
        max={POSITIONS}
        value={positionFromSpeed(speed)}
        aria-valuetext={text}
        onChange={(e) => {
          setSpeed(speedFromPosition(Number(e.target.value)));
        }}
      />
    </div>
  );
}
