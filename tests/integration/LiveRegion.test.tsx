import { act, render, screen } from '@testing-library/react';
import { LiveRegion } from '../../src/components/LiveRegion';
import { useAppStore } from '../../src/store/appStore';

beforeEach(() => {
  useAppStore.setState(useAppStore.getInitialState(), true);
});

describe('LiveRegion', () => {
  it('is a polite status region that is empty at first', () => {
    render(<LiveRegion />);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toBeEmptyDOMElement();
  });

  it('renders the latest announcement', () => {
    render(<LiveRegion />);
    act(() => {
      useAppStore.getState().announce('Loaded 50 values from Random · 50 values.');
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      'Loaded 50 values from Random · 50 values.',
    );
  });

  it('re-renders repeated text as a new node so screen readers announce it again', () => {
    render(<LiveRegion />);
    act(() => {
      useAppStore.getState().announce('Paused.');
    });
    const first = screen.getByText('Paused.');
    act(() => {
      useAppStore.getState().announce('Paused.');
    });
    const second = screen.getByText('Paused.');
    expect(second).not.toBe(first);
  });
});
