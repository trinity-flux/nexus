import { Skeleton } from '@trinity-nexus/ui';

/**
 * Shown while a lazily loaded route chunk arrives.
 *
 * Generic on purpose — it does not know which page is coming — but it still
 * reserves height rather than collapsing the layout, so the header and footer
 * do not jump while a chunk downloads on a slow connection.
 */
export function RouteFallback() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
