import { fireEvent, render, screen } from '@testing-library/react';
import { useKeyboardShortcuts } from '../../src/hooks/useKeyboardShortcuts';
import { resetStore, setRun, spyOn } from './storeHelpers';

function Harness() {
  useKeyboardShortcuts();
  return (
    <>
      <button type="button">Generate</button>
      <input aria-label="Text" />
      <input aria-label="Number" type="number" />
      <input aria-label="Range" type="range" />
      <select aria-label="Choice">
        <option>a</option>
      </select>
      <textarea aria-label="Notes" />
    </>
  );
}

let spies: ReturnType<typeof spyOn<'togglePlay' | 'stepForward' | 'stepBack'>>;

beforeEach(() => {
  resetStore();
  spies = spyOn('togglePlay', 'stepForward', 'stepBack');
  render(<Harness />);
});

/** Fires keydown on `target`; returns true if the hook prevented the default action. */
const press = (key: string, target: Element = document.body) => !fireEvent.keyDown(target, { key });

describe('useKeyboardShortcuts', () => {
  it('Space toggles Start / Pause / Resume and prevents page scroll', () => {
    setRun({ status: 'running', total: 10 });
    expect(press(' ')).toBe(true);
    expect(spies.togglePlay).toHaveBeenCalledOnce();
  });

  it('→ steps forward only when Step forward is enabled', () => {
    setRun({ status: 'paused', position: 3, total: 10 });
    expect(press('ArrowRight')).toBe(true);
    expect(spies.stepForward).toHaveBeenCalledOnce();
    setRun({ status: 'running' });
    expect(press('ArrowRight')).toBe(false);
    expect(spies.stepForward).toHaveBeenCalledOnce();
  });

  it('← steps back only when Step back is enabled', () => {
    setRun({ status: 'paused', position: 0, total: 10 });
    expect(press('ArrowLeft')).toBe(false);
    setRun({ position: 4 });
    expect(press('ArrowLeft')).toBe(true);
    expect(spies.stepBack).toHaveBeenCalledOnce();
  });

  it.each(['Text', 'Number', 'Range', 'Choice', 'Notes'])(
    'ignores keys in the %s field',
    (name) => {
      setRun({ status: 'paused', position: 3, total: 10 });
      const field = screen.getByRole(
        name === 'Range'
          ? 'slider'
          : name === 'Choice'
            ? 'combobox'
            : name === 'Number'
              ? 'spinbutton'
              : 'textbox',
        { name },
      );
      for (const key of [' ', 'ArrowRight', 'ArrowLeft']) expect(press(key, field)).toBe(false);
      expect(spies.togglePlay).not.toHaveBeenCalled();
      expect(spies.stepForward).not.toHaveBeenCalled();
      expect(spies.stepBack).not.toHaveBeenCalled();
    },
  );

  it('leaves Space on a focused button to the button itself', () => {
    setRun({ status: 'paused', position: 3, total: 10 });
    const generate = screen.getByRole('button', { name: 'Generate' });
    expect(press(' ', generate)).toBe(false);
    expect(spies.togglePlay).not.toHaveBeenCalled();
    expect(press('ArrowRight', generate)).toBe(true);
    expect(spies.stepForward).toHaveBeenCalledOnce();
  });

  it('ignores shortcuts with modifier keys', () => {
    setRun({ status: 'paused', position: 3, total: 10 });
    expect(!fireEvent.keyDown(document.body, { key: 'ArrowRight', metaKey: true })).toBe(false);
    expect(spies.stepForward).not.toHaveBeenCalled();
  });
});
