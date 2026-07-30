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
 * Emits `sitemap.xml`, and `robots.txt` when the site owns the domain root.
 *
 * Generated rather than committed so the URLs cannot drift from the base path:
 * both come from the same two values the build already resolved, so moving the
 * site to a custom domain rewrites them with it.
 *
 * `robots.txt` is conditional because crawlers only ever fetch it from the
 * domain root. Served from a sub-path it is never read, and a file that looks
 * authoritative and is silently ignored is worse than no file — someone will
 * eventually add a rule to it and believe it took effect.
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

      if (basePath === '/') {
        this.emitFile({
          type: 'asset',
          fileName: 'robots.txt',
          // Deliberately narrow. This host also serves other repositories'
          // project pages, and a blanket rule here would apply to them too;
          // only the two paths that belong to this app are named.
          //
          // `/search` is excluded because a crawlable search page is an
          // endless supply of query-string URLs that index nothing.
          source: [
            'User-agent: *',
            'Disallow: /search',
            'Disallow: /sign-in',
            '',
            `Sitemap: ${origin}/sitemap.xml`,
            '',
          ].join('\n'),
        });
      }
    },
  };
}
