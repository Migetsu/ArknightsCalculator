# Alternative Game Data Sources & `appellation` Audit (`docs/data-source-probe.md`)

**Verification Date**: `2026-10-17` (live HTTP requests via GitHub REST API, `raw.githubusercontent.com`, and `arknights.wiki.gg/api.php`)

---

## 1. Candidate Repositories vs Current Control (Task 1)

### 1.1. Summary Comparison Matrix

| Metric / Criterion                                     | Control: `Kengxxiao/ArknightsGameData` + `Kengxxiao/ArknightsGameData_YoStar`                                                                                          | Candidate 1: `ArknightsAssets/ArknightsGamedata`                                                       | Candidate 2: `ArknightsAssets/ArknightsAssets2`                                                                                                                         | Candidate 3: `SanityGoneAK/arknights-gamedata`                                                                       |
| :----------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------- |
| **HTTP Status & URL**                                  | `200 OK` — [ArknightsGameData](https://github.com/Kengxxiao/ArknightsGameData) & [ArknightsGameData_YoStar](https://github.com/Kengxxiao/ArknightsGameData_YoStar)     | `200 OK` — [ArknightsAssets/ArknightsGamedata](https://github.com/ArknightsAssets/ArknightsGamedata)   | `200 OK` — [ArknightsAssets/ArknightsAssets2](https://github.com/ArknightsAssets/ArknightsAssets2)                                                                      | `200 OK` — [SanityGoneAK/arknights-gamedata](https://github.com/SanityGoneAK/arknights-gamedata)                     |
| **Server Locales**                                     | CN (`zh_CN`) in main repo; EN (`en_US`), JP (`ja_JP`), KR (`ko_KR`) in `_YoStar`                                                                                       | `bili`, `cn`, `en`, `jp`, `kr`, `tw` (single repo, top-level folders)                                  | Branches: `cn`, `en`, `voice` (default `master` holds only `script.py`)                                                                                                 | `cn`, `en`, `jp`, `kr`, `tw` (single repo, top-level folders)                                                        |
| **Excel JSON Path**                                    | `{locale}/gamedata/excel/*.json` (55 files)                                                                                                                            | `{locale}/gamedata/excel/*.json` (56 files)                                                            | **None** (`0` commits for `character_table.json`; binary asset dump only)                                                                                               | `{locale}/gamedata/excel/*.json` (60 files)                                                                          |
| **Default Branch HEAD**                                | CN (`master`): `bee3f83c5d60590b5e1cd42b8d09d00ce32ab10d` (`2026-10-16T08:02:27Z`)<br>EN (`main`): `57010cb5b2afea112cae57daa756b58676ba6850` (`2025-11-13T15:53:09Z`) | `master`: `db6f9ef8046ad17dbebe3ff1d0dd88844a5bc78c` (`2026-10-16T09:45:07Z`, `"Arknights update cn"`) | `master`: `8f75a5825aa8697796b87300d1516d8852753906` (`2026-02-24T12:09:25Z`)<br>`cn`: `59da436d` (`2026-10-16T13:10:34Z`)<br>`en`: `6df8f687` (`2026-10-14T15:01:49Z`) | `main`: `b5ff1ff3c389d18d8c0fcfa30735bd90f1d1ac74` (`2026-10-16T11:03:58Z`, `"update(game-data): Updated Gamedata"`) |
| **EN `character_table.json` Latest Commit**            | `57010cb5b2afea112cae57daa756b58676ba6850` (`2025-11-13T15:53:09Z`, **Frozen 11 months**)                                                                              | `3aaa25b649fed5dedad9527602826dc487ea07d8` (`2026-10-14T14:49:20Z`, `"Arknights update en"`)           | **N/A** (no JSON tables in repository)                                                                                                                                  | `a85e3a9d6ec8d07831522b21b93fd7e83164cc3c` (`2026-10-14T11:35:27Z`, `"update(game-data): Updated Gamedata"`)         |
| **Coverage of 36 Missing Global Operators**            | **0 / 36 (0%)** (376 playable EN operators total)                                                                                                                      | **36 / 36 (100%)** (444 non-token `char_*` entries in EN)                                              | **0 / 36 (N/A)** (no JSON tables)                                                                                                                                       | **36 / 36 (100%)** (444 non-token `char_*` entries in EN)                                                            |
| **Zod Schema Compatibility (`scripts/data/schemas/`)** | **11 / 11 PASS (100%)**                                                                                                                                                | **5 / 11 PASS, 6 / 11 FAIL** (empty arrays serialized as `{}` objects; `itemCost` as keyed object)     | **N/A** (no JSON tables)                                                                                                                                                | **11 / 11 PASS (100%)** (drop-in compatible with all 11 Zod schemas)                                                 |
| **Repository License**                                 | `null` (None declared)                                                                                                                                                 | `null` (None declared)                                                                                 | `null` (None declared)                                                                                                                                                  | `null` (None declared; sibling `SanityGoneAK/arknights-images` is `AGPL-3.0`)                                        |
| **Binary Assets (Icons / Art)**                        | **No** (JSON & text tables only)                                                                                                                                       | **No** (`en/gamedata/art/` contains only 5 handbook JSON files)                                        | **Yes** (`assets/dyn/arts/charavatars`, `charportraits`, `characters`, `items`, `skills`, `.png`)                                                                       | **No** (`en/graphics/` has only `CpuLadder.json`; images live in `SanityGoneAK/arknights-images`)                    |

---

### 1.2. Verifiable HTTP Citations & Quotes ($\le 15$ words)

1. **Control (`Kengxxiao/ArknightsGameData_YoStar`)**:
   - API URL: `https://api.github.com/repos/Kengxxiao/ArknightsGameData_YoStar/commits?path=en_US/gamedata/excel/character_table.json&per_page=1` (checked `2026-10-17T09:55:09Z`).
   - Quote: `"[EN UPDATE] Client:31.5.80 Data:25-11-11-08-15-40_78dbfa"` (`sha: 57010cb5b2afea112cae57daa756b58676ba6850`, `2025-11-13T15:53:09Z`).
2. **Candidate 1 (`ArknightsAssets/ArknightsGamedata`)**:
   - API URL: `https://api.github.com/repos/ArknightsAssets/ArknightsGamedata` & `https://raw.githubusercontent.com/ArknightsAssets/ArknightsGamedata/master/README.md` (checked `2026-10-17T09:55:09Z`).
   - Quote: `"Arknights resources downloaded using arkprts through Github actions."`
   - EN `character_table.json` commit URL: `https://api.github.com/repos/ArknightsAssets/ArknightsGamedata/commits?path=en/gamedata/excel/character_table.json&per_page=1` (`sha: 3aaa25b649fed5dedad9527602826dc487ea07d8`, `2026-10-14T14:49:20Z`, quote: `"Arknights update en"`).
3. **Candidate 2 (`ArknightsAssets/ArknightsAssets2`)**:
   - API URL: `https://api.github.com/repos/ArknightsAssets/ArknightsAssets2` & `https://raw.githubusercontent.com/ArknightsAssets/ArknightsAssets2/master/README.md` (checked `2026-10-17T09:55:09Z`).
   - Quote: `"Arknights Assets, see cn/en/voice branch. Dumped using ArknightsStudio"`.
   - Branch `en` commit URL: `https://api.github.com/repos/ArknightsAssets/ArknightsAssets2/commits/en` (`sha: 6df8f6877a03e16f6a1499172a8de10f0f6f773a`, `2026-10-14T15:01:49Z`, quote: `"update 26-10-03-16-06-39_0a6acf segment hot_update_list"`).
4. **Candidate 3 (`SanityGoneAK/arknights-gamedata`)**:
   - API URL: `https://api.github.com/repos/SanityGoneAK/arknights-gamedata` (checked `2026-10-17T09:55:09Z`).
   - Quote: `"Arknights Gamedata for all Servers"` (`sha: b5ff1ff3c389d18d8c0fcfa30735bd90f1d1ac74`, `2026-10-16T11:03:58Z`).
   - EN `character_table.json` commit URL: `https://api.github.com/repos/SanityGoneAK/arknights-gamedata/commits?path=en/gamedata/excel/character_table.json&per_page=1` (`sha: a85e3a9d6ec8d07831522b21b93fd7e83164cc3c`, `2026-10-14T11:35:27Z`, quote: `"update(game-data): Updated Gamedata"`).

---

### 1.3. Zod Schema Compatibility Audit (`scripts/data/schemas/index.ts`)

All 11 required EN tables were downloaded in memory on `2026-10-17` and validated via `RAW_TABLE_SCHEMAS[table].safeParse(data)`:

| Table Name                 | `SanityGoneAK/arknights-gamedata` (`en/gamedata/excel/`) | `ArknightsAssets/ArknightsGamedata` (`en/gamedata/excel/`) | Root Cause of Failure in `ArknightsAssets/ArknightsGamedata`                                                 |
| :------------------------- | :------------------------------------------------------: | :--------------------------------------------------------: | :----------------------------------------------------------------------------------------------------------- |
| `character_table.json`     |                         **PASS**                         |                          **FAIL**                          | `char_285_medic2.skills`, `allSkillLvlup`: `expected array, received object` (`{}` instead of `[]`)          |
| `skill_table.json`         |                         **PASS**                         |                          **PASS**                          | —                                                                                                            |
| `item_table.json`          |                         **PASS**                         |                          **FAIL**                          | `items["2004"].buildingProductList`, `items["3003"].stageDropList`: `expected array, received object` (`{}`) |
| `uniequip_table.json`      |                         **PASS**                         |                          **FAIL**                          | `equipDict["uniequip_002_radian"].itemCost["1"]`: `itemCost` serialized as keyed object, not array           |
| `battle_equip_table.json`  |                         **PASS**                         |                          **FAIL**                          | `uniequip_002_mgllan.phases[1].parts[1]...blackboard`: `expected array, received object` (`{}`)              |
| `building_data.json`       |                         **PASS**                         |                          **PASS**                          | —                                                                                                            |
| `gacha_table.json`         |                         **PASS**                         |                          **PASS**                          | —                                                                                                            |
| `stage_table.json`         |                         **PASS**                         |                          **FAIL**                          | `stages["guide_01"].stageDropInfo.displayDetailRewards`: `expected array, received object` (`{}`)            |
| `handbook_info_table.json` |                         **PASS**                         |                          **FAIL**                          | `handbookDict["char_503_rang"].handbookAvgList`: `expected array, received object` (`{}`)                    |
| `char_patch_table.json`    |                         **PASS**                         |                          **PASS**                          | —                                                                                                            |
| `gamedata_const.json`      |                         **PASS**                         |                          **PASS**                          | —                                                                                                            |

---

### 1.4. Coverage of the 36 Global Operators Missing in `Kengxxiao/ArknightsGameData_YoStar`

Comparing `data/i18n/global-availability.json` (`isGlobal: true`, 412 operators) against `.cache/raw/en_US/character_table.json` (374 operators + 2 Amiya class changes in `char_patch_table.json` = 376), exactly **36 Global operators** lack official EN data in `Kengxxiao/ArknightsGameData_YoStar`. Both `SanityGoneAK/arknights-gamedata` and `ArknightsAssets/ArknightsGamedata` contain **all 36 / 36 (100%)** with complete official YoStar English translations.

Below is the verification of 15 specific operator IDs from `https://raw.githubusercontent.com/SanityGoneAK/arknights-gamedata/b5ff1ff3c389d18d8c0fcfa30735bd90f1d1ac74/en/gamedata/excel/` (`character_table.json`, `skill_table.json`, `uniequip_table.json`, checked `2026-10-17`):

| Operator ID        | Official EN `name`         | Official EN `skills` (`skill_table.json`)                                                | Official EN `talents` (`character_table.json`) | Official EN `uniequip` (`uniequip_table.json`) |
| :----------------- | :------------------------- | :--------------------------------------------------------------------------------------- | :--------------------------------------------- | :--------------------------------------------- |
| `char_1043_leizi2` | `Leizi the Thunderbringer` | `Nobility Enduring`; `Shock and Awe`; `All the Thunderlight`                             | `Clarity of Judgment`; `Call to Account`       | `'Within a Thought'`                           |
| `char_1044_hsgma2` | `Hoshiguma the Breacher`   | `Bitter Karma`; `Anadi-Avidya`; `Hell Itself`                                            | `Gouka`; `Oni Battle Stance`                   | `No Trace`                                     |
| `char_1045_svash2` | `SilverAsh the Reignfrost` | `Pawn Break`; `Countergambit`; `Castled King`                                            | `Open Game`; `Snow Realm Trailblazer`          | _(No combat module yet)_                       |
| `char_1046_sbell2` | `Pramanix the Prerita`     | `Ere Snow, Bells Chime`; `Peaks, Clad in Frost`; `Towards the Mountains, Bow`            | `Unending Snows`; `Blessing of Karlan`         | `A Thousandth of A Heart`                      |
| `char_1047_halo2`  | `Astgenne the Lightchaser` | `Star Chart's Shine`; `Stellar Gravity`; `Flux Chain`                                    | `Data Modeling`; `Energy Source Analysis`      | `The Seeker's Collection`                      |
| `char_1050_chen3`  | `Ch'en the Dawnstreak`     | `Chi Xiao - Fleeting Night`; `Chi Xiao - Shadowless Speed`; `Chi Xiao - Heaven's Plaint` | `All-Seeing Eye`; `To Know Time's Flow`        | `Remnant Pages of Memory`                      |
| `char_1051_headb2` | `Zima the Raging Tide`     | `Never Bow`; `Never Surrender`; `Unstoppable`                                            | `Roiling Rage`; `Human Tide`                   | `Unissued Medal`                               |
| `char_2027_wang`   | `Wang`                     | `Power Play`; `Wall of Stars`; `All-Dominating Fight`                                    | `Mold Stones`; `Every Move Anticipated`        | `Beast-Shaped Stone Container`                 |
| `char_4037_demetr` | `Bellone`                  | `A Don's Plenty`; `An Advisor's Tricks`; `Riscossione`                                   | `The Way of the Famiglia`; `Street Smarts`     | `The Instrument`                               |
| `char_4182_oblvns` | `Sakiko Togawa`            | `New Moon Awakening`; `Full Moon Masquerade`; `Crescent Moon Echoes`                     | `Notes of Ode`; `Do Not Fear Forgetting`       | `A Silent Pact`                                |
| `char_4195_radian` | `Raidian`                  | `Periodic Waveform`; `Ring of Fins`; `Hand in Hand`                                      | `Cassette Inspiration`; `Do Your Best~`        | `Raidian's Special Operator Badge`; `Start+`   |
| `char_4202_haruka` | `Haruka`                   | `Feathers in the Night`; `Glade of the Fireflies`; `The Fins of Summer`                  | `Fleeting Foam`; `Soaring Fireworks`           | `The Belated Memorial`                         |
| `char_4204_mantra` | `Mantra`                   | `Resonance Collapse`; `Gestalt Consciousness`; `Truth Unchanted`                         | `Quiet Zone`; `Total Grasp`                    | `Central Nerve Detection Module`               |
| `char_4208_wintim` | `Snegurochka`              | `Winter's Greeting`; `Frostbite Arrow`                                                   | `Snowfield Tracker`                            | `Snegurochka's Bow`                            |
| `char_4212_nasti`  | `Nasti`                    | `'Fortify'`; `'Execute'`; `Roosting Grounds`                                             | `Construction Ahead`; `Safety First`           | `The Engineers`                                |

_(The remaining 21 of the 36 Global operators — `char_4056_titi`, `char_1022_flwr2`, `char_394_hadiya`, `char_4031_liesel`, `char_4166_varkis`, `char_4183_mortis`, `char_4184_dolris`, `char_4185_amoris`, `char_4186_tmoris`, `char_4196_reckpr`, `char_4199_makiri`, `char_4203_kichi`, `char_4207_branch`, `char_4211_snhunt`, `char_4213_skybx`, `char_4214_cairn`, `char_4221_ju`, `char_4222_taraxa`, `char_4223_botany`, `char_4224_turdus`, `char_4051_akkord` — are likewise 100% present in `SanityGoneAK/arknights-gamedata/en/gamedata/excel/character_table.json`)._

---

## 2. Audit of the `appellation` Field in CN `character_table.json` (Task 2)

### 2.1. Sample Comparison of 14 Operators (`.cache/raw/zh_CN/character_table.json` vs Official EN & `arknights.wiki.gg`)

Verified on `2026-10-17` against `.cache/raw/zh_CN/character_table.json` (commit `17759cc8`), `SanityGoneAK/arknights-gamedata` (`en/gamedata/excel/character_table.json`, commit `a85e3a9d`), and `https://arknights.wiki.gg/api.php`:

| Operator ID        | Category        | CN `name`      | CN `appellation` (Raw JSON)           | Official EN Client `name`     | `arknights.wiki.gg` Title                                       | Reliable as EN Name?    |
| :----------------- | :-------------- | :------------- | :------------------------------------ | :---------------------------- | :-------------------------------------------------------------- | :---------------------- |
| `char_1015_aglna2` | CN-Only Alter   | `予愿安洁莉娜` | `"Angelina the Mellow Wish"`          | — (Unreleased on EN)          | `Angelina the Mellow Wish`                                      | Yes (matches)           |
| `char_4226_veen`   | CN-Only New     | `维伊`         | **`"Вий"`** (Cyrillic)                | — (Unreleased on EN)          | **`Viy`** ([pageid=127621](https://arknights.wiki.gg/wiki/Viy)) | **NO (Cyrillic)**       |
| `char_4208_wintim` | Global New      | `冬时`         | **`"Снегурочка"`** (Cyrillic)         | **`"Snegurochka"`**           | **`Snegurochka`**                                               | **NO (Cyrillic)**       |
| `char_4223_botany` | Global New      | `伯塔尼`       | **`"Ботани"`** (Cyrillic)             | **`"Botani"`**                | **`Botani`**                                                    | **NO (Cyrillic)**       |
| `char_4207_branch` | Global New      | `折桠`         | **`"Веточки"`** (Cyrillic)            | **`"Vetochki"`**              | **`Vetochki`**                                                  | **NO (Cyrillic)**       |
| `char_4224_turdus` | Global New      | `乌啾`         | **`"Укусик"`** (Cyrillic)             | **`"Ukusik"`**                | **`Ukusik`**                                                    | **NO (Cyrillic)**       |
| `char_197_poca`    | Old Ursus 6★    | `早露`         | **`"Роса"`** (Cyrillic)               | **`"Rosa"`**                  | **`Rosa`**                                                      | **NO (Cyrillic)**       |
| `char_4055_bgsnow` | Old Ursus 6★    | `鸿雪`         | **`"Позёмка"`** (Cyrillic)            | **`"Pozëmka"`**               | **`Pozëmka`**                                                   | **NO (Cyrillic)**       |
| `char_115_headbr`  | Launch Ursus 5★ | `凛冬`         | **`"Зима"`** (Cyrillic)               | **`"Zima"`**                  | **`Zima`**                                                      | **NO (Cyrillic)**       |
| `char_196_sunbr`   | Launch Ursus 4★ | `古米`         | **`"Гум"`** (Cyrillic)                | **`"Gummy"`**                 | **`Gummy`**                                                     | **NO (Cyrillic)**       |
| `char_4182_oblvns` | Global Collab   | `丰川祥子`     | **`"Togawa Sakiko"`**                 | **`"Sakiko Togawa"`**         | `Togawa Sakiko`                                                 | **NO (Name order)**     |
| `char_1020_reed2`  | Global Alter    | `焰影苇草`     | **`"Reed The Flame Shadow"`**         | **`"Reed the Flame Shadow"`** | `Reed the Flame Shadow`                                         | **NO (`The` vs `the`)** |
| `char_376_therex`  | Launch 1★ Robot | `THRM-EX`      | **`"Thermal-EX"`**                    | **`"THRM-EX"`**               | `THRM-EX`                                                       | **NO (Full vs abbr.)**  |
| `char_183_skgoat`  | Launch 4★       | `地灵`         | **`"Earthspirit "`** (trailing space) | **`"Earthspirit"`**           | `Earthspirit`                                                   | **NO (Trailing space)** |

### 2.2. Complete Taxonomy of `appellation` Failures Across All 434 Operators

Across the 434 playable operators in `.cache/raw/zh_CN/character_table.json`, `appellation` diverges from the official English name in **5 distinct ways**:

1. **Non-Latin Script (11 Ursus Operators in Cyrillic)**:
   - Hypergryph uses `appellation` as an in-universe foreign-language subtitle on CN operator cards. For Ursus operators (`char_115_headbr` `"Зима"`, `char_194_leto` `"Лето"`, `char_195_glassb` `"Истина"`, `char_196_sunbr` `"Гум"`, `char_197_poca` `"Роса"`, `char_4055_bgsnow` `"Позёмка"`, `char_4207_branch` `"Веточки"`, `char_4208_wintim` `"Снегурочка"`, `char_4223_botany` `"Ботани"`, `char_4224_turdus` `"Укусик"`, `char_4226_veen` `"Вий"`), `appellation` contains Russian Cyrillic rather than English. Because `Kengxxiao/ArknightsGameData_YoStar` was frozen on `2025-11-13`, falling back to `appellation` leaked Cyrillic strings (`"Снегурочка"`, `"Ботани"`, `"Веточки"`, `"Укусик"`) into our EN dataset!
2. **Empty Strings (`""`)**:
   - Class-change operators in `char_patch_table.json` (`char_1001_amiya2`, `char_1037_amiya3`) have `appellation: ""`.
3. **Trailing Whitespace (5 Operators)**:
   - `char_183_skgoat` (`"Earthspirit "`), `char_187_ccheal` (`"Gavial "`), `char_190_clour` (`"Mousse "`), `char_241_panda` (`"FEater "`), `char_290_vigna` (`"Vigna "`).
4. **Casing, Spacing, and Quote Differences (6 Operators)**:
   - `char_1020_reed2` (`"Reed The Flame Shadow"` vs `"Reed the Flame Shadow"`), `char_1036_fang2` (`"Fang the Fire-sharpened"` vs `"Fang the Fire-Sharpened"`), `char_455_nothin` (`"Mr.Nothing"` vs `"Mr. Nothing"`), `char_118_yuki` (`"ShiraYuki"` vs `"Shirayuki"`), `char_376_therex` (`"Thermal-EX"` vs `"THRM-EX"`), `char_4000_jnight` (`"\"Justice Knight\""` vs `'Justice Knight'`).
5. **Japanese Collab Name Ordering (5 Ave Mujica Operators)**:
   - `char_4182_oblvns` (`"Togawa Sakiko"` in CN `appellation` vs `"Sakiko Togawa"` in official YoStar EN), `char_4183_mortis`, `char_4184_dolris`, `char_4185_amoris`, `char_4186_tmoris`.

**Conclusion on `appellation`**: `appellation` **cannot** be treated as a reliable source of English operator names without validation (at minimum, rejecting non-ASCII/Cyrillic strings, trimming whitespace, and prioritizing official EN client data + `arknights.wiki.gg`).

---

## 3. Engineering Verdict & Recommended Architecture

1. **Switch the Primary Official EN Source from `Kengxxiao/ArknightsGameData_YoStar` to `SanityGoneAK/arknights-gamedata`**:
   - `Kengxxiao/ArknightsGameData_YoStar` has been abandoned since `2025-11-13` (missing 36 Global operators and all recent events/modules).
   - **`SanityGoneAK/arknights-gamedata`** is actively maintained (`2026-10-14` EN client update, `2026-10-16` repo HEAD), contains **all 36/36 missing Global operators** with official YoStar EN names, skill names/descriptions, talents, and modules, and passes **11/11 of our existing Zod schemas** without a single schema change (only changing `repo: 'SanityGoneAK/arknights-gamedata'` and `locale: 'en'` in `scripts/data/sources.config.ts`).
   - Do **not** use `ArknightsAssets/ArknightsGamedata` as primary EN source because its `arkprts` FlatBuffer serializer converts empty JSON arrays into `{}` objects and array dicts into numeric-keyed objects, failing 6 of our 11 Zod schemas.
2. **Keep `Kengxxiao/ArknightsGameData` (`zh_CN`) + `arknights.wiki.gg` for CN-Only Content**:
   - Keep `Kengxxiao/ArknightsGameData` (`zh_CN`) as the canonical full-roster source (434 operators) and `arknights.wiki.gg` (CC-BY-SA 4.0) as the translation layer for the 22 unreleased CN-only operators (e.g., `char_4226_veen` $\to$ `Viy`).
3. **Restrict `appellation` Usage**:
   - Only use `appellation.trim()` as a last-resort fallback when both the official EN client and `arknights.wiki.gg` lack an entry, and strictly guard it with `/^[\x20-\x7E\u00C0-\u024F]+$/` so Cyrillic/non-Latin subtitles never leak into English UI.
