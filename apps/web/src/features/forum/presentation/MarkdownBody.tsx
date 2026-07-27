import { useMemo } from 'react';

import { renderMarkdown } from '@/shared/lib/markdown';

export interface MarkdownBodyProps {
  source: string;
  className?: string;
  id?: string;
}

/**
 * Renders a member's post.
 *
 * `dangerouslySetInnerHTML` is unavoidable for rendering markdown, and it is
 * confined to this one component so there is exactly one place to audit. What
 * makes it safe is `renderMarkdown`, which sanitises against an allow-list —
 * see the tests in `shared/lib/markdown.test.ts`, which cover script tags,
 * event handlers, `javascript:` and `data:` URIs, iframes and forms.
 *
 * Memoised because sanitising is not free and a thread re-renders on every
 * realtime event.
 */
export function MarkdownBody({ source, className, id }: MarkdownBodyProps) {
  const html = useMemo(() => renderMarkdown(source), [source]);

  return (
    <div
      className={className}
      id={id}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: rendering markdown requires it; the input is sanitised against an allow-list by renderMarkdown, and this is the only place in the codebase where it happens.
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
