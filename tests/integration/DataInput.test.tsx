import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataPanel } from '../../src/components/organisms/DataPanel';
import { useAppStore } from '../../src/store/appStore';
import { resetStore } from './storeHelpers';

beforeEach(resetStore);

const dataset = () => useAppStore.getState().dataset;

describe('Upload file', () => {
  it('accepts .txt and .csv files', () => {
    render(<DataPanel />);
    expect(screen.getByLabelText('Upload file')).toHaveAttribute(
      'accept',
      '.txt,.csv,text/plain,text/csv',
    );
  });

  it('loads a valid file in file order', async () => {
    render(<DataPanel />);
    await userEvent.upload(
      screen.getByLabelText('Upload file'),
      new File(['9, -2.5\n4'], 'scores.csv', { type: 'text/csv' }),
    );
    await waitFor(() => {
      expect(dataset().original).toEqual([9, -2.5, 4]);
    });
    expect(dataset()).toMatchObject({ source: 'upload', label: 'scores.csv' });
    expect(screen.getByText('scores.csv')).toBeInTheDocument();
    expect(useAppStore.getState().announcement?.text).toBe('Loaded 3 values from scores.csv.');
  });

  it('keeps the current dataset and explains an invalid file', async () => {
    render(<DataPanel />);
    const before = dataset().id;
    await userEvent.upload(
      screen.getByLabelText('Upload file'),
      new File(['value\n5\n3'], 'header.csv', { type: 'text/csv' }),
    );
    const message = "Line 1: 'value' is not a number. If this is a header row, remove it.";
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(useAppStore.getState().announcement?.text).toBe(message);
    expect(dataset().id).toBe(before);
  });
});

describe('Paste numbers', () => {
  it('disables "Use these numbers" while the box is empty', async () => {
    render(<DataPanel />);
    const use = screen.getByRole('button', { name: 'Use these numbers' });
    expect(use).toBeDisabled();
    await userEvent.type(screen.getByRole('textbox', { name: 'Paste numbers' }), '   ');
    expect(use).toBeDisabled();
  });

  it('loads pasted numbers in the order entered', async () => {
    render(<DataPanel />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Paste numbers' }), '5, 3, 8, 1');
    await userEvent.click(screen.getByRole('button', { name: 'Use these numbers' }));
    expect(dataset()).toMatchObject({
      original: [5, 3, 8, 1],
      source: 'paste',
      label: 'Pasted numbers',
    });
  });

  it('shows the parser message, links it to the box, and keeps the dataset', async () => {
    render(<DataPanel />);
    const before = dataset().id;
    const box = screen.getByRole('textbox', { name: 'Paste numbers' });
    await userEvent.type(box, '7');
    await userEvent.click(screen.getByRole('button', { name: 'Use these numbers' }));
    const message = screen.getByText('Enter at least 2 numbers to sort.');
    expect(box).toHaveAttribute('aria-describedby', message.id);
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(useAppStore.getState().announcement?.text).toBe('Enter at least 2 numbers to sort.');
    expect(dataset().id).toBe(before);
  });

  it('clears the error after the next successful load', async () => {
    render(<DataPanel />);
    const box = screen.getByRole('textbox', { name: 'Paste numbers' });
    await userEvent.type(box, 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Use these numbers' }));
    expect(screen.getByText("Line 1: 'x' is not a number.")).toBeInTheDocument();
    await userEvent.clear(box);
    await userEvent.type(box, '2 1');
    await userEvent.click(screen.getByRole('button', { name: 'Use these numbers' }));
    expect(screen.queryByText("Line 1: 'x' is not a number.")).not.toBeInTheDocument();
    expect(box).not.toHaveAttribute('aria-invalid');
  });
});
