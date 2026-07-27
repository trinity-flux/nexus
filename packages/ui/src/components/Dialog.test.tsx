import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Button } from './Button';
import { Dialog, DialogContent, DialogTrigger } from './Dialog';

function TestDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Delete thread</Button>
      </DialogTrigger>
      <DialogContent
        description="This cannot be undone."
        footer={<Button variant="danger">Delete</Button>}
        title="Delete this thread?"
      >
        <p>Replies will be kept but hidden.</p>
      </DialogContent>
    </Dialog>
  );
}

describe('Dialog', () => {
  it('stays closed until the trigger is used', () => {
    render(<TestDialog />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('takes its accessible name from the title', async () => {
    render(<TestDialog />);

    await userEvent.click(screen.getByRole('button', { name: 'Delete thread' }));

    expect(screen.getByRole('dialog', { name: 'Delete this thread?' })).toBeInTheDocument();
  });

  it('is described by its description', async () => {
    render(<TestDialog />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete thread' }));

    expect(screen.getByRole('dialog')).toHaveAccessibleDescription('This cannot be undone.');
  });

  it('closes on Escape', async () => {
    render(<TestDialog />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete thread' }));

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('returns focus to the trigger on close, so the keyboard user does not lose their place', async () => {
    render(<TestDialog />);
    const trigger = screen.getByRole('button', { name: 'Delete thread' });

    await userEvent.click(trigger);
    await userEvent.keyboard('{Escape}');

    expect(trigger).toHaveFocus();
  });

  it('gives the close button a name even though it is only an icon', async () => {
    render(<TestDialog />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete thread' }));

    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });
});
