import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AlgorithmInfo } from '../../src/components/AlgorithmInfo';
import { AlgorithmPicker } from '../../src/components/AlgorithmPicker';
import { act } from '@testing-library/react';
import { useAppStore } from '../../src/store/appStore';
import { resetStore, spyOn } from './storeHelpers';

beforeEach(resetStore);

describe('AlgorithmPicker', () => {
  it('groups the 20 algorithms by family in FR-009 order', () => {
    render(<AlgorithmPicker />);
    const select = screen.getByRole('combobox', { name: 'Algorithm' });
    const groups = Array.from(select.querySelectorAll('optgroup'));
    expect(groups.map((g) => g.label)).toEqual([
      'Exchange',
      'Selection',
      'Insertion',
      'Divide and conquer',
      'Hybrid',
      'Non-comparison',
    ]);
    expect(
      within(groups[0]!)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Bubble Sort', 'Cocktail Shaker Sort', 'Odd-Even Sort', 'Comb Sort', 'Gnome Sort']);
    expect(within(select).getAllByRole('option')).toHaveLength(20);
    expect(
      within(groups[5]!)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['Counting Sort', 'Radix Sort (LSD)', 'Radix Sort (MSD)', 'Bucket Sort']);
  });

  it('selects Bubble Sort by default', () => {
    render(<AlgorithmPicker />);
    expect(screen.getByRole('combobox', { name: 'Algorithm' })).toHaveValue('bubble');
  });

  it('calls selectAlgorithm when the selection changes', async () => {
    const { selectAlgorithm } = spyOn('selectAlgorithm');
    render(<AlgorithmPicker />);
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Algorithm' }), 'merge');
    expect(selectAlgorithm).toHaveBeenCalledWith('merge');
  });
});

describe('AlgorithmInfo', () => {
  it('shows the selected algorithm’s description and complexity', () => {
    render(<AlgorithmInfo />);
    expect(screen.getByText(/swapping neighbours that are out of order/)).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Complexity' });
    expect(within(list).getByText('Best').nextSibling).toHaveTextContent('O(n)');
    expect(within(list).getByText('Worst').nextSibling).toHaveTextContent('O(n²)');
    expect(within(list).getByText('Average')).toBeInTheDocument();
    expect(within(list).getByText('Space').nextSibling).toHaveTextContent('O(1)');
  });

  it('updates when the selection changes', () => {
    render(<AlgorithmInfo />);
    act(() => {
      useAppStore.setState({ algorithmId: 'merge' });
    });
    expect(screen.getByText(/merges the two sorted halves/)).toBeInTheDocument();
  });
});

describe('AlgorithmPicker with uploaded data (T064)', () => {
  const option = (name: RegExp) => screen.getByRole('option', { name });

  it('disables algorithms that cannot sort decimals, with the reason in the label', () => {
    render(<AlgorithmPicker />);
    act(() => {
      useAppStore.getState().loadUserDataset([1.5, -2, 3], 'paste', 'Pasted numbers');
    });
    expect(option(/^Counting Sort/)).toBeDisabled();
    expect(option(/^Counting Sort/)).toHaveTextContent('Counting Sort — needs whole numbers');
    expect(option(/^Radix Sort \(LSD\)/)).toHaveTextContent(
      'Radix Sort (LSD) — needs whole numbers',
    );
    expect(option(/^Radix Sort \(LSD\)/)).toBeDisabled();
    expect(option(/^Radix Sort \(MSD\)/)).toBeDisabled();
    expect(option(/^Bucket Sort$/)).toBeEnabled();
    expect(option(/^Bubble Sort$/)).toBeEnabled();
  });

  it('explains other reasons in lower case', () => {
    render(<AlgorithmPicker />);
    act(() => {
      useAppStore.getState().loadUserDataset([-5, 20_000], 'paste', 'Pasted numbers');
    });
    expect(option(/^Counting Sort/)).toHaveTextContent(
      'Counting Sort — range too wide (over 10,000)',
    );
    expect(option(/^Radix Sort \(MSD\)/)).toHaveTextContent(
      'Radix Sort (MSD) — needs non-negative numbers',
    );
  });

  it('disables nothing for a random dataset', () => {
    render(<AlgorithmPicker />);
    for (const o of within(screen.getByRole('combobox', { name: 'Algorithm' })).getAllByRole(
      'option',
    ))
      expect(o).toBeEnabled();
  });

  it('shows why the selection was switched', () => {
    render(<AlgorithmPicker />);
    act(() => {
      useAppStore.getState().selectAlgorithm('radix-msd');
      useAppStore.getState().loadUserDataset([1.5, 2], 'paste', 'Pasted numbers');
    });
    expect(
      screen.getByText(
        "Radix Sort (MSD) can't sort this data (Needs whole numbers). Switched to Bubble Sort.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Algorithm' })).toHaveValue('bubble');
  });
});
