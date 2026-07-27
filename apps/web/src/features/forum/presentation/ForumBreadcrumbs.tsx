import { BreadcrumbPage, Breadcrumbs, breadcrumbLinkClassName } from '@trinity-nexus/ui';
import { Link } from 'react-router';

import { useI18n } from '@/shared/i18n/useI18n';

export interface ForumBreadcrumbsProps {
  /** Omitted on the category index, which is itself the second crumb. */
  category?: { slug: string; name: string } | undefined;
  /**
   * The page the visitor is on. When absent the last linked crumb is the
   * current page and is rendered as such.
   */
  current?: string | undefined;
}

/**
 * The trail for every page under `/c`.
 *
 * Built once here rather than per page so the hierarchy is stated in a single
 * place: if a game level is inserted above categories later, this is the only
 * file that changes.
 */
export function ForumBreadcrumbs({ category, current }: ForumBreadcrumbsProps) {
  const { t } = useI18n();

  const crumbs = [
    { label: t('nav.home'), to: '/' },
    { label: t('nav.categories'), to: '/c' },
  ];

  if (category) {
    crumbs.push({ label: category.name, to: `/c/${category.slug}` });
  }

  // Without an explicit current page, the deepest crumb *is* the current page,
  // so it loses its link rather than pointing at the page it is on.
  const trailing = current ?? crumbs.pop()?.label ?? '';

  return (
    <Breadcrumbs label={t('nav.breadcrumb')}>
      {crumbs.map((crumb) => (
        <Link className={breadcrumbLinkClassName} key={crumb.to} to={crumb.to}>
          {crumb.label}
        </Link>
      ))}
      <BreadcrumbPage>{trailing}</BreadcrumbPage>
    </Breadcrumbs>
  );
}
