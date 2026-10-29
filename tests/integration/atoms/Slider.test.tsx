import { fireEvent, render, screen } from '@testing-library/react';
import { Slider } from '../../../src/components/atoms/Slider';

/** The slider atom, rendered from props alone (feature 002, FR-008, FR-016). */

describe('Slider', () => {
  it('is a slider with the given id, range, value, and spoken value', () => {
    render(
      <Slider
        id="speed"
        min={1}
        max={60}
        step={1}
        value={5}
        valueText="5 steps per second"
        onChange={vi.fn()}
      />,
    );
    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('id', 'speed');
    expect(slider).toHaveAttribute('min', '1');
    expect(slider).toHaveAttribute('max', '60');
    expect(slider).toHaveAttribute('step', '1');
    expect(slider).toHaveValue('5');
    expect(slider).toHaveAttribute('aria-valuetext', '5 steps per second');
  });

  it('reports a change as a number', () => {
    const onChange = vi.fn();
    render(<Slider id="size" min={0} max={10} value={3} valueText="3" onChange={onChange} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '7' } });
    expect(onChange).toHaveBeenCalledWith(7);
  });
});
