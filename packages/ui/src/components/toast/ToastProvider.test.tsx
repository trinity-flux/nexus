import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ToastProvider } from './ToastProvider';
import { useToast } from './useToast';

function ToastTrigger({ onAction }: { onAction?: () => void }) {
  const { toast } = useToast();

  return (
    <>
      <button
        onClick={() => {
          toast({ title: 'Reply posted' });
        }}
        type="button"
      >
        Post
      </button>
      <button
        onClick={() => {
          toast({
            title: 'Could not post',
            description: 'Check your connection.',
            variant: 'danger',
            ...(onAction ? { action: { label: 'Retry', onClick: onAction } } : {}),
          });
        }}
        type="button"
      >
        Fail
      </button>
    </>
  );
}

function renderWithToasts(props: { onAction?: () => void } = {}) {
  return render(
    <ToastProvider>
      <ToastTrigger {...props} />
    </ToastProvider>,
  );
}

describe('ToastProvider', () => {
  it('shows nothing until something is announced', () => {
    renderWithToasts();

    expect(screen.queryByText('Reply posted')).not.toBeInTheDocument();
  });

  it('announces a toast without moving focus away from what the user was doing', async () => {
    renderWithToasts();
    const trigger = screen.getByRole('button', { name: 'Post' });

    await userEvent.click(trigger);

    expect(screen.getByText('Reply posted')).toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('renders the description alongside the title', async () => {
    renderWithToasts();

    await userEvent.click(screen.getByRole('button', { name: 'Fail' }));

    expect(screen.getByText('Check your connection.')).toBeInTheDocument();
  });

  it('dismisses on the close button', async () => {
    renderWithToasts();
    await userEvent.click(screen.getByRole('button', { name: 'Post' }));

    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(screen.queryByText('Reply posted')).not.toBeInTheDocument();
  });

  it('runs the action a toast offers', async () => {
    const onAction = vi.fn();
    renderWithToasts({ onAction });
    await userEvent.click(screen.getByRole('button', { name: 'Fail' }));

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(onAction).toHaveBeenCalledOnce();
  });

  it('stacks several toasts rather than replacing the previous one', async () => {
    renderWithToasts();

    await userEvent.click(screen.getByRole('button', { name: 'Post' }));
    await userEvent.click(screen.getByRole('button', { name: 'Fail' }));

    expect(screen.getByText('Reply posted')).toBeInTheDocument();
    expect(screen.getByText('Could not post')).toBeInTheDocument();
  });
});

describe('useToast', () => {
  it('fails loudly outside a provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<ToastTrigger />)).toThrow(/ToastProvider/);

    consoleError.mockRestore();
  });
});
