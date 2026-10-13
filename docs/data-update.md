# Game Data Update Guide (`docs/data-update.md`)

This guide outlines the standard operating procedure for synchronizing, updating, and validating game data, translations, assets, and farming stages for every new game patch.

---

## 1. Prerequisites

- **Node.js**: `v22.x` or higher (`.nvmrc`).
- **Clean Working Tree**: Ensure your git working tree is clean. Create a new branch:
  ```bash
  git checkout main
  git pull
  git checkout -b chore/data-update-<patch_name>
  ```

---

## 2. Step-by-Step Update Pipeline

### Step 2.1: Fetch Raw Game Data

Fetch the latest Excel tables from upstream game data repositories (CN: `Kengxxiao/ArknightsGameData`, EN: `Kengxxiao/ArknightsGameData_YoStar`):

```bash
npm run data:fetch
```

- Tables are cached in `.cache/raw/zh_CN/` and `.cache/raw/en_US/`.
- Validates downloaded tables against Zod schemas in `scripts/data/schemas.ts`.

---

### Step 2.2: Scrape Community Wiki Translations

Fetch official English translations for newly released Global operators and community translations for CN-only operators from `arknights.wiki.gg`:

```bash
jiti scripts/data/fetch-wiki-translations.ts
```

- Verifies operator presence against `Category:CN_Operator` and saves global availability status into `data/i18n/global-availability.json`.
- Stores CC-BY-SA 4.0 translation caches under `data/i18n/wiki/operators.json` with attribution headers.

---

### Step 2.3: Rebuild Terminology Glossary

Update the bidirectional categorized glossary from official game data:

```bash
jiti scripts/data/glossary.ts
```

- Generates `data/i18n/glossary.json` across categories: `operators`, `classes`, `subclasses`, `factions`, `items`, `skills`, `talents`, `terms`.
- Detects intra-category conflicts (`data/i18n/glossary-conflicts.json`) and cross-category homonyms (`data/i18n/glossary-cross-category.json`).

---

### Step 2.4: Synchronize Farming Stages

Cross-match Penguin Stats API (US & CN) against the game's `stage_table.json`:

```bash
npm run data:stages
```

- Generates `data/stages.json`.
- Matched stages receive official localized titles and `matchedGameData: true`.
- Unmatched stages (lottery boxes, supply events, rerun pseudo-stages) are flagged with `matchedGameData: false` and hidden from farming recommendations.

---

### Step 2.5: Machine Translation Pipeline for Missing Strings

1. **Analyze untranslated volume & deduplicate templates**:
   ```bash
   jiti scripts/data/translate-missing.ts --analyze
   ```
2. **Export batches for offline translation**:
   ```bash
   jiti scripts/data/translate-missing.ts --export 60
   ```
   Outputs JSONL batches into `.cache/translate/in/batch_*.jsonl`.
3. **Perform translations** (following priority: operator names > skill/talent/module names > skill descriptions > talent descriptions > module descriptions):
   Save translated JSONL files into `.cache/translate/out/`.
4. **Import & validate translations**:
   ```bash
   jiti scripts/data/translate-missing.ts --import
   ```
   - Automatically executes `validateTranslation()` ensuring tag parity (`<@ba.vup>`, `</>`), placeholder parity (`{atk:0%}`), and newline integrity.
   - Saves verified translations to `data/i18n/machine/*.json`.

---

### Step 2.6: Compile Derived Game Datasets

Compile the core runtime JSON files used by the web client:

```bash
npm run data:constants
npm run data:items
npm run data:recipes
npm run data:build
```

- `data:build` processes all 434 operators through the 5-tier fallback chain (`manual` > `official` > `wiki` > `community` > `machine` > `zh`).
- Generates `data/operators-index.json`, `data/operators/{id}.json`, `data/meta.json`, and `data/i18n/report.json`.

---

### Step 2.7: Asset Manifest & Thumbnail Generation

Update asset CDN URLs and local thumbnails:

```bash
npm run data:assets
npm run data:thumbs
```

---

## 3. Verification & Quality Gates

Run the mandatory quality assurance checks before submitting a PR:

```bash
# 1. Referential integrity (operators, recipes, items, skills, modules)
npm run data:validate

# 2. Locale keys parity
npm run i18n:check

# 3. Static analysis & linting
npm run lint
npm run stylelint
npm run typecheck
npm run format:check

# 4. Unit & E2E test suites
npm run test
npm run test:e2e

# 5. Production build test
npm run build
```

---

## 4. Submitting Changes

1. Review `data/i18n/report.json` to verify that string counts align with expectations.
2. Ensure no unintended diffs or secrets exist via `git diff`.
3. Create a Conventional Commit:
   ```bash
   git commit -m "chore(data): sync patch data for <event/patch_name>"
   ```
4. Open a Pull Request for review.
