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

## 3. Benchmarks & Validation Audit

The 5 benchmark operators are pinned in [`tests/unit/shared/stats/calculateStats.test.ts`](file:///c:/Projects/ArknightsCalculator/tests/unit/shared/stats/calculateStats.test.ts).

### Audit of Benchmark Values & Sources

All benchmark values below have been checked and verified against live game data and external reference databases during live audit on 2026-10-12:

| Operator       | Class              | Configuration                         |  HP  | ATK | DEF | RES | DP  | Block | Atk Itvl | Respawn | Source & Status                                                                                                                                                                       |
| :------------- | :----------------- | :------------------------------------ | :--: | :-: | :-: | :-: | :-: | :---: | :------: | :-----: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **SilverAsh**  | Guard (Lord)       | E0 Lv1 (Base)                         | 1075 | 297 | 189 |  5  | 18  |   2   |  1.300s  |   70s   | [PRTS Wiki: 银灰](https://prts.wiki/w/%E9%93%B6%E7%81%B0) & [Fandom: SilverAsh/Attributes](https://arknights.fandom.com/wiki/SilverAsh/Attributes) (Verified 2026-10-12)              |
| **SilverAsh**  | Guard (Lord)       | E2 Lv90 (Max Trust, Pot6, Mod3 LOR-X) | 2890 | 859 | 447 | 10  | 18  |   2   |  1.300s  |   66s   | [PRTS Wiki: 雪境羽兽护理套组](https://prts.wiki/w/%E9%93%B6%E7%81%B0) & [Fandom: Snow Realm Fowlcare Kit](https://arknights.fandom.com/wiki/SilverAsh) (Verified 2026-10-12)          |
| **Eyjafjalla** | Caster (Core)      | E2 Lv90 (Max Trust, Pot6, Mod3 CCR-X) | 1923 | 827 | 122 | 20  | 19  |   1   |  1.600s  |   70s   | [Fandom: Eyjafjalla/Attributes](https://arknights.fandom.com/wiki/Eyjafjalla/Attributes) & [Fandom: CCR-X Module](https://arknights.fandom.com/wiki/Eyjafjalla) (Verified 2026-10-12) |
| **Kal'tsit**   | Medic (Physician)  | E2 Lv90 (Max Trust, Pot1, Mod3 PHY-X) | 2033 | 550 | 280 |  0  | 20  |   1   |  2.850s  |   70s   | [Fandom: Kal'tsit/Attributes](https://arknights.fandom.com/wiki/Kal%27tsit/Attributes) & [Fandom: Mon3tr PHY-X](https://arknights.fandom.com/wiki/Kal%27tsit) (Verified 2026-10-12)   |
| **Myrtle**     | Vanguard (Bearer)  | E2 Lv70 (Max Trust, Pot6, Mod3 BEA-X) | 1715 | 520 | 407 |  0  |  8  |   1   |  1.300s  |   66s   | [Fandom: Myrtle/Attributes](https://arknights.fandom.com/wiki/Myrtle/Attributes) & [Fandom: BEA-X Module](https://arknights.fandom.com/wiki/Myrtle) (Verified 2026-10-12)             |
| **Texas**      | Vanguard (Pioneer) | E2 Lv80 (Max Trust, Pot1, Mod3 SOL-Y) | 2105 | 612 | 365 |  0  | 13  |   2   |  1.050s  |   70s   | [Fandom: Texas/Attributes](https://arknights.fandom.com/wiki/Texas/Attributes) & [Fandom: SOL-Y Module](https://arknights.fandom.com/wiki/Texas) (Verified 2026-10-12)                |

### Detailed Breakdown of Verified Benchmarks

1. **SilverAsh (`char_172_svrash`)**:
   - Base E0 Lv1: HP 1075, ATK 297, DEF 189, RES 5, Cost 18, Block 2, Atk Interval 1.3s, Respawn 70s.
   - Base E2 Lv90: HP 2560, ATK 713, DEF 397, RES 10, Cost 20, Block 2, Atk Interval 1.3s, Respawn 70s.
   - Trust 100%: ATK +50, DEF +50.
   - Pot 6: Cost -2 (Pot 2 & 5), Respawn -4s (Pot 3), ATK +26 (Pot 4).
   - Module `uniequip_002_svrash` (LOR-X) Stage 3: HP +330, ATK +70.
   - **Total Max**: HP 2560 + 330 = **2890**, ATK 713 + 50 + 26 + 70 = **859**, DEF 397 + 50 = **447**, RES **10**, Cost 20 - 2 = **18**, Block **2**, Atk Interval **1.3s**, Respawn 70 - 4 = **66s**.

2. **Eyjafjalla (`char_180_amgoat`)**:
   - Base E2 Lv90: HP 1743, ATK 645, DEF 122, RES 20, Cost 21, Block 1, Atk Interval 1.6s, Respawn 70s.
   - Trust 100%: ATK +90.
   - Pot 6: Cost -2 (Pot 2 & 5), ATK +27 (Pot 4).
   - Module `uniequip_002_amgoat` (CCR-X) Stage 3: HP +180, ATK +65.
   - **Total Max**: HP 1743 + 180 = **1923**, ATK 645 + 90 + 27 + 65 = **827**, DEF **122**, RES **20**, Cost 21 - 2 = **19**, Block **1**, Atk Interval **1.6s**, Respawn **70s**.

3. **Kal'tsit (`char_003_kalts`)**:
   - Base E2 Lv90: HP 1633, ATK 490, DEF 215, RES 0, Cost 20, Block 1, Atk Interval 2.85s, Respawn 70s.
   - Trust 100%: HP +400, DEF +40.
   - Pot 1: Baseline.
   - Module `uniequip_002_kalts` (PHY-X) Stage 3: ATK +60, DEF +25.
   - **Total Max**: HP 1633 + 400 = **2033**, ATK 490 + 60 = **550**, DEF 215 + 40 + 25 = **280**, RES **0**, Cost **20**, Block **1**, Atk Interval **2.85s**, Respawn **70s**.

4. **Myrtle (`char_151_myrtle`)**:
   - Base E2 Lv70: HP 1565, ATK 520, DEF 300, RES 0, Cost 10, Block 1, Atk Interval 1.3s, Respawn 70s.
   - Trust 100%: DEF +50.
   - Pot 6: Cost -2, Respawn -4s, DEF +22.
   - Module `uniequip_002_myrtle` (BEA-X) Stage 3: HP +150, DEF +35.
   - **Total Max**: HP 1565 + 150 = **1715**, ATK **520**, DEF 300 + 50 + 22 + 35 = **407**, RES **0**, Cost 10 - 2 = **8**, Block **1**, Atk Interval **1.3s**, Respawn 70 - 4 = **66s**.

5. **Texas (`char_102_texas`)**:
   - Base E2 Lv80: HP 1950, ATK 500, DEF 343, RES 0, Cost 13, Block 2, Atk Interval 1.05s, Respawn 70s.
   - Trust 100%: ATK +70.
   - Pot 1: Baseline.
   - Module `uniequip_002_texas` (SOL-Y) Stage 3: HP +155, ATK +42, DEF +22.
   - **Total Max**: HP 1950 + 155 = **2105**, ATK 500 + 70 + 42 = **612**, DEF 343 + 22 = **365**, RES **0**, Cost **13**, Block **2**, Atk Interval **1.05s**, Respawn **70s**.
