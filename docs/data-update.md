# Data Update Pipelines (`docs/data-update.md`)

This document describes how game data and drop matrices are synchronized, normalized, and maintained in Arknights Calculator.

## 1. Architectural Principles

- **Zero Runtime Dependencies**: The client application never queries external game data servers or Penguin Statistics directly in the user's browser. All data is served from local, pre-processed JSON snapshots in `data/` (`offline-friendly`, PWA compatible).
- **PR-based Workflow**: No automatic script or bot commits directly to `main`. Every automated update runs in GitHub Actions and submits a Pull Request for CI validation and review.
- **Fail-Safe Fallbacks**: Each data pipeline provides offline-capable benchmarks (e.g. `data/penguin/benchmark.json`).

---

## 2. Penguin Statistics Drop Matrix Synchronization

- **Script**: `npm run data:penguin` (`scripts/data/fetch-penguin.ts`)
- **Automated Workflow**: `.github/workflows/update-penguin.yml`
  - **Schedule**: Every Monday at 03:00 UTC (`0 3 * * 1`)
  - **Manual Trigger**: `workflow_dispatch`
  - **Token**: the PR is opened with the `CRON_PAT` secret, not `GITHUB_TOKEN`, so that `pull_request` CI runs on it.
- **Output Artifacts**:
  - `data/penguin/cn.json`: CN server drop matrix for stages matching official game data.
  - `data/penguin/us.json`: Global / US server drop matrix.
  - `data/penguin/benchmark.json`: Curated baseline snapshot used as network/build fallback.
- **Filtering Rules**:
  - **Minimum Sample Size**: Only records with `times >= 300` are retained.
  - **Valid Sanity Cost**: Only playable stages with `apCost > 0` are accepted (carnival and token stages are excluded).
  - **Stage Cross-Matching**: Stages with suffixes `_rep` and `_perm` are cross-referenced with the base stage in `data/stages.json`. Unmatched pseudo-stages (e.g. lottery boxes, supply crates) are marked `matchedGameData: false` and hidden from the farming optimizer.

---

## 3. Game Data & Operator Synchronization

- **Scripts**:
  - `npm run data:pins`: Advances the pinned upstream commit in `scripts/data/sources.config.ts` (see section 4).
  - `npm run data:fetch`: Downloads raw game tables from upstream repository into `.cache/raw/`.
  - `npm run data:stages`: Builds normalized `data/stages.json`.
  - `npm run data:items`: Builds `data/items.json`.
  - `npm run data:recipes`: Builds `data/recipes.json`.
  - `npm run data:constants`: Builds `data/constants.json`.
  - `npm run data:build`: Builds operator summaries and details in `data/operators/`.
  - `npm run data:validate`: Verifies referential integrity across all data items.

---

## 4. Weekly Game Data Synchronization (`update-data.yml`)

- **Workflow**: `.github/workflows/update-data.yml`
  - **Schedule**: Every Monday at 04:00 UTC (`0 4 * * 1`), one hour after the Penguin Stats job.
  - **Manual Trigger**: `workflow_dispatch`.
  - **Concurrency**: group `update-game-data-${{ github.ref }}` with `cancel-in-progress: false`, so an in-flight refresh is never interrupted and queued runs wait for it.
  - **Timeout**: 60 minutes.
  - **Permissions**: `contents: write`, `pull-requests: write`.

### 4.1. Upstream pin

`scripts/data/sources.config.ts` pins `SanityGoneAK/arknights-gamedata` by commit SHA for both `cn` and `en`. `npm run data:pins` (`scripts/data/update-sources.ts`) resolves the latest commit of the upstream `main` branch through the GitHub API, validates that it is exactly 40 lowercase hex characters, and rewrites `sources.cn.commit` and `sources.en.commit` idempotently. Asset repository pins are never touched.

- `npm run data:pins -- --dry-run` prints the old and new SHAs and writes nothing.
- The script exits with an error when the API is unreachable, the payload has no SHA, or the SHA is invalid.
- The pin is advanced by the workflow at run time. Changing it by hand would only go stale on the next scheduled run.

### 4.2. Pipeline order

1. `data:pins` — advance the pin.
2. `data:fetch` — download the raw tables at the new commit.
3. `data:stages`, `data:items`, `data:recipes`, `data:constants`.
4. `data:build` (operators), `data:handbook`, `data:ranges`, `data:recruit`, `data:skins`.
5. `data:wiki-banners` — retried three times with a 30 s pause because the wiki API intermittently returns 502. If all attempts fail, the workflow restores the checked-in `data/wiki-banners.json` snapshot and continues; the PR body marks wiki banners as `existing snapshot (scrape failed)`.
6. `data:banners`.
7. `data:translate:all` — Gemini translation of CN-only strings.
8. `data:validate` — referential integrity across all generated data.

`data:assets`, `data:thumbs` and `data:banner-thumbs` are **not** part of this workflow: they publish to the separate assets repository and are run manually (see `docs/assets.md`).

### 4.3. Secrets and variables

| Name             | Purpose                                                                                                                                                                                                                                               |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CRON_PAT`       | Fine-grained PAT with `Contents: read/write` and `Pull requests: read/write`. Passed as `token` to `peter-evans/create-pull-request`, because a PR opened with `GITHUB_TOKEN` does not trigger `pull_request` workflows, so CI would never run on it. |
| `GEMINI_API_KEY` | Machine translation (`data:translate:all`).                                                                                                                                                                                                           |

- `GEMINI_MODEL` is an optional repository variable: `vars.GEMINI_MODEL` overrides the default `gemini-3.8-flash`.
- When either secret is missing, the workflow fails in the "Verify required secrets" step with an explicit error instead of silently skipping translation or opening a PR without CI.
- Secret values are never printed or committed.

### 4.4. Size guard (`AGENTS.md` section 14)

The workflow records `du -sb data` before the pipeline and measures it again after `data:validate`. If the directory grows by more than 25%, the job fails before the PR step with an error that manual owner approval is required. A growth of exactly 25% still passes.

### 4.5. Review rules

- The bot only opens or updates the `chore/data-update` branch; it never merges.
- The PR body reports the upstream commit, the `data/` size before and after with the growth percentage, and that validation passed.
- A maintainer reviews the diff and the CI run (which exists because of `CRON_PAT`) and merges manually.
- A growth above 25% is blocked by the guard and needs an explicit section 14 approval recorded in `docs/known-issues.md` before the limit can be raised.
- A failing `data:validate`, a translation error or a triggered growth guard fails the workflow itself, so no PR is created. A wiki-banner scrape failure is the only tolerated external failure: it keeps the previous snapshot and is called out in the PR body.
