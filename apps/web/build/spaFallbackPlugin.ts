import { copyFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Plugin } from 'vite';

/**
 * Copies the built `index.html` to `404.html`.
 *
 * GitHub Pages has no server and no rewrite rules, so a request for
 * `/c/general/some-topic` finds no file and gets the 404 page. Making that page
 * the application means the router receives the URL and renders the topic —
 * which is what turns every deep link into something that survives a reload, a
 * bookmark or a paste into Discord.
 *
 * Copied after the build rather than kept as a second entry point, because the
 * two files must reference the same hashed asset names. A hand-maintained copy
 * goes stale on the first release and the failure is invisible until someone
 * reloads a thread.
 *
 * The status code is still 404. That is a real cost for SEO on deep routes and
 * the reason prerendering is on the list; it does not affect a visitor, whose
 * browser renders the page regardless.
 */
export function spaFallbackPlugin(): Plugin {
  return {
    name: 'trinity-nexus:spa-fallback',
    apply: 'build',
    async closeBundle() {
      const outDir = join(process.cwd(), 'dist');
      await copyFile(join(outDir, 'index.html'), join(outDir, '404.html'));
      console.log('  404.html  copied from index.html for SPA deep links');
    },
  };
}
