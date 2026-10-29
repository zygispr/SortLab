import { fireEvent, render, screen } from '@testing-library/react';
import { RangeField } from '../../../src/components/molecules/RangeField';

/** The labelled slider molecule, rendered from props alone (feature 002, FR-008, FR-016). */

function renderField(overrides: Partial<Parameters<typeof RangeField>[0]> = {}) {
  const onChange = vi.fn();
  const view = render(
    <RangeField
      label="Speed"
      min={1}
      max={100}
      step={1}
      value={10}
      display="10 steps/s"
      valueText="10 steps per second"
      onChange={onChange}
      {...overrides}
    />,
  );
  return { ...view, onChange, slider: screen.getByRole('slider', { name: 'Speed' }) };
}

describe('RangeField', () => {
  it('names the slider by its label and sets its range and value', () => {
    const { slider } = renderField();
    expect(slider).toHaveAttribute('min', '1');
    expect(slider).toHaveAttribute('max', '100');
    expect(slider).toHaveAttribute('step', '1');
    expect(slider).toHaveValue('10');
  });

  it('speaks valueText and shows display hidden from assistive technology', () => {
    const { slider } = renderField();
    expect(slider).toHaveAttribute('aria-valuetext', '10 steps per second');
    expect(screen.getByText('10 steps/s')).toHaveAttribute('aria-hidden', 'true');
  });

  it('reports a change as a number', () => {
    const { slider, onChange } = renderField();
    fireEvent.change(slider, { target: { value: '20' } });
    expect(onChange).toHaveBeenCalledWith(20);
  });

  it('adds a passed className to its own class', () => {
    const { container } = renderField({ className: 'extra' });
    const field = container.firstElementChild!;
    expect(field).toHaveClass('extra');
    expect(field.classList.length).toBe(2);
  });
});
