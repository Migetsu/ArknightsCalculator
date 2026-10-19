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
| `brandName`      | `string \| null`                   | Full brand name (e.g. `Coral Coast`, `EPOQUE`, `Test Collection`)           |
| `drawerList`     | `string[]`                         | Credited artists / illustrators                                             |
| `description`    | `string \| null`                   | Flavor / lore description                                                   |
| `dialog`         | `string \| null`                   | Quote or dialogue line                                                      |
| `obtainApproach` | `string \| null`                   | Acquisition method (`Store`, `Event Reward`, `Quest Reward`, etc.)          |
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

## 4. Skin Price Status & Verification

In raw Arknights game data tables (`skin_table.json`), numerical skin prices in Originite Prime are **not stored as static fields**. In the Arknights client architecture, active outfit shop inventory and pricing are delivered dynamically via server-side game network packets during active store rotations (`/shop/getSkinShop`).

To maintain strict data integrity without unverified heuristics:

1. **No guessed numerical prices:** `price` is set to `null` for all entries in `data/skins.json`.
2. **Refinement fuse test:** `SkinSchema` enforces that any non-null `price` requires a non-empty `priceSource`.
3. **Verifiable status (`priceStatus`):**
   - `'default'`: default operator appearance (E0, E1, E2, class change) identified by `isDefaultSkin(skinId)`.
   - `'free'`: cosmetic outfits obtained outside the Outfit Store via event milestones, gifts, missions, Integrated Strategies, Reclamation Algorithm, or redemption codes, read directly from `obtainApproach`.
   - `'unknown'`: cosmetic outfits sold in the Outfit Store (`obtainApproach` contains `Store` / `采购中心`), whose numerical price awaits an external verified source.

## 5. Asset Resolution & CDN Encoding

The `resolveAsset()` helper (`shared/utils/resolveAsset.ts`) supports all skin variants across `art`, `portrait`, and `avatar`:

- **Full artwork:** `resolveAsset('art', charId, { variant: skinId })` or `resolveAsset('art', skinId)`
  - Direct CDN path: `skin/${avatarId}b.png`
  - Fallback: half-body portrait `portrait/${avatarId}.png` -> avatar `avatar/${avatarId}.png`
- **Portrait:** `resolveAsset('portrait', skinId)` -> `portrait/${portraitId}.png`
- **Avatar:** `resolveAsset('avatar', skinId)` -> `avatar/${avatarId}.png`
- **URL Encoding:** Asset filenames containing `#` (e.g. `char_002_amiya_winter#1b.png`) are automatically percent-encoded to `%23` (`char_002_amiya_winter%231b.png`) to prevent HTTP 404 fragment truncation on CDN requests.
