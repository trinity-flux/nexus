import { describe, expect, it } from 'vitest';

import { renderMarkdown, toPlainText } from './markdown';

describe('renderMarkdown', () => {
  it('renders emphasis and strong', () => {
    expect(renderMarkdown('**bold** and *italic*')).toContain('<strong>bold</strong>');
  });

  it('renders lists', () => {
    const html = renderMarkdown('- one\n- two');

    expect(html).toContain('<ul>');
    expect(html).toContain('<li>one</li>');
  });

  it('renders fenced code without executing it', () => {
    const html = renderMarkdown('```\nconst x = 1;\n```');

    expect(html).toContain('<pre>');
    expect(html).toContain('const x = 1;');
  });

  it('treats a single newline as a line break', () => {
    // Forum posts are written like messages, not documents. Requiring a blank
    // line to break a line surprises everyone who is not a markdown author.
    expect(renderMarkdown('one\ntwo')).toContain('<br>');
  });
});

describe('renderMarkdown — sanitisation', () => {
  it('strips script tags', () => {
    const html = renderMarkdown('Hello <script>alert(1)</script>');

    expect(html).not.toContain('<script');
    expect(html).not.toContain('alert(1)');
  });

  it('strips inline event handlers', () => {
    // The classic stored XSS in a forum: it fires for every reader of the
    // thread, not just its author.
    const html = renderMarkdown('<img src=x onerror="alert(1)">');

    expect(html).not.toContain('onerror');
  });

  it('drops a javascript: link but keeps the text', () => {
    const html = renderMarkdown('[click me](javascript:alert(1))');

    expect(html).not.toContain('javascript:');
    expect(html).toContain('click me');
  });

  it('drops a data: URI, which is a script in disguise', () => {
    const html = renderMarkdown('[x](data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==)');

    expect(html).not.toContain('data:text/html');
  });

  it('strips iframes', () => {
    const html = renderMarkdown('<iframe src="https://example.com"></iframe>');

    expect(html).not.toContain('<iframe');
  });

  it('strips style attributes, which can cover the page', () => {
    const html = renderMarkdown('<p style="position:fixed;inset:0">gotcha</p>');

    expect(html).not.toContain('style=');
  });

  it('strips form elements', () => {
    const html = renderMarkdown('<form action="https://evil.test"><input name="password"></form>');

    expect(html).not.toContain('<form');
    expect(html).not.toContain('<input');
  });

  it('keeps ordinary links and marks them safe to open', () => {
    const html = renderMarkdown('[docs](https://example.com)');

    expect(html).toContain('href="https://example.com"');
    // Without noopener the opened page can navigate this one via window.opener.
    expect(html).toContain('noopener');
    expect(html).toContain('noreferrer');
  });

  it('leaves relative and anchor links alone', () => {
    expect(renderMarkdown('[rules](/rules)')).toContain('href="/rules"');
    expect(renderMarkdown('[top](#top)')).toContain('href="#top"');
  });

  it('lazy-loads images so a long thread is not a cliff on mobile', () => {
    const html = renderMarkdown('![a screenshot](https://example.com/a.png)');

    expect(html).toContain('loading="lazy"');
  });
});

describe('toPlainText', () => {
  it('strips markup for a listing preview', () => {
    expect(toPlainText('# Heading\n\nSome **text**.')).toBe('Heading Some text.');
  });

  it('truncates with an ellipsis', () => {
    const long = 'word '.repeat(100);

    const preview = toPlainText(long, 20);

    expect(preview).toHaveLength(20);
    expect(preview.endsWith('…')).toBe(true);
  });

  it('leaves short text untouched', () => {
    expect(toPlainText('Short.', 50)).toBe('Short.');
  });

  it('does not leak script content into a preview', () => {
    expect(toPlainText('<script>alert(1)</script>Visible')).not.toContain('alert');
  });
});
