import { lazy, Suspense } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router';

import { env } from '@/shared/config/env';

import { AppLayout } from './layout/AppLayout';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RouteFallback } from './RouteFallback';

/**
 * Forum routes are split out of the initial bundle.
 *
 * The landing page is what a first-time visitor sees and what a search engine
 * indexes, so it ships eagerly; the rest arrives when someone actually
 * navigates. `<Link>` prefetching on hover means that usually happens before
 * the click lands.
 *
 * Imported from each feature's `pages` entry rather than its `index`, because
 * the store imports `index` eagerly: sharing one barrel put every page in the
 * initial bundle and made these `lazy()` calls do nothing.
 */
const CategoriesPage = lazy(async () => ({
  default: (await import('@/features/forum/pages')).CategoriesPage,
}));
const CategoryPage = lazy(async () => ({
  default: (await import('@/features/forum/pages')).CategoryPage,
}));
const TopicPage = lazy(async () => ({
  default: (await import('@/features/forum/pages')).TopicPage,
}));
const NewTopicPage = lazy(async () => ({
  default: (await import('@/features/forum/pages')).NewTopicPage,
}));
const SearchPage = lazy(async () => ({
  default: (await import('@/features/forum/pages')).SearchPage,
}));
const SignInPage = lazy(async () => ({
  default: (await import('@/features/auth/pages')).SignInPage,
}));

function lazyRoute(element: React.ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
}

const routes: RouteObject[] = [
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'c', element: lazyRoute(<CategoriesPage />) },
      { path: 'c/:categorySlug', element: lazyRoute(<CategoryPage />) },
      // Before the :topicSlug route, or "new" would be read as a topic slug.
      { path: 'c/:categorySlug/new', element: lazyRoute(<NewTopicPage />) },
      { path: 'c/:categorySlug/:topicSlug', element: lazyRoute(<TopicPage />) },
      { path: 'search', element: lazyRoute(<SearchPage />) },
      { path: 'sign-in', element: lazyRoute(<SignInPage />) },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export function createAppRouter() {
  // GitHub Pages serves this repository under a sub-path, so every route the
  // router knows about is relative to it. `basename` comes from the value Vite
  // resolved at build time, which is why the two can never disagree.
  return createBrowserRouter(routes, { basename: env.basePath });
}
