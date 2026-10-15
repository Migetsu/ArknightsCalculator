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
  - `npm run data:fetch`: Downloads raw game tables from upstream repository into `.cache/raw/`.
  - `npm run data:stages`: Builds normalized `data/stages.json`.
  - `npm run data:items`: Builds `data/items.json`.
  - `npm run data:recipes`: Builds `data/recipes.json`.
  - `npm run data:constants`: Builds `data/constants.json`.
  - `npm run data:build`: Builds operator summaries and details in `data/operators/`.
  - `npm run data:validate`: Verifies referential integrity across all data items.
