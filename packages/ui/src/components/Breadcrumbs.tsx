import { ChevronRight } from 'lucide-react';
import { Children, type ReactNode } from 'react';

import { cn } from '../lib/cn';

export interface BreadcrumbsProps {
  /**
   * Required. Several pages carry more than one `<nav>`, and "navigation,
   * navigation, navigation" in a screen reader's landmark list tells nobody
   * which is which.
   */
  label: string;
  children: ReactNode;
  className?: string;
}

/**
 * The trail from the site root to the current page.
 *
 * A forum is three levels deep before anyone has posted anything — board,
 * category, topic — and the depth is invisible from a topic page: the only way
 * back was a link labelled with the category *slug*. Breadcrumbs give the
 * "where am I" and the "one level up" that the browser's back button cannot,
 * because arriving from a search result or a shared link means there is no
 * back.
 *
 * The list markup is built here rather than at the call site so that the
 * ordered-list structure, which is what a screen reader reads as "1 of 3",
 * cannot be got wrong by whoever adds the next page.
 */
export function Breadcrumbs({ label, children, className }: BreadcrumbsProps) {
  const crumbs = Children.toArray(children);

  return (
    <nav aria-label={label} className={className}>
      {/* Wraps rather than scrolls sideways: a horizontal scrollbar on a phone
          hides exactly the crumb the visitor is looking for. */}
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
        {crumbs.map((crumb, index) => (
          // The index is the identity here: a breadcrumb's position in the
          // trail is what it is, and the list is rebuilt whole on navigation.
          // biome-ignore lint/suspicious/noArrayIndexKey: position is the crumb's identity
          <li className="flex items-center gap-1.5" key={index}>
            {index > 0 ? (
              <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-fg-subtle" />
            ) : null}
            {crumb}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export interface BreadcrumbPageProps {
  children: ReactNode;
  className?: string;
}

/**
 * The last crumb: where the visitor is now.
 *
 * Not a link — a link to the page you are already on is a dead end that still
 * costs a tab stop. `aria-current="page"` is what tells assistive tech the
 * trail ends here.
 */
export function BreadcrumbPage({ children, className }: BreadcrumbPageProps) {
  return (
    <span
      aria-current="page"
      // Truncated because a topic title is written by a member and can be 160
      // characters long; untruncated it pushes the whole trail off the screen.
      className={cn('max-w-[16rem] truncate font-medium text-fg', className)}
    >
      {children}
    </span>
  );
}

/**
 * Styling for a crumb that links somewhere.
 *
 * Exported as a class list rather than a component because the router lives in
 * the application, not in the design system: the call site passes its own
 * `<Link>` and picks up the look from here.
 */
export const breadcrumbLinkClassName =
  'rounded-sm text-fg-muted transition-colors duration-150 hover:text-fg';
