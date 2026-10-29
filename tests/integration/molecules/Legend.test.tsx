import { render, screen, within } from '@testing-library/react';
import { Legend } from '../../../src/components/molecules/Legend';

/** The bar-state legend molecule (feature 002, FR-016; feature 001, FR-018). */

describe('Legend', () => {
  it('lists the four bar states with their markers', () => {
    render(<Legend />);
    const items = within(screen.getByRole('list', { name: 'Legend' })).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      'Unsorted',
      '▲Comparing',
      '●Moving',
      '▬Sorted',
    ]);
  });

  it('hides every swatch and marker from assistive technology', () => {
    const { container } = render(<Legend />);
    const decorations = container.querySelectorAll('li > span');
    expect(decorations).toHaveLength(7);
    for (const decoration of decorations) expect(decoration).toHaveAttribute('aria-hidden', 'true');
  });
});
