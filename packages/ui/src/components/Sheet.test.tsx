import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Button } from './Button';
import { Sheet, SheetContent, SheetTrigger } from './Sheet';

function TestSheet({ srOnlyTitle = false }: { srOnlyTitle?: boolean }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button>Open menu</Button>
      </SheetTrigger>
      <SheetContent
        closeLabel="Close menu"
        description="The community for our realm"
        srOnlyTitle={srOnlyTitle}
        title="Trinity Nexus"
      >
        <a href="/c">Categories</a>
      </SheetContent>
    </Sheet>
  );
}

describe('Sheet', () => {
  it('stays closed until the trigger is used', () => {
    render(<TestSheet />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('is a dialog, not a panel, so focus is trapped inside it', async () => {
    render(<TestSheet />);

    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }));

    expect(screen.getByRole('dialog', { name: 'Trinity Nexus' })).toBeInTheDocument();
  });

  it('keeps its accessible name when the title is hidden visually', async () => {
    render(<TestSheet srOnlyTitle />);

    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }));

    expect(screen.getByRole('dialog', { name: 'Trinity Nexus' })).toBeInTheDocument();
  });

  it('closes on Escape', async () => {
    render(<TestSheet />);
    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }));

    await userEvent.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('returns focus to the trigger on close', async () => {
    render(<TestSheet />);
    const trigger = screen.getByRole('button', { name: 'Open menu' });

    await userEvent.click(trigger);
    await userEvent.keyboard('{Escape}');

    expect(trigger).toHaveFocus();
  });

  it('names the icon-only close button', async () => {
    render(<TestSheet />);
    await userEvent.click(screen.getByRole('button', { name: 'Open menu' }));

    expect(screen.getByRole('button', { name: 'Close menu' })).toBeInTheDocument();
  });
});
