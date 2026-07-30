import type { Plugin } from 'vite';

/**
 * The routes that exist at build time.
 *
 * Categories and topics are not here, and cannot be until the content lives in
 * Supabase and the build can query it. Listing a guessed URL would be worse
 * than listing none: a sitemap that points at pages which do not exist is a
 * signal search engines act on.
 *
 * `/search` and `/sign-in` are deliberately absent. Neither has content worth
 * indexing, and a crawlable search page invites an endless supply of
 * query-string URLs.
 */
const STATIC_ROUTES = ['', 'c'] as const;

export interface SitemapOptions {
  /** Origin without a trailing slash, e.g. `https://trinity-flux.github.io`. */
  siteUrl: string;
  /** The sub-path the app is served from, with both slashes. */
  basePath: string;
}

/**
 * Emits `sitemap.xml` next to the built app.
 *
 * Generated rather than committed so the URLs cannot drift from the base path:
 * both come from the same two values the build already resolved, so moving the
 * site to a custom domain rewrites the sitemap with it.
 *
 * No `robots.txt`. On a project page the app is served from a sub-path, and
 * crawlers only read `robots.txt` at the domain root — which belongs to a
 * different repository. Emitting one here would produce a file that looks
 * authoritative and is never fetched.
 */
export function sitemapPlugin({ siteUrl, basePath }: SitemapOptions): Plugin {
  return {
    name: 'trinity-nexus:sitemap',
    apply: 'build',
    generateBundle() {
      const origin = siteUrl.replace(/\/+$/, '');
      const lastModified = new Date().toISOString().slice(0, 10);

      const urls = STATIC_ROUTES.map(
        (route) =>
          `  <url>\n    <loc>${origin}${basePath}${route}</loc>\n    <lastmod>${lastModified}</lastmod>\n  </url>`,
      ).join('\n');

      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
      });
    },
  };
}
