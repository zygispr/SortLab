import { render, screen, within } from '@testing-library/react';
import { SortLabPage } from '../../src/components/pages/SortLabPage';
import { player, useAppStore } from '../../src/store/appStore';
import { resetStore, setRun, spyOn } from './storeHelpers';

beforeEach(resetStore);

describe('SortLabPage shell', () => {
  it('shows the app name as the page heading', () => {
    render(<SortLabPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'SortLab' })).toBeInTheDocument();
  });

  it('has every region from the UI contract, labelled, in order', () => {
    render(<SortLabPage />);
    const names = screen.getAllByRole('region').map((r) => r.getAttribute('aria-labelledby'));
    const labels = names.map((id) => (id ? document.getElementById(id)?.textContent : null));
    expect(labels).toEqual([
      'Data',
      'Algorithm',
      'Visualization',
      'Playback',
      'Sound',
      'Run summary',
    ]);
  });

  it('includes the live region for announcements', () => {
    render(<SortLabPage />);
    const main = screen.getByRole('main');
    expect(within(main).getByRole('status')).toBeInTheDocument();
  });

  it('places the User Story 1 controls in their regions', () => {
    render(<SortLabPage />);
    const region = (name: string) => screen.getByRole('region', { name });
    expect(within(region('Data')).getByRole('button', { name: 'Generate' })).toBeInTheDocument();
    expect(within(region('Algorithm')).getByRole('combobox', { name: 'Algorithm' })).toBeVisible();
    expect(within(region('Visualization')).getByRole('img')).toBeInTheDocument();
    expect(within(region('Visualization')).getByRole('list', { name: 'Legend' })).toBeVisible();
    expect(within(region('Visualization')).getByRole('list', { name: 'Counters' })).toBeVisible();
    expect(within(region('Playback')).getByRole('slider', { name: 'Speed' })).toBeVisible();
  });
});

describe('SortLabPage behaviour', () => {
  function hidePage(hidden: boolean) {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
    document.dispatchEvent(new Event('visibilitychange'));
  }

  afterEach(() => {
    hidePage(false);
  });

  it('pauses a running sort and announces it when the page is hidden (FR-015)', () => {
    const { pause } = spyOn('pause');
    render(<SortLabPage />);
    setRun({ status: 'running', total: 10 });
    hidePage(true);
    expect(pause).toHaveBeenCalledOnce();
    expect(useAppStore.getState().announcement?.text).toBe('Paused.');
  });

  it('leaves a sort that is not running alone when the page is hidden', () => {
    const { pause } = spyOn('pause');
    render(<SortLabPage />);
    setRun({ status: 'paused', total: 10 });
    hidePage(true);
    expect(pause).not.toHaveBeenCalled();
  });

  it('passes the reduced-motion preference to the player', () => {
    const setReducedMotion = vi.spyOn(player, 'setReducedMotion');
    const matchMedia = vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
        }) as Partial<MediaQueryList> as MediaQueryList,
    );
    try {
      render(<SortLabPage />);
      expect(setReducedMotion).toHaveBeenLastCalledWith(true);
    } finally {
      matchMedia.mockRestore();
      setReducedMotion.mockRestore();
    }
  });
});
