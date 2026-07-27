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
 */
const CategoriesPage = lazy(async () => ({
  default: (await import('@/features/forum')).CategoriesPage,
}));
const CategoryPage = lazy(async () => ({
  default: (await import('@/features/forum')).CategoryPage,
}));
const TopicPage = lazy(async () => ({
  default: (await import('@/features/forum')).TopicPage,
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
      { path: 'c/:categorySlug/:topicSlug', element: lazyRoute(<TopicPage />) },
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
