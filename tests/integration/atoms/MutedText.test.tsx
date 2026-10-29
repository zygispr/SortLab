import { render, screen } from '@testing-library/react';
import { MutedText } from '../../../src/components/atoms/MutedText';

/** The muted helper text atom (feature 002, FR-010, FR-016). */

describe('MutedText', () => {
  it('renders a paragraph by default', () => {
    render(<MutedText>No runs yet.</MutedText>);
    expect(screen.getByText('No runs yet.').tagName).toBe('P');
  });

  it('renders a span with as="span"', () => {
    render(<MutedText as="span">Preparing…</MutedText>);
    expect(screen.getByText('Preparing…').tagName).toBe('SPAN');
  });
});
