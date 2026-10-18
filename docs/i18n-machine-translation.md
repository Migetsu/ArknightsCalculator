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

3. translate scripts/data/translate-with-gemini.ts  (this document)

4. import    npx jiti scripts/data/translate-missing.ts --import
             -> validates every string with validateTranslation() and writes
                data/i18n/machine/{operators,skills,talents,modules}.json
```

`.cache/` is gitignored: batches are working state, only `data/i18n/machine/*.json`
is committed.

> **Batches go stale.** `.cache/translate/in/` must be regenerated with `--export`
> before every run. A batch exported before an EN data migration will contain
> strings that are already covered by the official layer.

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

## Cost and quota

The whole current backlog (188 unique strings, ~35k Chinese characters) fits in
**4 requests** at `batchSize 60`, roughly 51k input and 17k output tokens.
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
