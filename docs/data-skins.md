# Operator Skins Data Pipeline (`data/skins.json`)

## 1. Overview

The operator skins pipeline ingests `skin_table.json` from upstream game data (`SanityGoneAK/arknights-gamedata`), normalizes metadata across CN and EN sources, resolves names and descriptions via the layered i18n system, deterministically calculates Originite Prime store costs, and provides asset resolution for illustrations, portraits, and avatars.

## 2. Source Configuration

`skin_table.json` is registered in `scripts/data/sources.config.ts`:

- **Repository:** `SanityGoneAK/arknights-gamedata`
- **Commit:** `b5ff1ff3c389d18d8c0fcfa30735bd90f1d1ac74`
- **Paths:**
  - `cn/gamedata/excel/skin_table.json` (4.54 MB raw)
  - `en/gamedata/excel/skin_table.json` (4.11 MB raw)

Cached locally in `.cache/raw/{cn,en}/skin_table.json` via `npm run data:fetch`.

## 3. Zod Schema (`shared/schemas/skin.ts`)

| Field            | Type               | Description                                                               |
| :--------------- | :----------------- | :------------------------------------------------------------------------ |
| `skinId`         | `string`           | Unique identifier (e.g. `char_102_texas@summer#1`, `char_002_amiya#1`)    |
| `charId`         | `string`           | Parent operator ID (e.g. `char_102_texas`)                                |
| `skinName`       | `I18nString`       | Layered localized name (`en`, `zh`, `source`, `isMachineTranslation`)     |
| `brandId`        | `string \| null`   | Fashion brand tag (e.g. `sale`, `epoque`, `summer`, `winter`, `boc`)      |
| `brandName`      | `string \| null`   | Full brand name (e.g. `Coral Coast`, `EPOQUE`, `Test Collection`)         |
| `drawerList`     | `string[]`         | Credited artists / illustrators                                           |
| `description`    | `string \| null`   | Flavor / lore description                                                 |
| `dialog`         | `string \| null`   | Quote or dialogue line                                                    |
| `obtainApproach` | `string \| null`   | Acquisition method (`Store`, `Event Reward`, `Quest Reward`, etc.)        |
| `isBuySkin`      | `boolean`          | Store outfit indicator from game data                                     |
| `price`          | `number \| null`   | Cost in Originite Prime (24, 21, 18, 15), or `null` for non-store outfits |
| `currency`       | `string \| null`   | `'ORIGINITE_PRIME'` when price is defined, else `null`                    |
| `illustId`       | `string`           | Asset ID for full character illustration                                  |
| `avatarId`       | `string`           | Asset ID for square icon                                                  |
| `portraitId`     | `string`           | Asset ID for half-body portrait                                           |
| `isCnOnly`       | `boolean`          | `true` if present only in CN `skin_table.json`                            |
| `servers`        | `('cn' \| 'en')[]` | Server availability list (`['cn']` or `['cn', 'en']`)                     |

## 4. Skin Price Determination

In raw Arknights game data tables, numeric skin prices are **not stored as static fields** in `skin_table.json` or `shop_client_table.json`; instead, store rotations and purchases are managed dynamically by the game server packet protocol (`/shop/getSkinShop`).

To support cost calculation for planners and inventory, prices are derived via deterministic rules implemented in `shared/utils/skin.ts`:

1. **Free / Milestone / Reward Outfits (`price = null`):**
   - Outfits where `isBuySkin === false` (e.g. default E0/E1/E2 sprites).
   - Outfits where `obtainApproach` indicates a reward (`Event Reward`, `Quest Reward`, `Event Gift`, `Integrated Strategies`, `Reclamation Algorithm`, special packs).
2. **Dynamic 24 OP Outfits (`price = 24, currency = 'ORIGINITE_PRIME'`):**
   - Live2D / dynamic outfits featuring custom deployment entrance animations (`dynEntranceId !== null`) or dynamic voice lines (`dynIllustId !== null && voiceType === 'ALL'`).
3. **Live2D 21 OP Outfits (`price = 21, currency = 'ORIGINITE_PRIME'`):**
   - Standard Live2D / dynamic outfits (`dynIllustId !== null`, `dynEntranceId === null`).
4. **Early 15 OP Outfits (`price = 15, currency = 'ORIGINITE_PRIME'`):**
   - Early cosmetic outfits without custom combat/particle effects (cataloged in `KNOWN_15_OP_SKIN_IDS`).
5. **Standard 18 OP Outfits (`price = 18, currency = 'ORIGINITE_PRIME'`):**
   - Standard store outfits featuring custom combat models and skill animations.

## 5. Asset Resolution & CDN Encoding

The `resolveAsset()` helper (`shared/utils/resolveAsset.ts`) supports all skin variants across `art`, `portrait`, and `avatar`:

- **Full artwork:** `resolveAsset('art', charId, { variant: skinId })` or `resolveAsset('art', skinId)`
  - Direct CDN path: `skin/${avatarId}b.png`
  - Fallback: half-body portrait `portrait/${avatarId}.png` -> avatar `avatar/${avatarId}.png`
- **Portrait:** `resolveAsset('portrait', skinId)` -> `portrait/${portraitId}.png`
- **Avatar:** `resolveAsset('avatar', skinId)` -> `avatar/${avatarId}.png`
- **URL Encoding:** Asset filenames containing `#` (e.g. `char_002_amiya_winter#1b.png`) are automatically percent-encoded to `%23` (`char_002_amiya_winter%231b.png`) to prevent HTTP 404 fragment truncation on CDN requests.
