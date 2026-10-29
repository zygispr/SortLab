import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlaybackBar } from '../../src/components/organisms/PlaybackBar';
import { SoundControls } from '../../src/components/organisms/SoundControls';
import { soundEngine, useAppStore } from '../../src/store/appStore';
import { resetStore, setRun } from './storeHelpers';

beforeEach(() => {
  resetStore();
  act(() => {
    useAppStore.setState({ soundSupported: true });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

const button = (name: string) => screen.getByRole('button', { name });

describe('first visit (FR-026a)', () => {
  it('offers no sound prompt next to Start: Unmute is the one way to turn sound on', () => {
    render(<PlaybackBar />);
    setRun({ status: 'ready', total: 10 });
    const names = screen.getAllByRole('button').map((b) => b.textContent);
    expect(names).toEqual(['Start', 'Step back', 'Step forward', 'Reset']);
  });
});

describe('SoundControls (FR-025)', () => {
  it('shows "Unmute" pressed while muted and "Mute" not pressed while unmuted', async () => {
    const enable = vi.spyOn(soundEngine, 'enable');
    render(<SoundControls />);
    expect(button('Unmute')).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(button('Unmute'));
    expect(enable).toHaveBeenCalled();
    expect(useAppStore.getState().muted).toBe(false);
    expect(button('Mute')).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(button('Mute'));
    expect(useAppStore.getState().muted).toBe(true);
    expect(button('Unmute')).toHaveAttribute('aria-pressed', 'true');
  });

  it('has a Volume slider 0–100 with percent value text', () => {
    render(<SoundControls />);
    const slider = screen.getByRole('slider', { name: 'Volume' });
    expect(slider).toHaveAttribute('min', '0');
    expect(slider).toHaveAttribute('max', '100');
    expect(slider).toHaveValue('50');
    expect(slider).toHaveAttribute('aria-valuetext', '50 percent');
    fireEvent.change(slider, { target: { value: '20' } });
    expect(useAppStore.getState().volume).toBe(0.2);
    expect(slider).toHaveAttribute('aria-valuetext', '20 percent');
  });

  it('shows only a note when Web Audio is not supported', () => {
    act(() => {
      useAppStore.setState({ soundSupported: false });
    });
    render(<SoundControls />);
    expect(screen.getByText("Sound isn't supported in this browser.")).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('slider')).not.toBeInTheDocument();
  });
});
