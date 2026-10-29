import { fireEvent, render, screen } from '@testing-library/react';
import { TextArea } from '../../../src/components/atoms/TextArea';

/** The text area atom, rendered from props alone (feature 002, FR-016). */

describe('TextArea', () => {
  it('passes native textarea props through', () => {
    const onChange = vi.fn();
    render(
      <TextArea
        id="paste"
        rows={3}
        value="5, 3"
        placeholder="e.g. 5, 3, 8, 1"
        aria-describedby="hint"
        onChange={onChange}
      />,
    );
    const box = screen.getByRole('textbox');
    expect(box.tagName).toBe('TEXTAREA');
    expect(box).toHaveAttribute('id', 'paste');
    expect(box).toHaveAttribute('rows', '3');
    expect(box).toHaveValue('5, 3');
    expect(box).toHaveAttribute('placeholder', 'e.g. 5, 3, 8, 1');
    expect(box).toHaveAttribute('aria-describedby', 'hint');
    fireEvent.change(box, { target: { value: '5, 3, 8' } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('marks itself invalid only when invalid is set', () => {
    const { rerender } = render(<TextArea invalid />);
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true');
    rerender(<TextArea />);
    expect(screen.getByRole('textbox')).not.toHaveAttribute('aria-invalid');
  });
});
