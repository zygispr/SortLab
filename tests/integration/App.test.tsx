import { render, screen, within } from '@testing-library/react';
import { App } from '../../src/App';

describe('App shell', () => {
  it('shows the app name as the page heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'SortLab' })).toBeInTheDocument();
  });

  it('has every region from the UI contract, labelled, in order', () => {
    render(<App />);
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
    render(<App />);
    const main = screen.getByRole('main');
    expect(within(main).getByRole('status')).toBeInTheDocument();
  });
});
