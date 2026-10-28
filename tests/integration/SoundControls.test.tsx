import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlaybackBar } from '../../src/components/PlaybackBar';
import { SoundControls } from '../../src/components/SoundControls';
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
const queryButton = (name: string) => screen.queryByRole('button', { name });

describe('SoundPrompt (FR-026a)', () => {
  it('shows "Turn on sound" and "Not now" right after Start on a first visit', () => {
    render(<PlaybackBar />);
    setRun({ status: 'ready', total: 10 });
    const names = screen.getAllByRole('button').map((b) => b.textContent);
    const start = names.indexOf('Start');
    expect(names.slice(start, start + 3)).toEqual(['Start', 'Turn on sound', 'Not now']);
  });

  it('"Turn on sound" unmutes, enables audio, and hides the prompt', async () => {
    const enable = vi.spyOn(soundEngine, 'enable');
    render(<PlaybackBar />);
    await userEvent.click(button('Turn on sound'));
    expect(enable).toHaveBeenCalled();
    expect(useAppStore.getState().muted).toBe(false);
    expect(useAppStore.getState().soundPromptAnswered).toBe(true);
    expect(queryButton('Turn on sound')).not.toBeInTheDocument();
    expect(queryButton('Not now')).not.toBeInTheDocument();
  });

  it('"Not now" hides the prompt and stays muted', async () => {
    const enable = vi.spyOn(soundEngine, 'enable');
    render(<PlaybackBar />);
    await userEvent.click(button('Not now'));
    expect(enable).not.toHaveBeenCalled();
    expect(useAppStore.getState().muted).toBe(true);
    expect(queryButton('Turn on sound')).not.toBeInTheDocument();
  });

  it('does not render again once answered', () => {
    act(() => {
      useAppStore.setState({ soundPromptAnswered: true });
    });
    render(<PlaybackBar />);
    expect(queryButton('Turn on sound')).not.toBeInTheDocument();
  });

  it('is not shown without Web Audio support', () => {
    act(() => {
      useAppStore.setState({ soundSupported: false });
    });
    render(<PlaybackBar />);
    expect(queryButton('Turn on sound')).not.toBeInTheDocument();
  });
});

describe('SoundControls (FR-025)', () => {
  it('shows "Unmute" pressed while muted and "Mute" not pressed while unmuted', async () => {
    render(<SoundControls />);
    expect(button('Unmute')).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(button('Unmute'));
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
