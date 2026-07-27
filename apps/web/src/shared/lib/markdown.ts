import DOMPurify from 'dompurify';
import { marked } from 'marked';

/**
 * Renders a member's post to HTML.
 *
 * Everything that reaches this function was typed by somebody on the internet,
 * so the output is sanitised without exception. Markdown is not a safe format:
 * it permits raw HTML by design, and `<img src=x onerror=alert(1)>` in a forum
 * post is a stored cross-site-scripting hole that fires for every reader.
 *
 * Two layers, because either alone has been bypassed before:
 *
 *   1. `marked` runs with raw HTML passthrough left on, then
 *   2. DOMPurify removes anything not on the allow-list below.
 *
 * The allow-list is deliberately short. A forum post needs emphasis, links,
 * lists, quotes and code; it does not need iframes, forms, styles or scripts,
 * and every tag left out is an attack surface that does not exist.
 */

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'del',
  'code',
  'pre',
  'blockquote',
  'ul',
  'ol',
  'li',
  'a',
  'h1',
  'h2',
  'h3',
  'h4',
  'hr',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'img',
  'mark',
];

const ALLOWED_ATTR = ['href', 'title', 'alt', 'src', 'rel', 'target', 'class'];

marked.setOptions({
  // A single newline becomes a <br>. Forum posts are written like chat
  // messages, not like documents, and requiring two blank lines to break a
  // line surprises everybody who is not a markdown author.
  breaks: true,
  gfm: true,
});

let hooksInstalled = false;

function installHooks(): void {
  if (hooksInstalled) {
    return;
  }

  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName === 'A') {
      const href = node.getAttribute('href') ?? '';

      // `javascript:` survives the tag allow-list because the anchor itself is
      // permitted; the scheme is what has to be checked.
      if (!/^(https?:|mailto:|#|\/)/i.test(href)) {
        node.removeAttribute('href');
        return;
      }

      // External links open in a new tab, and `noopener` is what stops the
      // opened page from reaching back through `window.opener` and navigating
      // this one somewhere else.
      if (/^https?:/i.test(href)) {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer nofollow');
      }
    }

    if (node.tagName === 'IMG') {
      // Below-the-fold images in a long thread are the single biggest cost on
      // a slow connection.
      node.setAttribute('loading', 'lazy');
      node.setAttribute('decoding', 'async');
    }
  });

  hooksInstalled = true;
}

export function renderMarkdown(source: string): string {
  installHooks();

  const html = marked.parse(source, { async: false });

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Anything with a URI attribute is checked against this. Data URIs are
    // excluded: `data:text/html` is a script in disguise.
    ALLOWED_URI_REGEXP: /^(?:https?|mailto):|^[#/]/i,
  });
}

/**
 * Plain-text preview for a listing or a search result.
 *
 * Strips the markup rather than rendering it, so a heading in the first line
 * of a post does not become a heading in a list of topics.
 */
export function toPlainText(source: string, maxLength = 200): string {
  const html = renderMarkdown(source);
  const text = DOMPurify.sanitize(html, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
    .replace(/\s+/g, ' ')
    .trim();

  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}
