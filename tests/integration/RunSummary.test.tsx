import { act, render, screen, within } from '@testing-library/react';
import { RunSummary } from '../../src/components/RunSummary';
import { useAppStore } from '../../src/store/appStore';
import { resetStore } from './storeHelpers';

beforeEach(resetStore);

const record = (algorithmId: string, comparisons: number, moves: number, elapsedMs: number) => ({
  algorithmId,
  comparisons,
  moves,
  elapsedMs,
  datasetId: useAppStore.getState().dataset.id,
});

describe('RunSummary', () => {
  it('shows an empty state before any run finishes', () => {
    render(<RunSummary />);
    expect(screen.getByText('No runs yet. Press Start to sort this dataset.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('lists each run in order with name, comparisons, moves, and time', () => {
    render(<RunSummary />);
    act(() => {
      useAppStore.setState({
        history: [record('bubble', 1225, 612, 12_345), record('merge', 221, 286, 900)],
      });
    });
    const table = screen.getByRole('table', { name: 'Run summary' });
    const headers = within(table).getAllByRole('columnheader');
    expect(headers.map((h) => h.textContent)).toEqual([
      'Algorithm',
      'Comparisons',
      'Moves',
      'Time',
    ]);
    for (const h of headers) expect(h).toHaveAttribute('scope', 'col');

    const rows = within(table).getAllByRole('row').slice(1);
    expect(
      rows.map((r) =>
        within(r)
          .getAllByRole('cell')
          .map((c) => c.textContent),
      ),
    ).toEqual([
      ['Bubble Sort', '1,225', '612', '12.3 s'],
      ['Merge Sort', '221', '286', '0.9 s'],
    ]);
    expect(screen.queryByText(/No runs yet/)).not.toBeInTheDocument();
  });
});

describe('RunSummary scrolling (regression: axe scrollable-region-focusable at 360 px)', () => {
  it('wraps the table in a focusable, labelled region so it can be scrolled by keyboard', () => {
    render(<RunSummary />);
    act(() => {
      useAppStore.setState({ history: [record('bubble', 1, 1, 1)] });
    });
    const region = screen.getByRole('region', { name: 'Run summary table' });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(within(region).getByRole('table')).toBeInTheDocument();
  });
});
