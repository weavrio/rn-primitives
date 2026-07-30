# `@weavr/rn-primitives`

A weavr-owned **repackaging** of [`roninoss/rn-primitives`](https://github.com/roninoss/rn-primitives): the 32 upstream `@rn-primitives/*` packages republished as **one** package with per-name subpath exports.

```ts
import * as Dialog from '@weavr/rn-primitives/dialog';
import * as Select from '@weavr/rn-primitives/select';
```

The version **mirrors the upstream release it was built from** (`1.5.2` here). A weavr-only republish of the same upstream release appends `-weavr.N`.

## Why this exists

Two reasons, and neither is "we want to diverge":

1. **Repackaging.** One dependency and one version to reason about instead of 32.
2. **A supply-chain control point.** weavr consumes this package **exact-pinned**. Upstream releases reach weavr only through a deliberate, CI-verified version bump — that bump is the review gate.

There is **no intended ongoing divergence** from upstream. If you are tempted to fix a bug here, fix it upstream and pull the release through.

## How the repackage works

`scripts/repackage.mjs` is a **relocation**, not a rebuild. It copies each upstream package's built `dist/` to `dist/<name>/` and makes exactly **one** class of edit: rewriting the five bare cross-package specifiers (`@rn-primitives/{hooks,portal,slot,types,utils}`) into relative paths, so the published package resolves internally rather than depending on the 32 upstream packages.

Everything else is preserved byte for byte — including the extensionless `./dialog` hop inside each entry, which is what lets Metro and webpack pick `dialog.web.js` on web. **Both platform implementations ship**: the native one and the Radix-backed web one.

The `exports` map, `dependencies` and `peerDependencies` in `package.json` are **generated** by that script from the upstream manifests, so they cannot drift. The committed result is the audit surface for the supply-chain review.

## Verification

Upstream ships **no test suite** (no test files, no test scripts, no CI), so "run upstream's tests against the fork" is not available as a gate. Behaviour preservation is proven structurally instead — `repackage.test.ts` asserts:

- the public surface is exactly the 32 pinned subpaths, no more and no fewer;
- every export condition points at a file that exists;
- **every copied file is byte-identical to upstream's build after applying the one declared rewrite** — this is the behaviour-unchanged proof;
- no bare `@rn-primitives/` specifier survives in the output;
- every emitted relative specifier resolves to a real file;
- the `.web.*` platform variants are all present and the entry hop stays extensionless.

`tsconfig.check.json` additionally typechecks a fixture that imports all 32 subpaths **through this package's own `exports` map**, so a broken or missing entry fails as a consumer would see it.

```bash
pnpm --filter @weavr/rn-primitives build      # relocate + regenerate the manifest
pnpm --filter @weavr/rn-primitives test       # the relocation contract
pnpm --filter @weavr/rn-primitives typecheck  # the consumer surface
```

`build` requires the upstream packages to be built first (`pnpm build` at the repo root).

## Transitive dependency surface

The repackage carries upstream's own runtime dependencies, so a weavr bump review should read this delta:

- **`zustand`** — required by `portal`. Its native implementation is a store-based re-parent, which is why portalled children resolve React context at the host's position in the tree rather than at the trigger site. Consumers that rely on per-slot context inside a portal must bridge it themselves.
- **23 `@radix-ui/react-*` packages** — one per web-backed primitive. These are the web implementation; native never loads them.

## Releasing

CI gates every publish on: the relocation contract tests, the consumer-surface typecheck, and a clean upstream build. **Never publish a broken repackage** — if the gate is red, open an issue or PR instead.

## License

MIT, inherited from upstream. See [`LICENSE`](./LICENSE) — the upstream copyright is retained; weavr's line covers the repackaging only.
