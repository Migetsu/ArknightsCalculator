# Operator Stats Calculation Architecture & Engine

## 1. Overview

The operator stats calculation core is implemented as a pure, deterministic mathematical module in [`shared/utils/stats/calculateStats.ts`](file:///C:/Projects/ArknightsCalculator/shared/utils/stats/calculateStats.ts). It has zero network, filesystem, Vue, or Pinia dependencies.

Given an `OperatorDetail` instance and configuration options (`elite`, `level`, `trust`, `potential`, and optional `module`), it calculates:

- Primary combat stats: **HP, ATK, DEF, RES, Cost, Block**
- Attack interval & timers: **baseAttackTime (seconds), respawnTime (seconds)**
- Detailed breakdown across individual contribution sources: **`base`, `trust`, `potential`, `module`**

---

## 2. Mathematical Equations & Progression Rules

### 2.1 Base Attributes (Linear Interpolation)

Between level keyframes for the given elite phase (typically level 1 and the phase maximum level):

$$t = \frac{\text{level} - \text{level}_{\min}}{\text{level}_{\max} - \text{level}_{\min}}$$

$$\text{stat}_{\text{base}} = \text{round}\left(\text{stat}_{\min} + (\text{stat}_{\max} - \text{stat}_{\min}) \times t\right)$$

- Evaluated for **HP, ATK, DEF**.
- Constants across levels within the elite phase: **magicResistance, cost, blockCnt, baseAttackTime, respawnTime**.

### 2.2 Trust Scaling

Trust percentage ranges from 0% to 100%:

$$\text{stat}_{\text{trust}} = \text{round}\left(\text{favorBonus}_{\max} \times \frac{\text{trust}}{100}\right)$$

### 2.3 Potential Bonuses

Potential levels range from 1 to 6:

- **Potential 1**: Baseline (0 bonus ranks applied).
- **Potential 2–6**: Cumulatively unlocks stat modifiers in `potentialRanks[0]` through `potentialRanks[potential - 2]`.
- Buff descriptions in EN and ZH (e.g. `ATK +26`, `DP Cost -1`, `Redeployment Time -4 sec`, `DEF +22`, `Max HP +180`, `RES +5`) are parsed into attribute modifiers.

### 2.4 Module Combat Stats

When a combat module is selected and upgraded to stage $S \in \{1, 2, 3\}$:

- The absolute stage combat statistics from `module.stages[S - 1].stats` are applied to HP, ATK, DEF, RES, Cost, Block, and Respawn Time.

### 2.5 Total Aggregation

$$\text{stat}_{\text{total}} = \text{stat}_{\text{base}} + \text{stat}_{\text{trust}} + \text{stat}_{\text{potential}} + \text{stat}_{\text{module}}$$

---

## 3. Benchmarks & Validation Against PRTS / Terra Wiki

All five benchmark operators are pinned in [`tests/unit/shared/stats/calculateStats.test.ts`](file:///C:/Projects/ArknightsCalculator/tests/unit/shared/stats/calculateStats.test.ts):

| Operator       | Class              | Configuration                   |  HP  | ATK | DEF | RES | DP  | Block | Attack Interval | Redeploy |
| :------------- | :----------------- | :------------------------------ | :--: | :-: | :-: | :-: | :-: | :---: | :-------------: | :------: |
| **SilverAsh**  | Guard (Lord)       | E0 Lv1 (Base)                   | 1075 | 297 | 189 |  5  | 18  |   2   |      1.3s       |   70s    |
| **SilverAsh**  | Guard (Lord)       | E2 Lv90 (Max Trust, Pot6, Mod3) | 2890 | 859 | 447 | 10  | 18  |   2   |      1.3s       |   66s    |
| **Eyjafjalla** | Caster (Core)      | E2 Lv90 (Max Trust, Pot6, Mod3) | 1923 | 827 | 122 | 20  | 19  |   1   |      1.6s       |   70s    |
| **Kal'tsit**   | Medic (Physician)  | E2 Lv90 (Max Trust, Pot1, Mod3) | 2033 | 550 | 280 |  0  | 20  |   1   |      2.85s      |   70s    |
| **Myrtle**     | Vanguard (Bearer)  | E2 Lv70 (Max Trust, Pot6, Mod3) | 1715 | 520 | 407 |  0  |  8  |   1   |      1.3s       |   66s    |
| **Texas**      | Vanguard (Pioneer) | E2 Lv80 (Max Trust, Pot1, Mod3) | 2105 | 612 | 365 |  0  | 13  |   2   |      1.05s      |   70s    |
