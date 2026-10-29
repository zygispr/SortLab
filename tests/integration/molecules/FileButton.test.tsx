import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileButton } from '../../../src/components/molecules/FileButton';

/** The file picker styled as a button, rendered from props alone (feature 002, FR-016). */

function renderPicker() {
  const onFile = vi.fn();
  render(<FileButton label="Upload file" accept=".txt,text/plain" onFile={onFile} />);
  return { onFile, input: screen.getByLabelText<HTMLInputElement>('Upload file') };
}

describe('FileButton', () => {
  it('is a focusable file input named by its visible label', () => {
    const { input } = renderPicker();
    expect(input).toHaveAttribute('type', 'file');
    expect(input).toHaveAttribute('accept', '.txt,text/plain');
    expect(input).not.toHaveAttribute('tabindex', '-1');
    expect(screen.getByText('Upload file')).toBeVisible();
  });

  it('reports the chosen file once, then clears the input', async () => {
    const { input, onFile } = renderPicker();
    const file = new File(['5, 3, 8'], 'numbers.txt', { type: 'text/plain' });
    await userEvent.upload(input, file);
    expect(onFile).toHaveBeenCalledTimes(1);
    expect(onFile).toHaveBeenCalledWith(file);
    expect(input.value).toBe('');
  });

  it('reports nothing when the selection is empty', () => {
    const { input, onFile } = renderPicker();
    fireEvent.change(input, { target: { files: [] } });
    expect(onFile).not.toHaveBeenCalled();
  });
});
