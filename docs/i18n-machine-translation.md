# Machine Translation Pipeline (CN-only content)

CN-only operators (not yet released on Global) have no official EN text. Instead of
showing raw Chinese or a permanent `[Pending Translation]` placeholder, the missing
strings are machine translated and merged into the existing i18n layer chain.

## Resolution order

`scripts/data/i18n-layers.ts` resolves every localized string through:

```
manual override > official (YoStar EN repo) > wiki (Global) / community (CN-only)
  > machine translation > glossary > pending
```

Anything that ends up as `pending` renders `[Pending Translation]` with a `PENDING`
badge; anything resolved by the `machine` layer renders with an `MT` badge
(`app/components/ui/AkTranslationBadge.vue`).

## Pipeline

The pipeline is deliberately split into four independent steps so that the
translation backend can be replaced without touching the data model.

```
1. analyze   npx jiti scripts/data/translate-missing.ts --analyze
             -> report of untranslated strings (deduplicated)

2. export    npx jiti scripts/data/translate-missing.ts --export [batchSize]
             -> .cache/translate/in/batch_NNN.jsonl
             Each line: { id, type, charId, charNameZh, zh, tags[], placeholders[],
                          keys[], relevantGlossary{zh:en} }

3. dry run   npm run data:translate:dry        (or --dry-run [--limit N] [--batch N])
             -> reports freshness, request count and estimated tokens, and writes the
                built prompts to .cache/translate/prompts/. Makes no API requests.

4. run       npm run data:translate:run      (or --run [--limit N] [--batch N]
             [--resume] [--no-repair])
             -> validates every returned string, re-sends failures once with the
                specific diff, quarantines what still fails to
                .cache/translate/failed.jsonl, and writes the accepted strings to
                .cache/translate/out/.

5. import    npx jiti scripts/data/translate-missing.ts --import
             -> validates every string with validateTranslation() and writes
                data/i18n/machine/{operators,skills,talents,modules}.json
```

## The translation loop

`scripts/data/lib/mt-run.ts` holds the loop, free of IO so a fake client can drive
it in tests. For each batch it:

1. requests the translations;
2. checks every returned string with `checkTranslation`, which combines
   `validateTranslation` (tag multiset, placeholder set, newline count) with three
   checks `validateTranslation` deliberately treats as valid because it is also used
   on already-imported data: empty output, output identical to the source, and output
   still containing Chinese characters;
3. re-sends whatever failed in a **single corrective request** that carries the
   previous attempt and the exact validator messages per item;
4. writes anything that fails both rounds to `failed.jsonl` and keeps it out of the
   output directory.

Accepted strings are written to `.cache/translate/out/batch_NNN.jsonl`, numbered after
any existing output so `--resume` appends rather than overwrites.

### Measured on the full backlog

169 strings, 3 batches, `gemini-3.8-flash`:

```
batch 1/3 (60 items): 59 ok, 1 to repair   -> repair recovered 1, 0 quarantined
batch 2/3 (60 items): 59 ok, 1 to repair   -> repair recovered 1, 0 quarantined
batch 3/3 (49 items): 46 ok, 3 to repair   -> repair recovered 3, 0 quarantined

translated 169 (5 after a corrective retry), quarantined 0, requests 6
```

A first-pass failure rate of ~3% (5/169) was fully absorbed by the corrective retry.
Re-checking the output independently: 0 tag mismatches, 0 placeholder mismatches,
0 newline mismatches, 0 strings with leftover Chinese.

`--resume` on the same set makes **0 requests** and skips all 169.

`.cache/` is gitignored: batches are working state, only `data/i18n/machine/*.json`
is committed.

> **Batches go stale.** `.cache/translate/in/` must be regenerated with `--export`
> before every run. A batch exported before an EN data migration will contain
> strings that are already covered by the official layer. `--export` clears the
> directory first, because a previous export with a larger set or a smaller batch
> size leaves higher-numbered files behind and those stale strings would be
> translated again alongside the fresh ones.

## What is not collected

A string is only collected if it contains at least one CJK ideograph. Without that
guard the collector treated any string where `en === zh` as a missing translation,
which pulled in content that needs no translation at all:

- operator codenames: `12F`, `W`, `Lancet-2`, `Castle-3`, `THRM-EX`
- talent and module names: `Mon3tr`, `Mon2tr`, `DWDB-221E`
- masked values: `？？？`

That was 19 of the original 188 templates. Left in, they would have been sent to the
API, come back unchanged, failed the source-identical check and landed in
`failed.jsonl` — and, had they been imported, would have stamped already-correct
official values with a machine-translation badge.

## Backend: Gemini API

`scripts/data/lib/gemini-client.ts` is a dependency-free REST client for
`POST /v1beta/models/{model}:generateContent`. It uses the platform `fetch`,
sends the key in the `x-goog-api-key` header (never in the URL, logs or errors),
retries `429/5xx` with exponential backoff and jitter, and honours both the
`Retry-After` header and the `retryDelay` field of the error payload.

Configuration lives in `.env` (see `.env.example`):

| Variable         | Default            | Notes                                   |
| :--------------- | :----------------- | :-------------------------------------- |
| `GEMINI_API_KEY` | —                  | Required. Free-tier key from AI Studio. |
| `GEMINI_MODEL`   | `gemini-3.8-flash` | See model comparison below.             |

### Why `gemini-3.8-flash` and not `gemini-3.5-flash-lite`

Measured on the same 60-string batch (`batch_001`) with an identical prompt and
`responseSchema`:

| Model                   | Tag mismatches | Wall clock | Tokens                                |
| :---------------------- | :------------- | :--------- | :------------------------------------ |
| `gemini-3.8-flash`      | 1 / 60         | 41s        | 14.7k                                 |
| `gemini-3.5-flash-lite` | 19-20 / 60     | 15s        | 14.4k                                 |
| `gemini-4-argon`        | —              | —          | HTTP 429 (not available on free tier) |

The failure mode is not translation quality but markup discipline: Flash-Lite
invents decorative tags that are absent from the Chinese source (e.g. adding
`<$ba.airprotect>Fire</>` around a phrase that carries no tag). Strengthening the
system prompt did not help (19 -> 20 mismatches). `gemini-3.8-flash` drops a tag
roughly once per 60 strings, which the validation gate catches and repairs.

### Thinking configuration

`thinkingConfig.thinkingBudget: 0` is **rejected** with HTTP 400
`INVALID_ARGUMENT` by both `gemini-3.5-flash-lite` and `gemini-3.8-flash`.
Thinking is therefore controlled with `thinkingConfig.thinkingLevel: 'low'`
(accepted, and observed to emit no `thoughtsTokenCount` for translation prompts).
`thinkingBudget: -1` does enable dynamic thinking (308 thought tokens on a
one-line input) and is not used here.

### Structured output

The client always sends `responseMimeType: 'application/json'` plus a
`responseSchema`, so the response shape is guaranteed by the API rather than
parsed out of prose. Translation responses are a flat
`[{ "id": string, "en": string }]` array.

## Prompt construction

`scripts/data/lib/mt-prompt.ts` is pure (no IO) so the prompt shape is unit
testable. It builds:

- a system instruction covering terminology, per-type style and the markup rules;
- a **compact** JSON user payload — one object per item, `{id, type, character?, zh,
glossary?}`, where `character` and `glossary` are omitted when they would carry no
  information. Indented JSON would add roughly a fifth to the prompt for no benefit.

`scripts/data/lib/mt-batch.ts` holds the file-system side: validating batch lines
with Zod (a malformed cache fails loudly instead of silently producing a wrong
prompt), listing batches and writing built prompts for inspection.

`--dry-run` never builds prompts from the cached batch. It always collects the
untranslated set live and reports the drift against the cache, because a stale
cache means paying for strings that are already translated upstream.

## Coverage

The collector covers every localized field the builder resolves:

| Type                          | Field                                                                                    |
| :---------------------------- | :--------------------------------------------------------------------------------------- |
| `operator_name`               | operator name                                                                            |
| `skill_name` / `skill_desc`   | skill level name / description                                                           |
| `talent_name` / `talent_desc` | talent candidate name / description                                                      |
| `module_name` / `module_desc` | module name / `uniEquipDesc`                                                             |
| `module_stage_desc`           | module stage part `additionalDescription` / `upgradeDescription` / `overrideDescription` |
| `potential_desc`              | `potentialRanks[].description`                                                           |
| `profile_text`                | `itemUsage` / `itemDesc` (operator dossier)                                              |
| `term_name` / `term_desc`     | `data/constants.json` terminology dictionary (the tooltips in rich text)                 |
| `operator_tag`                | operator role tags, as a fallback (see below)                                            |

As of the 2026-10-18 run this leaves **0 pending strings** in `data/operators/` and
`data/constants.json`, with 750 operator strings and 14 term strings resolved by the
machine layer.

### Role tags do not need the API

`tagList` is a plain string array in the game tables, not a localized field, so
CN-only operators shipped the Chinese tag (`["高空","输出","控场"]`). The CN and EN
tagLists are **parallel arrays**, so the official EN name for a Chinese tag is
recoverable from the operators that have both — no translation needed. The builder
builds that dictionary once and resolves every tag through the layer chain, with the
machine layer left as a fallback for a tag that has no English counterpart yet.
Empty tag entries exist in the tables and are dropped.

### A source string with no Han character is not untranslated

`resolveLayeredI18nString` used to return `[Pending Translation]` for any string it
could not resolve, including strings that are already Latin and need no translation
at all — `S.E.E.S.`, or a codename like `12F`. It now returns such a string as-is
with source `zh` (no badge), which is what made the last two terminology entries
resolve correctly.

### The talent index bug

Talent keys are positional, and the collector and the builder disagreed about what the
position meant:

- the builder keyed candidates by their index in the **raw CN table** and filtered
  hidden/empty talents _afterwards_, so a hidden talent at index 0 pushed the real
  candidates to `talent.1.*`;
- the collector reads the **already-built** file, where that hidden talent is gone, so it
  numbered the same candidates `talent.0.*`.

Every talent key after a hidden one was therefore off, and the translation was silently
never found — the symptom was one candidate whose name resolved as `machine` while its
own description resolved as `pending`. The builder now computes keys from the position in
the **final** array (`talentFinalIndex` / `candidateFinalIndex`), which is what the
collector and the built file use. EN lookups still use the raw indices, because the EN
table is aligned with the CN table.

Skills and modules were never affected: they are keyed by `skillId` / `uniEquipId` rather
than by position.

### Resume is keyed on `keys`, not `id`

Item ids are positional (`skill_desc_7`) and shift whenever the upstream data changes, so
an id-keyed resume would skip the wrong strings after an update. `--resume` therefore
matches on the stable `keys` array and skips an item only when every one of its keys is
already in the output directory.

## Updating after a new game release

```bash
# 1. refresh the source data
npm run data:fetch && npm run data:build
# (+ data:constants / data:items / data:recipes / data:stages as needed)

# 2. translate whatever became untranslated, and import it
npm run data:translate:all      # export -> run --resume -> import

# 3. rebuild so the machine layer is baked into data/operators/, then verify
npm run data:build
npm run data:validate && npm run test && npm run lint
```

`data:translate:all` is idempotent: when nothing is untranslated it exports 0 batches,
makes 0 API requests and the import re-merges what is already there. A typical release
costs a handful of requests.

`data:translate:dry` in between prints the request count and estimated tokens without
spending anything.

> **Not automated yet.** There is no CI job for this. `.github/workflows/update-penguin.yml`
> is the existing precedent for a scheduled data refresh that opens a PR, and a
> translation job would follow the same shape.

## Cost and quota

The whole current backlog (188 unique strings, ~35k Chinese characters) fits in
**4 requests** at `batchSize 60`. Measured with `models/gemini-3.8-flash:countTokens`
on the built prompts: 10,088 + 11,438 + 8,205 + ~2,200 = **~31,900 input tokens**,
plus roughly 17k output tokens.

`estimatePromptTokens()` in `mt-prompt.ts` predicts the input side without an API
call. Its coefficients (CJK 0.827 tokens/char, Latin/JSON 0.330) are fitted against
`countTokens` and reproduce it within ~1.5%.

Free-tier `RPM`/`TPM`/`RPD` values are no longer published in the Gemini docs —
Google moved them into AI Studio per project ("Rate limits depend on various
factors ... and can be viewed in Google AI Studio"). The practical risk is not a
single run but repeated debugging: use `--limit` and resume support so that
debugging does not burn the daily quota.

## Verification

```bash
npm run data:translate:check   # one minimal round-trip against the API
npm run test                   # unit tests, fetch mocked
```
