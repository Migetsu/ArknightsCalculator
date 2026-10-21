# Server Data Assets: operator detail & handbook delivery

Status: implemented in `refactor/server-data-assets` (Task 27).

## Problem

`useOperatorDetail` and `useOperatorHandbook` loaded one JSON file per operator with a
template-literal dynamic import:

```ts
await import(`../../data/operators/${cleanId}.json`)
await import(`../../data/handbook/${cleanId}.json`)
```

Vite turns each pattern into a glob of dynamic entries, so the build emitted one server chunk
and one client chunk per file: 434 operator files + 432 handbook files.

Measured before the change (production build, `NUXT_BUILD_DIR=.nuxt-agent`):

| Metric                                                 |         Before |
| :----------------------------------------------------- | -------------: |
| `.output/server/chunks` files                          |           1005 |
| `.output/server` size                                  |       50.68 MB |
| `.output/public/_nuxt` size                            |       28.96 MB |
| `.output/public/_nuxt` JS files                        |            920 |
| Build time                                             |         1m 20s |
| Peak process-tree working set (heap capped at 4096 MB) |         4.1 GB |
| Unit tests                                             | 789 / 96 files |

The chunk explosion, not the data volume, drove Vercel/Nitro builds to OOM at ~2040 MB.
Raising `--max-old-space-size` and disabling sourcemaps only masked the symptom.

## Why not raw `nitro.serverAssets` over `data/operators` and `data/handbook`?

The obvious first step — registering the two source directories as server assets — does not
remove the chunk-per-file behaviour. In Nitro 2.13.4 the production `serverAssets` plugin
emits `import("raw:" + fsPath)` for every asset
(`nitropack/dist/rollup/index.mjs`, `getAssetProd`), and Rollup creates one lazy chunk per
dynamic import. A minimal probe (`serverAssets` over a directory with three JSON files)
produced exactly three chunks: `chunks/raw/a.mjs`, `b.mjs`, `c.mjs`.

Pointing `serverAssets` at the 866 files would therefore recreate ~866 chunks, just with a
different prefix. Nitro's dev-mode `fs` driver is lazy and cheap, but production bundling is
the constraint here.

Other rejected options:

- `import.meta.glob(..., { query: '?url' })` + runtime fetch: Nitro's server build (Rollup,
  not Vite) has no `import.meta.glob` transform; emitting the files as assets would also copy
  ~27 MB into `.output/public`, which is exactly the data duplication the task forbids.
- Single monolithic aggregate per dataset, read fully per process: simpler, but every cold
  request parses 23.5 MB / 11.1 MB. Buckets keep the parsed working set proportional to the
  operators actually visited.
- Keeping dynamic imports and tuning memory: symptom only, client bundle still carried ~866
  data chunks.

## Implemented architecture

```
data/operators/<id>.json ──┐
                           ├─ build-time aggregation ─► .cache/server-data-assets/operators/{0..7}.json
data/handbook/<id>.json ───┘                          └► .cache/server-data-assets/handbook/{0..3}.json
                                                             │
                                              Nitro serverAssets (baseName operators/handbook)
                                                             │
                        /api/operators/[id]  ────────────────┤
                        /api/handbook/[id]   ────────────────┘
                                                             │
                     useOperatorDetail / useOperatorHandbook (useRequestFetch on SSR, $fetch on client)
```

- `modules/server-data-assets/` — local Nuxt module. On `nitro:config` it regenerates the
  buckets (cache-aware) and registers `serverAssets` with `baseName: 'operators' | 'handbook'`
  and `pattern: '*.json'`.
- `modules/server-data-assets/build-buckets.ts` — deterministic aggregation. Output goes to
  `<rootDir>/.cache/server-data-assets` (git/prettier-ignored), **not** the Nuxt build
  directory: Nuxt wipes the build directory after `nitro:config`, which silently removed the
  generated files before Nitro could bundle them (found during verification).
- `shared/utils/operatorData.ts` — dataset/bucket contract shared by the generator, server
  reader and client validation: id pattern `^[a-zA-Z0-9_]+$`, FNV-1a bucket mapping, bucket
  counts (8 operators, 4 handbook).
- `server/utils/operatorData.ts` — storage reader. `useStorage('assets:operators' |
'assets:handbook').getItem('<bucket>.json')` returns the parsed bucket (unstorage applies
  `destr` to the raw asset string). Parsed buckets are cached in-process; the cache is bounded
  by the bucket count.
- `server/api/operators/[id].get.ts`, `server/api/handbook/[id].get.ts` — validate the route
  param, return 400 for malformed ids (path traversal defence), 404 for unknown/broken data,
  and `cache-control: public, max-age=3600` on success.

### Why bucketed assets and not one file per dataset?

Each bucket is 1.4–3.0 MB of minified JSON. A request parses at most one operator bucket and
one handbook bucket (~2–5 MB), and the process retains them afterwards. Twelve server chunks
replace 866. The mapping is a pure hash, so no id→bucket manifest is needed and the generator
and runtime cannot disagree.

### Development vs production

- **Development:** `serverAssets` mount the generated directory with Nitro's `fs` driver, so
  the API reads the bucket files lazily from `.cache/server-data-assets`.
- **Production:** Nitro bundles the 12 bucket files as lazy `raw:` chunks inside
  `.output/server/chunks/raw`. They are server-only; no operator data reaches the client
  bundle. Vercel deploys the same Nitro output.

### Regeneration

The generator stores a manifest with file count, total bytes and the newest mtime for each
dataset. On every `nuxt dev` / `nuxt build` (and Nuxt test boot) it stats the source files and
skips work when the signature matches. A changed, added or removed file changes the signature
and rewrites the affected buckets. The dev server only regenerates on start: after running
`npm run data:*`, restart the dev server so the in-memory read path sees fresh buckets.

### Client composables

- `useOperatorDetail(id)` — `useAsyncData` key `operator-detail-${id}`, `default: null`,
  `watch` on the id, SSR fetch through `useRequestFetch()` (no absolute origin, no extra
  network hop).
- `useOperatorHandbook(charId)` — same key/default/watch contract, plus the in-memory
  `Map` cache (object identity preserved). Amiya patch forms (`char_1001_amiya2`,
  `char_1037_amiya3`) have no dossier file → API 404 → `null` → panel renders nothing.
- `fetchOperatorDetail` / `fetchOperatorHandbook` accept an optional fetcher argument. The
  composables pass `useRequestFetch()`; the planner store calls the helper without one, which
  uses the client `$fetch`. This keeps both SSR and client paths testable without a running
  server.

## Measured after the change

| Metric                                      |   Before |                    After |
| :------------------------------------------ | -------: | -----------------------: |
| `.output/server/chunks` files               |     1005 |                      153 |
| `.output/server` size                       | 50.68 MB |                 38.65 MB |
| `.output/public/_nuxt` size                 | 28.96 MB |                  6.07 MB |
| `.output/public/_nuxt` JS files             |      920 |                       51 |
| `.output` size excluding local `public/art` | 80.50 MB |                 45.56 MB |
| Build time                                  |   1m 20s | 1m 14s cold, 0m 50s warm |
| Peak process-tree working set               |   4.1 GB |                   2.6 GB |
| Unit tests                                  | 789 / 96 |                 802 / 99 |

Chunk budget target `< 200` is met with 153 chunks (12 of them are the data buckets).

## Verification

- `npm run data:validate` — 0 integrity issues (data untouched).
- Unit tests: generator grouping/cache invalidation, real-data bucket coverage, id validation,
  composable cache/404/real-data, SSR composable resolution, plus unchanged planner, farming,
  dossier and info-panel suites.
- Playwright (dev 3001 and production preview): `/operators/char_002_amiya?tab=info` SSR HTML
  contains dossier fields; `/operators/char_285_medic2` has no patch section;
  `/operators/char_1001_amiya2` returns no dossier; invalid id renders the tactical 404; no
  horizontal scroll at 360/1280; zero console errors.
- Production server (`node .output/server/index.mjs`): `/api/operators/char_002_amiya` 200,
  `/api/handbook/char_002_amiya` 200, `/api/handbook/char_1001_amiya2` 404.
  On the local Windows machine the production preview returns 500 for store-backed pages
  (`/`, `/gacha`, …) because of a pre-existing Pinia SSR issue that also reproduces on
  unmodified `main`; `/operators` and `/operators/[id]` are unaffected. See
  `docs/known-issues.md` (2026-10-21, `refactor/server-data-assets`).

## How to extend

- New dataset: add a `data/<name>/` directory, append `{ name, bucketCount }` to
  `OPERATOR_DATA_DATASETS`, add the matching API route/reader — the module registers the asset
  automatically.
- Bucket budget: raise `bucketCount` for smaller buckets (more chunks) or lower it for fewer
  chunks (larger parse per cold bucket). Keep the target well below the 200-chunk budget.
- The generator removes bucket files that are no longer part of the expected index set, so
  lowering `bucketCount` does not leave stray assets behind.
