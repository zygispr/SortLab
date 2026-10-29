import { render, screen, waitFor, within } from '@testing-library/react';
import { Counters } from '../../src/components/organisms/Counters';
import { Legend } from '../../src/components/molecules/Legend';
import { Visualizer } from '../../src/components/organisms/Visualizer';
import { useAppStore } from '../../src/store/appStore';
import { resetStore, setRun } from './storeHelpers';

beforeEach(async () => {
  resetStore();
  useAppStore.getState().retryPrepare();
  await waitFor(() => {
    expect(useAppStore.getState().run.status).toBe('ready');
  });
});

describe('Visualizer', () => {
  it('is an image of the bars with a descriptive label', () => {
    render(<Visualizer />);
    const { total } = useAppStore.getState().run;
    expect(
      screen.getByRole('img', {
        name: `Bar chart of 50 values, sorting with Bubble Sort, step 0 of ${total.toLocaleString()}.`,
      }),
    ).toBeInTheDocument();
  });

  it('updates the label with the run position', () => {
    render(<Visualizer />);
    setRun({ position: 12 });
    expect(screen.getByRole('img', { name: /step 12 of/ })).toBeInTheDocument();
  });

  it('shows "Sorted with {name}" when finished', () => {
    render(<Visualizer />);
    expect(screen.queryByText('Sorted with Bubble Sort')).not.toBeInTheDocument();
    setRun({ status: 'finished' });
    expect(screen.getByText('Sorted with Bubble Sort')).toBeInTheDocument();
  });
});

describe('Legend', () => {
  it('explains each state with a swatch and a non-color marker', () => {
    render(<Legend />);
    const list = screen.getByRole('list', { name: 'Legend' });
    const items = within(list).getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual([
      'Unsorted',
      '▲Comparing',
      '●Moving',
      '▬Sorted',
    ]);
    for (const item of items) expect(item.querySelector('[data-swatch]')).not.toBeNull();
  });
});

describe('Counters', () => {
  it('shows comparisons, moves, elapsed time, and the step position', () => {
    render(<Counters />);
    setRun({ comparisons: 1234, moves: 56, elapsedMs: 2345, position: 7, total: 1225 });
    const counters = screen.getByRole('list', { name: 'Counters' });
    expect(within(counters).getByText('Comparisons').nextSibling).toHaveTextContent('1,234');
    expect(within(counters).getByText('Moves').nextSibling).toHaveTextContent('56');
    expect(within(counters).getByText('Time').nextSibling).toHaveTextContent('2.3 s');
    expect(within(counters).getByText('Step').nextSibling).toHaveTextContent('7 / 1,225');
  });
});
