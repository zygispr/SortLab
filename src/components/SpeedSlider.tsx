import { MAX_SPEED, MIN_SPEED, useAppStore } from '../store/appStore';
import { clamp } from '../util/clamp';
import { RangeField } from './RangeField';

/** Slider resolution: positions 0…1000 map logarithmically onto 2…60,000 steps/s. */
const POSITIONS = 1000;
const RANGE = MAX_SPEED / MIN_SPEED;

/** Speed in steps per second for a slider position, rounded to 2 significant figures. */
export function speedFromPosition(position: number): number {
  const raw = MIN_SPEED * RANGE ** (position / POSITIONS);
  return clamp(Number(raw.toPrecision(2)), MIN_SPEED, MAX_SPEED);
}

/** Slider position closest to a speed in steps per second. */
export function positionFromSpeed(speed: number): number {
  return Math.round((POSITIONS * Math.log(speed / MIN_SPEED)) / Math.log(RANGE));
}

/** Logarithmic speed slider (FR-013); changes apply on the next frame. */
export function SpeedSlider() {
  const speed = useAppStore((s) => s.speed);
  const setSpeed = useAppStore((s) => s.setSpeed);
  const text = `${speed.toLocaleString()} steps per second`;

  return (
    <RangeField
      label="Speed"
      min={0}
      max={POSITIONS}
      value={positionFromSpeed(speed)}
      display={`${speed.toLocaleString()} steps/s`}
      valueText={text}
      onChange={(position) => {
        setSpeed(speedFromPosition(position));
      }}
    />
  );
}
