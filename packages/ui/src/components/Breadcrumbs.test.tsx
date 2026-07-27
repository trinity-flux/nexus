import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BreadcrumbPage, Breadcrumbs } from './Breadcrumbs';

function TestTrail() {
  return (
    <Breadcrumbs label="Breadcrumb">
      <a href="/">Home</a>
      <a href="/c">Categories</a>
      <BreadcrumbPage>Raid night rules</BreadcrumbPage>
    </Breadcrumbs>
  );
}

describe('Breadcrumbs', () => {
  it('is a named navigation landmark, so it is distinguishable from the main menu', () => {
    render(<TestTrail />);

    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
  });

  it('presents the trail as an ordered list, which is what conveys the depth', () => {
    render(<TestTrail />);

    const list = within(screen.getByRole('navigation')).getByRole('list');

    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
  });

  it('marks the last crumb as the current page', () => {
    render(<TestTrail />);

    expect(screen.getByText('Raid night rules')).toHaveAttribute('aria-current', 'page');
  });

  it('does not link the current page', () => {
    render(<TestTrail />);

    // Two links for three crumbs: a link to the page you are already on is a
    // dead end that still costs a tab stop.
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });

  it('renders a single crumb without a leading separator', () => {
    const { container } = render(
      <Breadcrumbs label="Breadcrumb">
        <BreadcrumbPage>Categories</BreadcrumbPage>
      </Breadcrumbs>,
    );

    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(1);
    expect(container.querySelector('svg')).toBeNull();
  });
});
