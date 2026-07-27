import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './Button';

describe('Button', () => {
  it('defaults to type="button" so it cannot submit a form by accident', () => {
    render(<Button>Cancel</Button>);

    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveAttribute('type', 'button');
  });

  it('respects an explicit type', () => {
    render(<Button type="submit">Post</Button>);

    expect(screen.getByRole('button', { name: 'Post' })).toHaveAttribute('type', 'submit');
  });

  it('blocks interaction and announces itself as busy while loading', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Post
      </Button>,
    );

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');

    await userEvent.click(button, { pointerEventsCheck: 0 });
    expect(onClick).not.toHaveBeenCalled();
  });

  it('gives screen readers a reason for the wait', () => {
    render(<Button loading loadingLabel="Posting reply" />);

    expect(screen.getByText('Posting reply')).toBeInTheDocument();
  });

  it('renders as the child element with asChild, keeping link behaviour', () => {
    render(
      <Button asChild>
        <a href="/rules">Rules</a>
      </Button>,
    );

    const link = screen.getByRole('link', { name: 'Rules' });
    expect(link).toHaveAttribute('href', '/rules');
    // A real anchor keeps middle-click, right-click and "copy link address";
    // a button styled like a link keeps none of them.
    expect(link).not.toHaveAttribute('type');
  });

  it('lets a className prop override a variant default', () => {
    render(<Button className="bg-accent">Highlight</Button>);

    const classes = screen.getByRole('button').className.split(' ');

    // Compared token by token: `hover:bg-primary/90` legitimately survives,
    // because tailwind-merge only drops the utility that actually conflicts.
    expect(classes).toContain('bg-accent');
    expect(classes).not.toContain('bg-primary');
  });

  it('calls onClick when enabled', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Reply</Button>);

    await userEvent.click(screen.getByRole('button'));

    expect(onClick).toHaveBeenCalledOnce();
  });
});
