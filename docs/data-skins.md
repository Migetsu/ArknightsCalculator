# Operator Skins Data Pipeline (`data/skins.json`)

## 1. Overview

The operator skins pipeline ingests `skin_table.json` from upstream game data (`SanityGoneAK/arknights-gamedata`), normalizes metadata across CN and EN sources, resolves names and descriptions via the layered i18n system, registers verifiable pricing status, and provides asset resolution for illustrations, portraits, and avatars.

## 2. Source Configuration

`skin_table.json` is registered in `scripts/data/sources.config.ts`:

- **Repository:** `SanityGoneAK/arknights-gamedata`
- **Commit:** `b5ff1ff3c389d18d8c0fcfa30735bd90f1d1ac74`
- **Paths:**
  - `cn/gamedata/excel/skin_table.json` (4.54 MB raw)
  - `en/gamedata/excel/skin_table.json` (4.11 MB raw)

Cached locally in `.cache/raw/{cn,en}/skin_table.json` via `npm run data:fetch`.

## 3. Zod Schema (`shared/schemas/skin.ts`)

| Field            | Type                               | Description                                                                 |
| :--------------- | :--------------------------------- | :-------------------------------------------------------------------------- |
| `skinId`         | `string`                           | Unique identifier (e.g. `char_102_texas@summer#1`, `char_002_amiya#1`)      |
| `charId`         | `string`                           | Parent operator ID (e.g. `char_102_texas`)                                  |
| `skinName`       | `I18nString`                       | Layered localized name (`en`, `zh`, `source`, `isMachineTranslation`)       |
| `brandId`        | `string \| null`                   | Fashion brand tag (e.g. `sale`, `epoque`, `summer`, `winter`, `boc`)        |
| `brandName`      | `I18nString \| null`               | Localized brand/collection name (`Test Collection/II`, `Coral Coast`, etc.) |
| `drawerList`     | `string[]`                         | Credited artists / illustrators (proper pen names credited by developer)    |
| `description`    | `I18nString \| null`               | Localized lore description or flavor text                                   |
| `dialog`         | `I18nString \| null`               | Localized outfit quote or dialogue line                                     |
| `obtainApproach` | `I18nString \| null`               | Localized acquisition method (`Store`, `Event Reward`, `Quest Reward`, etc) |
| `isBuySkin`      | `boolean`                          | Store outfit indicator from game data                                       |
| `isDefault`      | `boolean`                          | `true` for default appearances (E0/E1/E2), `false` for cosmetic outfits     |
| `price`          | `number \| null`                   | Numeric price in Originite Prime; strictly `null` without a verified source |
| `priceStatus`    | `'default' \| 'free' \| 'unknown'` | Verified pricing status: default appearance, free reward, or store outfit   |
| `priceSource`    | `string \| null`                   | Verified source reference for the price; strictly `null` currently          |
| `currency`       | `string \| null`                   | Currency code (e.g. `'ORIGINITE_PRIME'`), currently `null`                  |
| `illustId`       | `string`                           | Asset ID for full character illustration                                    |
| `avatarId`       | `string`                           | Asset ID for square icon                                                    |
| `portraitId`     | `string`                           | Asset ID for half-body portrait                                             |
| `isCnOnly`       | `boolean`                          | `true` if present only in CN `skin_table.json`                              |
| `servers`        | `('cn' \| 'en')[]`                 | Server availability list (`['cn']` or `['cn', 'en']`)                       |

## 4. Internationalization & CJK Protection

To ensure no raw Chinese text leaks into the English UI:

1. **Layered I18n Structure:** All user-facing strings (`skinName`, `brandName`, `description`, `dialog`, `obtainApproach`) are structured as `I18nString` objects (`{ en, zh, source, isMachineTranslation }`) via `resolveLayeredI18nString`.
2. **Pending Translation Behavior:** When official English text is unavailable (as with CN-only skin releases), fields receive `source = 'pending'` and `en = '[Pending Translation]'` with the original text retained in `zh`. This ensures the UI renders the tactical `PENDING` badge via `AkTranslationBadge` and permits batch discovery by `scripts/data/translate-with-gemini.ts`.
3. **`resolveBrand` Precedence:** Display brand names are sourced strictly from the official English client (`displaySkin.skinGroupName` in `en/skin_table.json`, with fallback to `brandListEn[brandId]?.brandName`). Chinese brand table names (`brandListCn`) are used solely as fallback for CN-only releases, ensuring English names like `Test Collection/II` or `EPOQUE` are never overwritten by Chinese terms like `时代`.
4. **`drawerList` Credit Names:** In both the CN and EN official client datasets, artist pseudonyms (`drawerList`) are proper pen names (e.g. `唯@W`, `幻象黑兔`, `infukun`, `Skade`). Yostar preserves these exact handles in the Global English release without romanization or translation. They are intentionally maintained as `string[]` to honor official developer attribution.
5. **No Logic CJK Literals:** Default appearances and store availability flags are evaluated via structural properties (`isDefaultSkin`, `skinGroupId`, `isBuySkin`, and English keyword matching) rather than hardcoded Chinese strings in `.ts` files.

## 5. Skin Price Status & Verification

In raw Arknights game data tables (`skin_table.json`), numerical skin prices in Originite Prime are **not stored as static fields**. In the Arknights client architecture, active outfit shop inventory and pricing are delivered dynamically via server-side game network packets during active store rotations (`/shop/getSkinShop`).

To maintain strict data integrity without unverified heuristics:

1. **No guessed numerical prices:** `price` is set to `null` for all entries in `data/skins.json`.
2. **Refinement fuse test:** `SkinSchema` enforces that any non-null `price` requires a non-empty `priceSource`.
3. **Verifiable status (`priceStatus`):**
   - `'default'`: default operator appearance (E0, E1, E2, class change) identified by `isDefaultSkin(skinId)`.
   - `'free'`: cosmetic outfits obtained outside the Outfit Store via event milestones, gifts, missions, Integrated Strategies, Reclamation Algorithm, or redemption codes, read from `obtainApproach`.
   - `'unknown'`: cosmetic outfits sold in the Outfit Store (`obtainApproach` contains `Store`), whose numerical price awaits an external verified source.

## 6. Asset Resolution & CDN Encoding

The `resolveAsset()` helper (`shared/utils/resolveAsset.ts`) supports all skin variants across `art`, `portrait`, and `avatar`:

- **Full artwork:** `resolveAsset('art', charId, { variant: skinId })` or `resolveAsset('art', skinId)`
  - Direct CDN path: `skin/${avatarId}b.png`
  - Fallback: half-body portrait `portrait/${avatarId}.png` -> avatar `avatar/${avatarId}.png`
- **Portrait:** `resolveAsset('portrait', skinId)` -> `portrait/${portraitId}.png`
- **Avatar:** `resolveAsset('avatar', skinId)` -> `avatar/${avatarId}.png`
- **URL Encoding:** Asset filenames containing `#` (e.g. `char_002_amiya_winter#1b.png`) are automatically percent-encoded to `%23` (`char_002_amiya_winter%231b.png`) to prevent HTTP 404 fragment truncation on CDN requests.
