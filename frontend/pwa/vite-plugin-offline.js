import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * Source modules whose route must open with no network.
 *
 * Anything listed here has its build chunk — and everything that chunk
 * statically imports — written into the service worker's precache list. The
 * rest of the app (admin, vendor, the long tail of user screens) is left out on
 * purpose: precaching it would cost the user megabytes they may never open.
 *
 * Paths are matched as suffixes of the module id, so they stay valid whatever
 * the absolute project path is.
 */
const OFFLINE_MODULES = [
  // Entry point: "/" redirects here, and a logged-in Splash bounces straight to
  // /app/home. Without it, opening the app offline at the root URL is a blank screen.
  'src/modules/user/features/auth/Splash.jsx',
  // Shell for the five bottom-nav routes
  'src/modules/user/layouts/MainLayout.jsx',
  // Bottom nav
  'src/modules/user/features/home/Home.jsx',
  'src/modules/user/features/matches/Matches.jsx',
  'src/modules/user/features/community/Community.jsx',
  'src/modules/user/features/shop/Shop.jsx',
  'src/modules/user/features/profile/Profile.jsx',
  // Key sub-pages
  'src/modules/user/features/notifications/Notifications.jsx',
  'src/modules/user/features/wallet/Wallet.jsx',
  'src/modules/user/features/shop/Cart.jsx',
  'src/modules/user/features/profile/screens/MyOrders.jsx',
  'src/modules/user/features/profile/screens/BookingHistory.jsx',
];

/** Files from public/ that the shell needs before the first chunk paints. */
const PUBLIC_PRECACHE = [
  'manifest.webmanifest',
  'logo/favicon.svg',
  'logo/logo.svg',
  'logo/icons.svg',
  'logo/pwa-192.png',
  'logo/apple-touch-icon.png',
];

const normalize = (id) => id.replace(/\\/g, '/');

/**
 * Emits a service worker whose precache list is derived from the real bundle,
 * so hashed filenames never drift out of sync with what is deployed.
 */
export function offlinePWA({ modules = OFFLINE_MODULES, publicFiles = PUBLIC_PRECACHE } = {}) {
  let base = '/';
  let apiBase = '';
  let outDir = 'dist';
  let precacheUrls = [];

  return {
    name: 'tailcircle-offline-pwa',
    apply: 'build',

    configResolved(config) {
      base = config.base || '/';
      // Baked in at build time so the worker knows which origin is the API.
      apiBase = config.env?.VITE_API_URL || process.env.VITE_API_URL || '';
      outDir = resolve(config.root, config.build.outDir);
    },

    generateBundle(_options, bundle) {
      const chunks = Object.values(bundle).filter((c) => c.type === 'chunk');
      const byFileName = new Map(chunks.map((c) => [c.fileName, c]));

      const wanted = new Set();
      const missing = new Set(modules);

      for (const chunk of chunks) {
        if (chunk.isEntry) {
          wanted.add(chunk.fileName);
          continue;
        }
        const ids = (chunk.moduleIds || []).map(normalize);
        for (const target of modules) {
          if (ids.some((id) => id.endsWith(target))) {
            wanted.add(chunk.fileName);
            missing.delete(target);
          }
        }
      }

      if (missing.size) {
        this.warn(
          `offline precache: no chunk found for ${[...missing].join(', ')} — ` +
            'those routes will not work offline. Did the file move?',
        );
      }

      // Follow static imports; dynamic ones are the routes we deliberately skip.
      const reachable = new Set();
      const walk = (fileName) => {
        if (reachable.has(fileName)) return;
        reachable.add(fileName);
        const chunk = byFileName.get(fileName);
        if (!chunk) return;
        for (const imported of chunk.imports || []) walk(imported);
      };
      wanted.forEach(walk);

      const css = new Set();
      for (const fileName of reachable) {
        const chunk = byFileName.get(fileName);
        for (const file of chunk?.viteMetadata?.importedCss || []) css.add(file);
      }

      const shell = `${base}index.html`;
      const urls = [
        shell,
        ...[...reachable].sort().map((f) => base + f),
        ...[...css].sort().map((f) => base + f),
        ...publicFiles.map((f) => base + f),
      ];

      precacheUrls = urls;
    },

    /**
     * Written here rather than emitted from generateBundle so the version can
     * hash the precached files' *contents*, once they and the copied public/
     * assets are all on disk.
     *
     * Content hashing is what makes updates reliable: most entries carry a hash
     * in their name, but index.html, the manifest and the icons do not. Keying
     * the version off the file list alone would leave an edit to any of those
     * producing a byte-identical worker, which the browser never reinstalls —
     * so the stale copies would be served forever.
     */
    closeBundle() {
      const shell = `${base}index.html`;
      const hash = createHash('sha256');
      const missingOnDisk = [];

      for (const url of precacheUrls) {
        const file = join(outDir, url.slice(base.length));
        hash.update(url);
        try {
          hash.update(readFileSync(file));
        } catch {
          missingOnDisk.push(url);
        }
      }

      if (missingOnDisk.length) {
        this.warn(
          `offline precache: ${missingOnDisk.join(', ')} not found in the build output — ` +
            'the service worker will skip them at install time.',
        );
      }

      const version = hash.digest('hex').slice(0, 12);

      const template = readFileSync(resolve(HERE, 'service-worker.js'), 'utf8');
      const source = template
        .replace('__CACHE_VERSION__', version)
        .replace('__API_BASE__', apiBase)
        .replace('__SHELL_URL__', shell)
        .replace('__PRECACHE_MANIFEST__', JSON.stringify(precacheUrls, null, 2));

      writeFileSync(join(outDir, 'sw.js'), source);
      this.info?.(`offline precache: ${precacheUrls.length} files (build ${version})`);
    },
  };
}

export default offlinePWA;
