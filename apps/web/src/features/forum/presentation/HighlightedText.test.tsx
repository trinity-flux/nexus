import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { findMatchRanges } from '../domain/highlight';
import { HighlightedText } from './HighlightedText';

describe('HighlightedText', () => {
  it('marks the matching run and leaves the rest alone', () => {
    const text = 'How do I get to Northrend at level 68?';

    render(<HighlightedText matches={findMatchRanges(text, ['northrend'])} text={text} />);

    const marks = screen.getAllByText('Northrend');
    expect(marks).toHaveLength(1);
    expect(marks[0]?.tagName).toBe('MARK');
  });

  it('preserves the original casing inside the mark', () => {
    // The query was lower case; the title was not. Echoing the query back
    // instead of the title would quietly rewrite what someone wrote.
    const text = 'Getting to Northrend';

    render(<HighlightedText matches={findMatchRanges(text, ['northrend'])} text={text} />);

    expect(screen.getByText('Northrend')).toBeInTheDocument();
  });

  it('renders the whole string when nothing matched', () => {
    render(<HighlightedText matches={[]} text="Nothing to see" />);

    expect(screen.getByText('Nothing to see')).toBeInTheDocument();
  });

  it('renders a hostile title as text, not as markup', () => {
    // Topic titles are written by strangers. This is the assertion that says
    // highlighting is a rendering concern and not an injection surface: the
    // tags are visible characters, and no element was created from them.
    const text = '<img src=x onerror="alert(1)"> and <script>alert(2)</script>';

    const { container } = render(
      <HighlightedText matches={findMatchRanges(text, ['img'])} text={text} />,
    );

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toBe(text);
  });

  it('does not let a term used as a mark boundary split the text', () => {
    const text = 'boat, boat, boat';

    const { container } = render(
      <HighlightedText matches={findMatchRanges(text, ['boat'])} text={text} />,
    );

    // Three marks, and reassembling every segment gives back exactly the
    // original: highlighting must never add, drop or reorder a character.
    expect(container.querySelectorAll('mark')).toHaveLength(3);
    expect(container.textContent).toBe(text);
  });
});
