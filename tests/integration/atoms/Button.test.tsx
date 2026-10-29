import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../../../src/components/atoms/Button';

/** The button atom, rendered from props alone (feature 002, FR-007, FR-016). */

describe('Button', () => {
  it('renders one type="button" button named by its children', () => {
    render(<Button>Step forward</Button>);
    const button = screen.getByRole('button', { name: 'Step forward' });
    expect(button).toHaveAttribute('type', 'button');
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('reports clicks, but not while disabled', async () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>Reset</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <Button onClick={onClick} disabled>
        Reset
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Reset' });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('passes native props such as aria-pressed through', () => {
    render(
      <Button aria-pressed title="Toggle sound">
        Unmute
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Unmute' });
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveAttribute('title', 'Toggle sound');
  });

  it('gives each variant its own class, secondary by default', () => {
    render(
      <>
        <Button variant="primary">Primary</Button>
        <Button>Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="quiet">Quiet</Button>
      </>,
    );
    const classOf = (name: string) => screen.getByRole('button', { name }).className;
    expect(classOf('Default')).toBe(classOf('Secondary'));
    expect(new Set([classOf('Primary'), classOf('Secondary'), classOf('Quiet')]).size).toBe(3);
  });

  it('appends a passed className to its own', () => {
    render(<Button className="extra">Start</Button>);
    const button = screen.getByRole('button', { name: 'Start' });
    expect(button).toHaveClass('extra');
    expect(button.classList.length).toBeGreaterThan(1);
  });
});
