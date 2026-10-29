import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataPanel } from '../../src/components/organisms/DataPanel';
import { useAppStore } from '../../src/store/appStore';
import { resetStore } from './storeHelpers';

beforeEach(resetStore);

describe('DataPanel (random data)', () => {
  it('has a Dataset size slider from 10 to 1,000 in steps of 10, default 50', () => {
    render(<DataPanel />);
    const slider = screen.getByRole('slider', { name: 'Dataset size' });
    expect(slider).toHaveAttribute('min', '10');
    expect(slider).toHaveAttribute('max', '1000');
    expect(slider).toHaveAttribute('step', '10');
    expect(slider).toHaveValue('50');
    expect(slider).toHaveAttribute('aria-valuetext', '50 values');
  });

  it('Generate replaces the dataset with one of the chosen size', async () => {
    render(<DataPanel />);
    const before = useAppStore.getState().dataset.id;
    fireEvent.change(screen.getByRole('slider', { name: 'Dataset size' }), {
      target: { value: '200' },
    });
    expect(screen.getByRole('slider', { name: 'Dataset size' })).toHaveAttribute(
      'aria-valuetext',
      '200 values',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Generate' }));
    const { dataset } = useAppStore.getState();
    expect(dataset.id).toBe(before + 1);
    expect(dataset.original).toHaveLength(200);
    expect(screen.getByText('Random · 200 values')).toBeInTheDocument();
  });
});
