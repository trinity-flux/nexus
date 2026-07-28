import { Fragment } from 'react';

import { splitByRanges, type TextRange } from '../domain/highlight';

export interface HighlightedTextProps {
  text: string;
  matches: readonly TextRange[];
}

/**
 * Text with the query terms marked.
 *
 * The marks are real elements built around offsets, not a string of HTML
 * pushed through `dangerouslySetInnerHTML`. The text is a topic title written
 * by a member, so the difference is whether highlighting a search result is a
 * rendering concern or an injection surface. React escapes every segment, and
 * there is no path by which a title could contribute markup.
 *
 * `<mark>` rather than a styled `<span>`: it carries the meaning "relevant to
 * the current context", which is exactly what a search hit is, and some screen
 * readers announce it.
 */
export function HighlightedText({ text, matches }: HighlightedTextProps) {
  const segments = splitByRanges(text, matches);

  return (
    <>
      {segments.map((segment, index) =>
        segment.isMatch ? (
          // The index is the identity: segments are positional slices of one
          // string, and the whole list is rebuilt whenever the string or the
          // ranges change.
          // biome-ignore lint/suspicious/noArrayIndexKey: a segment's position is what it is
          <mark className="rounded-sm bg-accent px-0.5 text-accent-fg" key={index}>
            {segment.text}
          </mark>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: a segment's position is what it is
          <Fragment key={index}>{segment.text}</Fragment>
        ),
      )}
    </>
  );
}
