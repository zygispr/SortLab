import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlaybackBar } from '../../src/components/PlaybackBar';
import { positionFromSpeed, speedFromPosition } from '../../src/components/SpeedSlider';
import type { RunStatus } from '../../src/store/appStore';
import { resetStore, setRun, spyOn } from './storeHelpers';

beforeEach(resetStore);

const button = (name: string) => screen.getByRole('button', { name });

describe('PlaybackBar', () => {
  it.each<[RunStatus, string]>([
    ['preparing', 'Start'],
    ['ready', 'Start'],
    ['running', 'Pause'],
    ['paused', 'Resume'],
    ['finished', 'Start'],
  ])('names the toggle "%s" → %s', (status, name) => {
    render(<PlaybackBar />);
    setRun({ status, position: 3, total: 10 });
    expect(button(name)).toBeEnabled();
  });

  it('calls togglePlay from the toggle button', async () => {
    const { togglePlay } = spyOn('togglePlay');
    render(<PlaybackBar />);
    setRun({ status: 'ready', total: 10 });
    await userEvent.click(button('Start'));
    expect(togglePlay).toHaveBeenCalledOnce();
  });

  it.each<[RunStatus, number, boolean]>([
    ['ready', 0, false],
    ['running', 4, false],
    ['paused', 0, false],
    ['paused', 4, true],
    ['finished', 10, true],
  ])('Step back in %s at position %i enabled: %s', (status, position, enabled) => {
    render(<PlaybackBar />);
    setRun({ status, position, total: 10 });
    expect(button('Step back').hasAttribute('disabled')).toBe(!enabled);
  });

  it.each<[RunStatus, number, boolean]>([
    ['preparing', 0, false],
    ['ready', 0, true],
    ['running', 4, false],
    ['paused', 4, true],
    ['paused', 10, false],
    ['finished', 10, false],
  ])('Step forward in %s at position %i enabled: %s', (status, position, enabled) => {
    render(<PlaybackBar />);
    setRun({ status, position, total: 10 });
    expect(button('Step forward').hasAttribute('disabled')).toBe(!enabled);
  });

  it.each<[RunStatus, number, boolean]>([
    ['ready', 0, false],
    ['running', 4, true],
    ['finished', 10, true],
  ])('Reset in %s at position %i enabled: %s', (status, position, enabled) => {
    render(<PlaybackBar />);
    setRun({ status, position, total: 10 });
    expect(button('Reset').hasAttribute('disabled')).toBe(!enabled);
  });

  it('calls the step and reset actions', async () => {
    const spies = spyOn('stepForward', 'stepBack', 'reset');
    render(<PlaybackBar />);
    setRun({ status: 'paused', position: 4, total: 10 });
    await userEvent.click(button('Step forward'));
    await userEvent.click(button('Step back'));
    await userEvent.click(button('Reset'));
    expect(spies.stepForward).toHaveBeenCalledOnce();
    expect(spies.stepBack).toHaveBeenCalledOnce();
    expect(spies.reset).toHaveBeenCalledOnce();
  });

  it('has a Speed slider reading "100 steps per second" by default', () => {
    render(<PlaybackBar />);
    const slider = screen.getByRole('slider', { name: 'Speed' });
    expect(slider).toHaveAttribute('aria-valuetext', '100 steps per second');
    expect(slider).toHaveValue(String(positionFromSpeed(100)));
  });

  it('sets the speed when the slider moves', () => {
    const { setSpeed } = spyOn('setSpeed');
    render(<PlaybackBar />);
    fireEvent.change(screen.getByRole('slider', { name: 'Speed' }), { target: { value: '1000' } });
    expect(setSpeed).toHaveBeenCalledWith(60_000);
  });

  it('shows a prepare error with a Retry button that re-requests steps', async () => {
    const { retryPrepare } = spyOn('retryPrepare');
    render(<PlaybackBar />);
    setRun({ status: 'preparing', prepareError: true });
    expect(screen.getByText("Couldn't prepare this sort. Try again.")).toBeInTheDocument();
    await userEvent.click(button('Retry'));
    expect(retryPrepare).toHaveBeenCalledOnce();
  });

  it('shows "Preparing…" while a start is queued', async () => {
    const { act } = await import('@testing-library/react');
    const { useAppStore } = await import('../../src/store/appStore');
    render(<PlaybackBar />);
    setRun({ status: 'preparing' });
    expect(screen.queryByText('Preparing…')).not.toBeInTheDocument();
    act(() => {
      useAppStore.setState({ startQueued: true });
    });
    expect(screen.getByText('Preparing…')).toBeInTheDocument();
  });
});

describe('speed slider mapping', () => {
  it.each([
    [0, 2],
    [379, 100],
    [1000, 60_000],
  ])('position %i ↔ %i steps per second', (position, speed) => {
    expect(speedFromPosition(position)).toBe(speed);
    expect(positionFromSpeed(speed)).toBe(position);
  });

  it('rounds to two significant figures and stays within 2–60,000', () => {
    for (let p = 0; p <= 1000; p += 37) {
      const s = speedFromPosition(p);
      expect(s).toBeGreaterThanOrEqual(2);
      expect(s).toBeLessThanOrEqual(60_000);
      expect(Number(s.toPrecision(2))).toBe(s);
    }
  });
});
