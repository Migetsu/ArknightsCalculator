# Operator Stats Calculation Architecture & Engine

## 1. Overview

The operator stats calculation core is implemented as a pure, deterministic mathematical module in [`shared/utils/stats/calculateStats.ts`](file:///c:/Projects/ArknightsCalculator/shared/utils/stats/calculateStats.ts). It has zero network, filesystem, Vue, or Pinia dependencies.

Given an `OperatorDetail` instance and configuration options (`elite`, `level`, `trust`, `potential`, and optional `module`), it calculates:

- Primary combat stats: **HP, ATK, DEF, RES, Cost (DP), Block**
- Attack interval & timers: **baseAttackTime (seconds), attackSpeed (ASPD modifier), attackInterval (effective seconds), respawnTime (seconds)**
- Detailed breakdown across individual contribution sources: **`base`, `trust`, `potential`, `module`**

---

## 2. Mathematical Equations & Progression Rules

### 2.1 Base Attributes (Linear Interpolation)

Between level keyframes for the given elite phase (typically level 1 and the phase maximum level):

$$t = \frac{\text{level} - \text{level}_{\min}}{\text{level}_{\max} - \text{level}_{\min}}$$

$$\text{stat}_{\text{base}} = \text{round}\left(\text{stat}_{\min} + (\text{stat}_{\max} - \text{stat}_{\min}) \times t\right)$$

- Evaluated for **HP, ATK, DEF**.
- Constants across levels within the elite phase: **magicResistance, cost, blockCnt, baseAttackTime, respawnTime**.

### 2.2 Elite Limits & Level Validation

- **Elite Limits by Rarity**:
  - 1★ and 2★ operators only possess Elite 0 (e.g., Lancet-2, Yato; maximum phase: 0).
  - 3★ operators only possess Elite 0 and Elite 1 (e.g., Fang, Kroos; maximum phase: 1, no Elite 2).
  - 4★, 5★, and 6★ operators possess Elite 0, Elite 1, and Elite 2 (maximum phase: 2).
- **Strict Validation**:
  - Requesting an unavailable elite phase throws an explicit validation error:
    `Invalid elite phase {elite} for operator {id} (max phase: {maxPhase})`.
  - Requesting a level above the phase maximum throws an explicit validation error:
    `Invalid level {level} for operator {id} at elite {elite} (must be between 1 and {maxLevel})`.
  - Levels are **never silently clamped** in the core; invalid inputs are rejected deterministically.

### 2.3 Trust Scaling & Favor Frames

- In client data (`character_table.json`), trust bonuses are stored in `favorKeyFrames`:
  - `favorKeyFrames[0]` represents 0 favor points / 0% Trust (`data: {}`).
  - `favorKeyFrames[1]` represents max favor bonus points (`level: 50` in data, corresponding to 100% Trust in UI).
- In Arknights, player Trust ranges from 0% to 200%. However, attribute bonuses cap entirely at **100% Trust**:
  $$\text{stat}_{\text{trust}} = \text{round}\left(\text{favorBonus}_{\max} \times \frac{\min(100, \text{trust})}{100}\right)$$
- Going from 100% to 200% Trust provides dialogue and profile milestone unlocks, and guarantees full stats when used as a friend support unit (which halves displayed trust), but yields no additional combat stats.

### 2.4 Potential Bonuses

Potential levels range from 1 to 6:

- **Potential 1**: Baseline (0 bonus ranks applied).
- **Potential 2–6**: Cumulatively unlocks stat modifiers in `potentialRanks[0]` through `potentialRanks[potential - 2]`.
- Buff descriptions in EN and ZH are parsed into attribute modifiers:
  - `ATK +X` / `攻击力+X`
  - `DEF +X` / `防御力+X`
  - `Max HP +X` / `生命上限+X`
  - `RES +X` / `法术抗性+X`
  - `DP Cost -X` / `部署费用-X`
  - `Redeployment Time -X sec` / `再部署时间-X秒`
  - `ASPD +X` / `Attack Speed +X` / `攻击速度+X`

### 2.5 Module Combat Stats

When a combat module is selected and upgraded to stage $S \in \{1, 2, 3\}$:

- The absolute stage combat statistics from `module.stages[S - 1].stats` are applied to HP, ATK, DEF, RES, Cost, Block, Base Attack Time, Attack Speed, and Respawn Time.

### 2.6 Effective Attack Interval & Attack Speed (ASPD)

The effective attack interval in seconds factors in total Attack Speed (ASPD) modifiers:

$$\text{effectiveSpeed} = \max(10, 100 + \text{ASPD}_{\text{total}})$$

$$\text{attackInterval} = \frac{\text{baseAttackTime} \times 100}{\text{effectiveSpeed}}$$

- Standard baseline ASPD is 100 (bonus = 0).
- An ASPD bonus of +5 increases attack speed to 105, reducing the effective interval accordingly.

### 2.7 Total Aggregation

$$\text{stat}_{\text{total}} = \text{stat}_{\text{base}} + \text{stat}_{\text{trust}} + \text{stat}_{\text{potential}} + \text{stat}_{\text{module}}$$

---

## 3. Component-Level Benchmarks & Validation Audit

The 5 benchmark operators are tested in [`tests/unit/shared/stats/calculateStats.test.ts`](file:///c:/Projects/ArknightsCalculator/tests/unit/shared/stats/calculateStats.test.ts).
Every single component below (Base on Elite/Level, 100% Trust, Potentials 1–6, Module Stage 3) was verified through live network requests on **2026-10-12** from official and community primary reference sources ([arknights.wiki.gg](https://arknights.wiki.gg) and [prts.wiki](https://prts.wiki)).
The calculation engine sums these verified components dynamically.

### 3.1 Component Breakdown Table (Verified 2026-10-12)

| Operator & Source                                                                                                                                                                                        | Component                                                                                                                          |                      HP                      |                        ATK                        |                        DEF                        |                 RES                  |                    DP Cost                    |               Block               |                 Atk Interval                  |                     Respawn                     |
| :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------: | :-----------------------------------------------: | :-----------------------------------------------: | :----------------------------------: | :-------------------------------------------: | :-------------------------------: | :-------------------------------------------: | :---------------------------------------------: |
| **SilverAsh** (`char_172_svrash`)<br>[arknights.wiki.gg/wiki/SilverAsh](https://arknights.wiki.gg/wiki/SilverAsh)<br>[prts.wiki/w/银灰](https://prts.wiki/w/%E9%93%B6%E7%81%B0)                          | (a) Base E0 Lv1<br>(a) Base E2 Lv90<br>(b) Trust 100%<br>(c) Pot 2–6<br>(d) Mod3 (LOR-X)<br>**Result: E2 Lv90 Max**                | 1075<br>2560<br>+0<br>+0<br>+330<br>**2890** | 297<br>713<br>+50<br>+26 (Pot4)<br>+70<br>**859** |     189<br>397<br>+50<br>+0<br>+0<br>**447**      | 5<br>10<br>+0<br>+0<br>+0<br>**10**  | 18<br>20<br>+0<br>-2 (Pot2,6)<br>+0<br>**18** | 2<br>2<br>+0<br>+0<br>+0<br>**2** | 1.30s<br>1.30s<br>+0<br>+0<br>+0<br>**1.30s** | 70s<br>70s<br>+0<br>-4s (Pot3)<br>+0<br>**66s** |
| **Eyjafjalla** (`char_180_amgoat`)<br>[arknights.wiki.gg/wiki/Eyjafjalla](https://arknights.wiki.gg/wiki/Eyjafjalla)<br>[prts.wiki/w/艾雅法拉](https://prts.wiki/w/%E8%89%BE%E9%9B%85%E6%B3%95%E6%8B%89) | (a) Base E0 Lv1<br>(a) Base E2 Lv90<br>(b) Trust 100%<br>(c) Pot 2–6<br>(d) Mod3 (CCR-X)<br>**Result: E2 Lv90 Max**                | 732<br>1743<br>+0<br>+0<br>+180<br>**1923**  | 292<br>645<br>+90<br>+27 (Pot4)<br>+65<br>**827** |      46<br>122<br>+0<br>+0<br>+0<br>**122**       | 10<br>20<br>+0<br>+0<br>+0<br>**20** | 19<br>21<br>+0<br>-2 (Pot2,5)<br>+0<br>**19** | 1<br>1<br>+0<br>+0<br>+0<br>**1** | 1.60s<br>1.60s<br>+0<br>+0<br>+0<br>**1.60s** |     70s<br>70s<br>+0<br>+0<br>+0<br>**70s**     |
| **Kal'tsit** (`char_003_kalts`)<br>[arknights.wiki.gg/wiki/Kal%27tsit](https://arknights.wiki.gg/wiki/Kal%27tsit)<br>[prts.wiki/w/凯尔希](https://prts.wiki/w/%E5%87%AF%E5%B0%94%E5%B8%8C)               | (a) Base E0 Lv1<br>(a) Base E2 Lv90<br>(b) Trust 100%<br>(c) Pot 2–6<br>(d) Mod3 (PHY-X)<br>**Result: E2 Lv90 Trust100 Pot1 Mod3** | 865<br>1633<br>+400<br>+0<br>+0<br>**2033**  |  167<br>490<br>+0<br>+0 (Pot1)<br>+60<br>**550**  |     94<br>215<br>+40<br>+0<br>+25<br>**280**      |  0<br>0<br>+0<br>+0<br>+0<br>**0**   |  18<br>20<br>+0<br>+0 (Pot1)<br>+0<br>**20**  | 1<br>1<br>+0<br>+0<br>+0<br>**1** | 2.85s<br>2.85s<br>+0<br>+0<br>+0<br>**2.85s** | 70s<br>70s<br>+0<br>+0 (Pot1)<br>+0<br>**70s**  |
| **Myrtle** (`char_151_myrtle`)<br>[arknights.wiki.gg/wiki/Myrtle](https://arknights.wiki.gg/wiki/Myrtle)<br>[prts.wiki/w/桃金娘](https://prts.wiki/w/%E6%A1%83%E9%87%91%E5%A8%98)                        | (a) Base E0 Lv1<br>(a) Base E2 Lv70<br>(b) Trust 100%<br>(c) Pot 2–6<br>(d) Mod3 (BEA-X)<br>**Result: E2 Lv70 Max**                | 658<br>1565<br>+0<br>+0<br>+150<br>**1715**  |      231<br>520<br>+0<br>+0<br>+0<br>**520**      | 138<br>300<br>+50<br>+22 (Pot4)<br>+35<br>**407** |  0<br>0<br>+0<br>+0<br>+0<br>**0**   |  8<br>10<br>+0<br>-2 (Pot2,6)<br>+0<br>**8**  | 1<br>1<br>+0<br>+0<br>+0<br>**1** | 1.30s<br>1.30s<br>+0<br>+0<br>+0<br>**1.30s** | 70s<br>70s<br>+0<br>-4s (Pot3)<br>+0<br>**66s** |
| **Texas** (`char_102_texas`)<br>[arknights.wiki.gg/wiki/Texas](https://arknights.wiki.gg/wiki/Texas)<br>[prts.wiki/w/德克萨斯](https://prts.wiki/w/%E5%BE%B7%E5%85%8B%E8%90%A8%E6%96%AF)                 | (a) Base E0 Lv1<br>(a) Base E2 Lv80<br>(b) Trust 100%<br>(c) Pot 2–6<br>(d) Mod3 (SOL-Y)<br>**Result: E2 Lv80 Trust100 Pot1 Mod3** | 727<br>1950<br>+0<br>+0<br>+155<br>**2105**  | 203<br>500<br>+70<br>+0 (Pot1)<br>+42<br>**612**  |     139<br>343<br>+0<br>+0<br>+22<br>**365**      |  0<br>0<br>+0<br>+0<br>+0<br>**0**   |  11<br>13<br>+0<br>+0 (Pot1)<br>+0<br>**13**  | 2<br>2<br>+0<br>+0<br>+0<br>**2** | 1.05s<br>1.05s<br>+0<br>+0<br>+0<br>**1.05s** | 70s<br>70s<br>+0<br>+0 (Pot1)<br>+0<br>**70s**  |

---

## 4. Subclass Module Codes (SOL-Y, BEA-X, etc.)

In Arknights game data (`uniequip_table.json` and `battle_equip_table.json`):

- `typeName1` represents the 3-letter archetype / subclass code:
  - `SOL` = Pioneer / Soldier Vanguard (e.g. Texas `uniequip_002_texas` -> `SOL-Y`)
  - `BEA` = Standard Bearer / Bearer Vanguard (e.g. Myrtle `uniequip_002_myrtle` -> `BEA-X`)
  - `LOR` = Lord Guard (e.g. SilverAsh `uniequip_002_svrash` -> `LOR-X`)
  - `CCR` = Core Caster (e.g. Eyjafjalla `uniequip_002_amgoat` -> `CCR-X`, `uniequip_003_amgoat` -> `CCR-Y`)
  - `PHY` = Physician Medic (e.g. Kal'tsit `uniequip_002_kalts` -> `PHY-X`)
- `typeName2` represents the module branch (`X`, `Y`, `Δ` / `A`).
- The calculation engine looks up module attributes by `module.id` and resolves the specific stage index $S - 1$, guaranteeing 100% fidelity with the underlying game data regardless of display notation.

---

## 5. Chunk Size & Transfer Performance Analysis

### 5.1 Artifact & Chunk Comparison

| Operator                          | Raw JSON (`data/operators/*.json`) | Server Chunk (`.output/server/...mjs`) | Client Chunk (`.output/public/_nuxt/*.js`) | Gzip Transfer (Client JS) |
| :-------------------------------- | :--------------------------------: | :------------------------------------: | :----------------------------------------: | :-----------------------: |
| **SilverAsh** (`char_172_svrash`) |        55.03 KB (56,349 B)         |          57.09 KB (58,456 B)           |            33.49 KB (34,295 B)             |   **7.35 KB** (7,347 B)   |
| **Myrtle** (`char_151_myrtle`)    |        40.14 KB (41,100 B)         |          40.77 KB (41,745 B)           |            23.89 KB (24,466 B)             |   **6.26 KB** (6,258 B)   |
| **Logos** (`char_4133_logos`)     |        86.41 KB (88,479 B)         |          96.73 KB (99,051 B)           |            59.42 KB (60,851 B)             |  **13.22 KB** (13,224 B)  |

### 5.2 Why Server/Client Chunks Differ from Raw JSON

1. **Server MJS vs Raw JSON**: The server bundle includes the full operator data converted to a JS module export plus module wrappers and metadata (`+2–10 KB` overhead).
2. **Client JS vs Raw JSON**: The Vite/Rollup production build strips non-essential server fields, minifies property keys, and converts JSON structures into optimized JavaScript literals. This results in the client-side JavaScript chunk being **~30–40% smaller** than the raw uncompressed JSON file on disk, compressing down to merely **6–13 KB over the wire (gzip)**.

### 5.3 Simulated Mobile Profile (Slow 4G / CPU 4x Throttling)

Measured on the local Nuxt agent server (port 3001) under simulated mobile constraints:

- **SilverAsh**: DomContentLoaded: 9,838 ms (cold page with base bundle loading), FCP: 8,248 ms, Transferred JS: 445 KB (entire app framework + operator chunk).
- **Myrtle (subsequent route navigation)**: DomContentLoaded: 2,123 ms, FCP: 1,936 ms, Transferred JS: 238 KB.
- **Logos (subsequent route navigation)**: DomContentLoaded: 2,143 ms, FCP: 1,960 ms, Transferred JS: 382 KB.
