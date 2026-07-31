// Tests for the weavr repackage of roninoss/rn-primitives.
//
// The repackage is a pure RELOCATION: every upstream package's built `dist/` is
// copied under `dist/<name>/` in this single package, and the only edit made to
// any file is rewriting bare `@rn-primitives/<x>` specifiers into relative paths
// so the result is self-contained. These tests hold that contract — the byte
// parity test is what proves behaviour is unchanged, since upstream ships no
// test suite of its own to run against the fork.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const here = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

/**
 * The public subpath surface, pinned. Deliberately a literal and not a
 * directory read: deriving it from disk would make every assertion below
 * tautological — an empty repackage would "match" an empty listing.
 */
const SUBPATHS = [
  'accordion',
  'alert-dialog',
  'aspect-ratio',
  'avatar',
  'checkbox',
  'collapsible',
  'context-menu',
  'dialog',
  'dropdown-menu',
  'hooks',
  'hover-card',
  'label',
  'menubar',
  'navigation-menu',
  'popover',
  'portal',
  'progress',
  'radio-group',
  'select',
  'separator',
  'slider',
  'slot',
  'switch',
  'table',
  'tabs',
  'toast',
  'toggle',
  'toggle-group',
  'toolbar',
  'tooltip',
  'types',
  'utils',
] as const;

interface IConditionalTarget {
  types: string;
  default: string;
}

interface IExportEntry {
  import: IConditionalTarget;
  require: IConditionalTarget;
}

function manifest(): { exports: Record<string, IExportEntry | string> } {
  return JSON.parse(readFileSync(here('./package.json'), 'utf8')) as {
    exports: Record<string, IExportEntry | string>;
  };
}

describe('public subpath surface', () => {
  it('pins exactly 32 subpaths', () => {
    expect(SUBPATHS).toHaveLength(32);
  });

  it('exports every pinned subpath', () => {
    const { exports: map } = manifest();
    for (const name of SUBPATHS) {
      expect(map, `missing export for "./${name}"`).toHaveProperty(`./${name}`);
    }
  });

  it('exports nothing beyond the pinned subpaths and package.json', () => {
    const { exports: map } = manifest();
    const allowed = new Set([...SUBPATHS.map((n) => `./${n}`), './package.json']);
    const extra = Object.keys(map).filter((key) => !allowed.has(key));
    expect(extra, `unexpected public subpath(s): ${extra.join(', ')}`).toEqual([]);
  });

  it('does not export an unlisted subpath', () => {
    const { exports: map } = manifest();
    expect(map).not.toHaveProperty('./not-a-primitive');
  });

  it('points every export condition at a file that exists', () => {
    const { exports: map } = manifest();
    const missing: string[] = [];
    for (const name of SUBPATHS) {
      const entry = map[`./${name}`] as IExportEntry | undefined;
      if (entry === undefined) {
        missing.push(`./${name} (no entry)`);
        continue;
      }
      for (const condition of ['import', 'require'] as const) {
        for (const field of ['types', 'default'] as const) {
          const target = entry[condition][field];
          if (!existsSync(here(target))) missing.push(`${target} (${name}.${condition}.${field})`);
        }
      }
    }
    expect(missing, `export targets missing on disk:\n${missing.join('\n')}`).toEqual([]);
  });
});

// --- the relocation contract ---------------------------------------------
//
// Upstream ships no test suite, so "did the repackage change behaviour?" cannot
// be answered by running their tests against the fork. It is answered instead by
// proving the output is upstream's own build, byte for byte, with exactly one
// declared class of edit applied. Anything else that differs is a defect.

const REWRITE_TARGET: Record<string, string> = {
  '.d.mts': 'index.mjs',
  '.d.ts': 'index.js',
  '.mjs': 'index.mjs',
  '.js': 'index.js',
};

function rewriteTargetFor(file: string): string | undefined {
  const ext = Object.keys(REWRITE_TARGET)
    .filter((candidate) => file.endsWith(candidate))
    .sort((a, b) => b.length - a.length)[0];
  return ext === undefined ? undefined : REWRITE_TARGET[ext];
}

/** The one edit the repackage is allowed to make. */
function applyDeclaredRewrite(source: string, target: string): string {
  return source.replaceAll(
    /(["'])@rn-primitives\/([a-z-]+)\1/g,
    (_match, quote: string, name: string) => `${quote}../${name}/${target}${quote}`
  );
}

function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name).slice(dir.length + 1))
    .sort();
}

/**
 * Does `specifier`, written inside `fromFile`, land on a real file? Mirrors how
 * TypeScript and bundlers resolve: a runtime `.js`/`.mjs` specifier in a
 * declaration file is satisfied by the sibling `.d.ts`/`.d.mts`.
 */
function resolvesFrom(dir: string, specifier: string, fromFile: string): boolean {
  const target = join(dir, specifier);
  const isDeclaration = fromFile.endsWith('.d.ts') || fromFile.endsWith('.d.mts');
  const candidates = [target];
  if (isDeclaration) {
    candidates.push(target.replace(/\.mjs$/, '.d.mts'), target.replace(/\.js$/, '.d.ts'));
  }
  return candidates.some((candidate) => existsSync(candidate));
}

const upstreamDist = (name: string): string => here(`../${name}/dist`);
const repackagedDist = (name: string): string => here(`./dist/${name}`);

describe('relocation contract', () => {
  it('copies every upstream file for every subpath', () => {
    const gaps: string[] = [];
    for (const name of SUBPATHS) {
      const expected = listFiles(upstreamDist(name));
      const actual = listFiles(repackagedDist(name));
      const dropped = expected.filter((file) => !actual.includes(file));
      if (dropped.length > 0) gaps.push(`${name}: missing ${dropped.join(', ')}`);
    }
    expect(gaps, `files dropped by the repackage:\n${gaps.join('\n')}`).toEqual([]);
  });

  it('changes nothing except the declared specifier rewrite', () => {
    const drift: string[] = [];
    let compared = 0;
    for (const name of SUBPATHS) {
      for (const file of listFiles(upstreamDist(name))) {
        const source = readFileSync(join(upstreamDist(name), file), 'utf8');
        const target = rewriteTargetFor(file);
        const expected = target === undefined ? source : applyDeclaredRewrite(source, target);
        const actualPath = join(repackagedDist(name), file);
        if (!existsSync(actualPath)) {
          drift.push(`${name}/${file} (absent)`);
          continue;
        }
        compared += 1;
        if (readFileSync(actualPath, 'utf8') !== expected) drift.push(`${name}/${file}`);
      }
    }
    // Without this, an empty repackage would compare nothing and "pass".
    expect(compared, 'no files were compared — the repackage produced no output').toBeGreaterThan(
      0
    );
    expect(drift, `files differ beyond the declared rewrite:\n${drift.join('\n')}`).toEqual([]);
  });

  it('leaves no bare @rn-primitives specifier in the output', () => {
    const leaked: string[] = [];
    let scanned = 0;
    for (const name of SUBPATHS) {
      for (const file of listFiles(repackagedDist(name))) {
        scanned += 1;
        const contents = readFileSync(join(repackagedDist(name), file), 'utf8');
        if (/["']@rn-primitives\//.test(contents)) leaked.push(`${name}/${file}`);
      }
    }
    // Same guard: nothing scanned must not read as nothing leaked.
    expect(scanned, 'no files were scanned — the repackage produced no output').toBeGreaterThan(0);
    expect(leaked, `unrewritten cross-package specifiers:\n${leaked.join('\n')}`).toEqual([]);
  });

  it('preserves the .web platform variants', () => {
    const gaps: string[] = [];
    for (const name of SUBPATHS) {
      const webFiles = listFiles(upstreamDist(name)).filter((file) => file.includes('.web.'));
      const actual = listFiles(repackagedDist(name));
      const dropped = webFiles.filter((file) => !actual.includes(file));
      if (dropped.length > 0) gaps.push(`${name}: ${dropped.join(', ')}`);
    }
    expect(gaps, `web platform variants dropped:\n${gaps.join('\n')}`).toEqual([]);
  });

  it('emits only relative specifiers that resolve to a real file', () => {
    // The rewrite has to pick the right target extension per file kind: a `.d.ts`
    // must point at the runtime specifier whose sibling declaration exists
    // (`../types/index.js` → `../types/index.d.ts`), a `.d.mts` at `index.mjs`
    // → `index.d.mts`. Getting that mapping wrong produces specifiers that look
    // fine and resolve to nothing.
    const unresolved: string[] = [];
    let checked = 0;
    for (const name of SUBPATHS) {
      for (const file of listFiles(repackagedDist(name))) {
        const dir = dirname(join(repackagedDist(name), file));
        const contents = readFileSync(join(repackagedDist(name), file), 'utf8');
        for (const [, , specifier] of contents.matchAll(/(["'])(\.\.\/[^"']+)\1/g)) {
          checked += 1;
          if (!resolvesFrom(dir, specifier, file)) {
            unresolved.push(`${name}/${file} → ${specifier}`);
          }
        }
      }
    }
    expect(checked, 'no relative specifiers were checked').toBeGreaterThan(0);
    expect(unresolved, `specifiers that resolve to nothing:\n${unresolved.join('\n')}`).toEqual([]);
  });

  it('keeps the entry hop extensionless so bundlers can pick the web variant', () => {
    // `index.mjs` re-exports `./dialog`, NOT `./dialog.mjs` — that extensionless
    // hop is what lets Metro/webpack resolve `dialog.web.mjs` on web. Rewriting
    // it to an explicit extension would silently ship the native build to web.
    const entry = readFileSync(join(repackagedDist('dialog'), 'index.mjs'), 'utf8');
    expect(entry).toContain('"./dialog"');
    expect(entry).not.toContain('"./dialog.mjs"');
  });
});
