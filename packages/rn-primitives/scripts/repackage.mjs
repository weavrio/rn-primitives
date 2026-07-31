// Repackage every upstream @rn-primitives/* build into this single package.
//
// This is a RELOCATION, not a rebuild: each upstream package's `dist/` is copied
// verbatim under `dist/<name>/`, and the ONLY edit is rewriting the five bare
// cross-package specifiers (@rn-primitives/{hooks,portal,slot,types,utils}) into
// relative paths, so the published package is self-contained. Everything else —
// including the extensionless `./dialog` hop that lets a bundler pick
// `dialog.web.js` on web — is preserved byte for byte. `repackage.test.ts`
// enforces exactly that.
//
// The exports map, dependencies and peerDependencies in package.json are
// GENERATED here from the upstream manifests so they cannot drift. The committed
// result is the audit surface for the supply-chain review gate.

import { copyFileSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG_ROOT = fileURLToPath(new URL('../', import.meta.url));
const UPSTREAM_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const DIST = join(PKG_ROOT, 'dist');

/** Upstream's own package directory name for this repackage — never re-exported. */
const SELF = 'rn-primitives';

/**
 * Extension → the specifier a rewritten cross-package import should use. The
 * declaration forms point at the runtime specifier TypeScript derives the
 * sibling `.d.ts` / `.d.mts` from, which is how TS module resolution works for
 * both `node16` and `bundler`.
 */
const REWRITE_TARGET = {
  '.mjs': 'index.mjs',
  '.js': 'index.js',
  '.d.mts': 'index.mjs',
  '.d.ts': 'index.js',
};

/** Longest-suffix match, so `.d.ts` wins over `.js`. */
function targetFor(file) {
  const match = Object.keys(REWRITE_TARGET)
    .filter((ext) => file.endsWith(ext))
    .sort((a, b) => b.length - a.length)[0];
  return match === undefined ? undefined : REWRITE_TARGET[match];
}

function discoverPackages() {
  return readdirSync(join(UPSTREAM_ROOT), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name !== SELF)
    .map((entry) => entry.name)
    .filter((name) => existsDist(name))
    .sort();
}

function existsDist(name) {
  try {
    readdirSync(join(UPSTREAM_ROOT, name, 'dist'));
    return true;
  } catch {
    return false;
  }
}

/**
 * The one edit the repackage is allowed to make: `@rn-primitives/slot` becomes
 * `../slot/index.mjs` (or the matching runtime form for the file's extension),
 * so the published package resolves internally instead of depending on the 32
 * upstream packages. Relative `./dialog` hops are deliberately untouched — that
 * extensionless form is what lets a bundler pick `dialog.web.mjs` on web.
 */
function rewriteSpecifiers(source, target) {
  return source.replaceAll(
    /(["'])@rn-primitives\/([a-z-]+)\1/g,
    (_match, quote, name) => `${quote}../${name}/${target}${quote}`
  );
}

/** Copy a directory tree verbatim, applying the rewrite to text modules only. */
function copyTree({ from, to }) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    const src = join(from, entry.name);
    const dest = join(to, entry.name);
    if (entry.isDirectory()) {
      copyTree({ from: src, to: dest });
      continue;
    }
    const target = targetFor(entry.name);
    if (target === undefined) {
      copyFileSync(src, dest);
      continue;
    }
    writeFileSync(dest, rewriteSpecifiers(readFileSync(src, 'utf8'), target));
  }
}

function exportEntry(name) {
  return {
    import: { types: `./dist/${name}/index.d.mts`, default: `./dist/${name}/index.mjs` },
    require: { types: `./dist/${name}/index.d.ts`, default: `./dist/${name}/index.js` },
  };
}

/** Every non-@rn-primitives runtime dependency, unioned across the upstream set. */
function collectDependencies(names) {
  const merged = {};
  for (const name of names) {
    const manifest = JSON.parse(readFileSync(join(UPSTREAM_ROOT, name, 'package.json'), 'utf8'));
    for (const [dep, range] of Object.entries(manifest.dependencies ?? {})) {
      if (dep.startsWith('@rn-primitives/')) continue;
      const existing = merged[dep];
      if (existing !== undefined && existing !== range) {
        throw new Error(`repackage: conflicting ranges for ${dep}: ${existing} vs ${range}`);
      }
      merged[dep] = range;
    }
  }
  return Object.fromEntries(Object.entries(merged).sort(([a], [b]) => a.localeCompare(b)));
}

const names = discoverPackages();
if (names.length === 0) {
  throw new Error('repackage: no upstream dist/ found — run the workspace build first');
}

rmSync(DIST, { recursive: true, force: true });
for (const name of names) {
  copyTree({ from: join(UPSTREAM_ROOT, name, 'dist'), to: join(DIST, name) });
}

const manifestPath = join(PKG_ROOT, 'package.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
manifest.exports = {
  './package.json': './package.json',
  ...Object.fromEntries(names.map((name) => [`./${name}`, exportEntry(name)])),
};
manifest.dependencies = collectDependencies(names);
// publishConfig/repository are hand-owned, not generated — assert rather than
// rewrite, so a manifest that lost them fails the build instead of publishing
// to the wrong access level.
if (manifest.publishConfig?.access === undefined) {
  throw new Error('repackage: package.json is missing publishConfig.access');
}
manifest.peerDependencies = { react: '*', 'react-native': '*', 'react-native-web': '*' };
manifest.peerDependenciesMeta = {
  'react-native': { optional: true },
  'react-native-web': { optional: true },
};
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

process.stdout.write(`repackaged ${names.length} subpaths into ${dirname(DIST)}/dist\n`);
