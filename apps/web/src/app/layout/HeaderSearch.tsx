import { Input } from '@trinity-nexus/ui';
import { Search } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { useNavigate } from 'react-router';

import { useI18n } from '@/shared/i18n/useI18n';

const SEARCH_INPUT_ID = 'header-search';

/**
 * The search box in the bar.
 *
 * A form that navigates on submit, rather than a field that searches as you
 * type. The header is present on every page, and searching from it while
 * someone reads a thread would replace what they are reading with results they
 * have not asked for yet. The search page itself is the one that searches per
 * keystroke, because there the results are the page.
 *
 * Submitting is what carries the query, so Enter works and so does the
 * magnifying glass on a phone keyboard — both of which are what people
 * actually press.
 */
export function HeaderSearch() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = query.trim();
    if (trimmed.length === 0) {
      return;
    }

    void navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    // Cleared because the query now lives in the URL and on the page. Leaving
    // it here would show two search boxes disagreeing as soon as the one on
    // the page is edited.
    setQuery('');
  }

  return (
    // `<search>` rather than `role="search"` on the form: it is the element
    // the role was standardised from, and it makes the search box a landmark a
    // screen-reader user can jump to instead of walking the whole header.
    <search>
      <form className="relative" onSubmit={handleSubmit}>
        {/* The association is spelled out with htmlFor/id rather than by nesting
          the input inside the label: a linter cannot see through a component
          boundary, and neither can some older screen readers. */}
        <label className="sr-only" htmlFor={SEARCH_INPUT_ID}>
          {t('nav.search')}
        </label>
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle"
        />
        <Input
          className="w-56 pl-9"
          id={SEARCH_INPUT_ID}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
          placeholder={t('nav.searchPlaceholder')}
          type="search"
          value={query}
        />
      </form>
    </search>
  );
}
