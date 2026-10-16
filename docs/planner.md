# Operator Planner & Progression Architecture

## 1. Overview

The operator upgrade planner is a pure, deterministic calculation engine located in [`shared/utils/planner/`](file:///c:/Projects/ArknightsCalculator/shared/utils/planner/). It runs synchronously with zero DOM, Vue, Pinia, or network dependencies and is shared across client applications and potential Nitro server routes.

The planner computes exact required resources to advance an operator from an arbitrary current state to a target state:

- **LMD (Lungmen Dollars)**: level-up costs, elite promotion fees, and module installation fees.
- **EXP (Operator Experience)**: experience curves by rarity and elite phase.
- **Materials / Items**: Elite promotion chips and items, skill books (1-7), skill mastery items (M1-M3), and module upgrade items (Stages 1-3).
- **Battle Records (EXP Cards)**: recommended conversion into card denominations (Drill, Frontline, Tactical, Strategic).

---

## 2. In-Game Leveling Mechanics & Level Reset

In Arknights, advancing an operator through elite promotions adheres to a discrete two-step rule per promotion:

1. **Maxing Current Phase**:
   To qualify for promotion from Elite $E$ to Elite $E+1$, the operator must first reach the maximum level for phase $E$ ($\text{maxLevel}[E]$):
   - 3★: Elite 0 cap is Lv40, Elite 1 cap is Lv55.
   - 4★: Elite 0 cap is Lv45, Elite 1 cap is Lv60, Elite 2 cap is Lv70.
   - 5★: Elite 0 cap is Lv50, Elite 1 cap is Lv70, Elite 2 cap is Lv80.
   - 6★: Elite 0 cap is Lv50, Elite 1 cap is Lv80, Elite 2 cap is Lv90.

2. **Level Reset Upon Evolution**:
   When promoted to the next elite phase:
   - A one-time evolution fee in LMD (`evolveGoldCost[rarity][E]`) and specified promotion items are consumed.
   - **The operator's level resets to 1**.
   - Leveling restarts from level 1 up to the target level or the new phase cap.

### Leveling Mathematics:

For any elite phase $E$ and levels $L_{\text{start}} \to L_{\text{end}}$:

$$\text{EXP} = \sum_{l = L_{\text{start}}}^{L_{\text{end}} - 1} \text{characterExpMap}[E][l - 1]$$

$$\text{LMD}_{\text{level}} = \sum_{l = L_{\text{start}}}^{L_{\text{end}} - 1} \text{characterUpgradeCostMap}[E][l - 1]$$

---

## 3. Mathematical Properties & Verification

The core calculation function [`calculateCost`](file:///c:/Projects/ArknightsCalculator/shared/utils/planner/calculateCost.ts) satisfies strict mathematical laws:

1. **Monotonicity**:
   If state $A \le B \le C$ in the progression lattice, then:
   $$\text{cost}(A \to B) \le \text{cost}(A \to C)$$
2. **Additivity**:
   The cost from state $A$ to $C$ through intermediate state $B$ equals the direct cost:
   $$\text{cost}(A \to B) + \text{cost}(B \to C) = \text{cost}(A \to C)$$
3. **Identity / Zero Cost**:
   $$\text{cost}(A \to A) = 0$$
4. **No Reverse Leveling**:
   If target state is lower than current state, returned cost is 0.

---

## 4. Live Reference Benchmarks & External Audit

> [!NOTE]
> **Audit status (2026-10-15):** Verified via live web requests against Arknights Terra Wiki (`arknights.wiki.gg`) and official client data tables (`character_table.json`, `uniequip_table.json`).

### 4.1. 6★ Module Unlock Cost (Stage 0 → 1)

- **Live Source:** [Arknights Terra Wiki: Fiammetta](https://arknights.wiki.gg/wiki/Fiammetta) & [Operator Module](https://arknights.wiki.gg/wiki/Operator_Module) (Accessed: 2026-10-15).
- **Benchmark Operator:** Fiammetta (6★ Artilleryman Sniper, `char_300_phenxi`) ART-X (`uniequip_002_phenxi`) and ART-Y (`uniequip_003_phenxi`); SilverAsh (6★ Lord Guard, `char_172_svrash`) SWO-X (`uniequip_002_svrash`).
- **Standard 6★ Stage 1 Unlock Requirements:**
  - 4× Module Data Block (`mod_unlock_token`, Tier 5)
  - 2× Tier 5 Rare Material (e.g., Crystalline Electronic Unit `30145` or Bipolar Nanoflake `30125` or D32 Steel `30115`)
  - 80,000 LMD (`4001`)

| Resource              | Terra Wiki Requirement | Client Data / Calculation | Status               |
| :-------------------- | :--------------------: | :-----------------------: | :------------------- |
| **Module Data Block** |           4            |             4             | **Совпадает (100%)** |
| **T5 Material**       |           2            |             2             | **Совпадает (100%)** |
| **LMD Fee**           |         80,000         |          80,000           | **Совпадает (100%)** |

---

### 4.2. Dual-Source Skill Leveling & Mastery Verification (SilverAsh & Kal'tsit)

> [!NOTE]
> **Independent Live Verification (2026-10-15):**
>
> - **Source 1 (Global):** [Arknights Terra Wiki: SilverAsh](https://arknights.wiki.gg/wiki/SilverAsh), [Arknights Terra Wiki: Kal'tsit](https://arknights.wiki.gg/wiki/Kal%27tsit)
> - **Source 2 (CN):** [PRTS Wiki: 银灰](https://prts.wiki/w/%E9%93%B6%E7%81%B0), [PRTS Wiki: 凯尔希](https://prts.wiki/w/%E5%87%AF%E5%B0%94%E5%B8%8C)

#### 4.2.1. SilverAsh (`char_172_svrash`)

##### Common Skill Ranks (1 → 7)

| Transition     | Requirements (Local Data & PRTS / Terra Wiki)                                          | Status               |
| :------------- | :------------------------------------------------------------------------------------- | :------------------- |
| **Rank 1 → 2** | 5× Skill Summary - 1 (`3301`)                                                          | **Совпадает (100%)** |
| **Rank 2 → 3** | 5× Skill Summary - 1 (`3301`), 6× Ester (`30031`), 4× Oriron Shard (`30041`)           | **Совпадает (100%)** |
| **Rank 3 → 4** | 8× Skill Summary - 2 (`3302`), 4× Oriron (`30042`)                                     | **Совпадает (100%)** |
| **Rank 4 → 5** | 8× Skill Summary - 2 (`3302`), 4× Polyketon (`30052`), 5× Orirock Cube (`30012`)       | **Совпадает (100%)** |
| **Rank 5 → 6** | 8× Skill Summary - 2 (`3302`), 7× Sugar Pack (`30023`)                                 | **Совпадает (100%)** |
| **Rank 6 → 7** | 8× Skill Summary - 3 (`3303`), 4× Polyester Pack (`30033`), 5× Manganese Ore (`30083`) | **Совпадает (100%)** |

##### Mastery Progression (M1 → M3)

| Skill                      | Level | Cost in Game Data (`character_table.json`)                             | PRTS / Terra Wiki                                                      | Status        |
| :------------------------- | :---: | :--------------------------------------------------------------------- | :--------------------------------------------------------------------- | :------------ |
| **S1 (Power Strike γ)**    |  M1   | 6× Skill Summary - 3, 4× Oriron Block, 4× Sugar Pack                   | 6× Skill Summary - 3, 4× Oriron Block, 4× Sugar Pack                   | **Совпадает** |
|                            |  M2   | 12× Skill Summary - 3, 4× White Horse Kohl, 8× Keton Colloid           | 12× Skill Summary - 3, 4× White Horse Kohl, 8× Keton Colloid           | **Совпадает** |
|                            |  M3   | 15× Skill Summary - 3, 6× D32 Steel, 7× White Horse Kohl               | 15× Skill Summary - 3, 6× D32 Steel, 7× White Horse Kohl               | **Совпадает** |
| **S2 (Rules of Survival)** |  M1   | 6× Skill Summary - 3, 4× Keton Colloid, 6× Polyester Pack              | 6× Skill Summary - 3, 4× Keton Colloid, 6× Polyester Pack              | **Совпадает** |
|                            |  M2   | 12× Skill Summary - 3, 4× Manganese Trihydrate, 5× Optimized Device    | 12× Skill Summary - 3, 4× Manganese Trihydrate, 5× Optimized Device    | **Совпадает** |
|                            |  M3   | 15× Skill Summary - 3, 6× D32 Steel, 6× Sugar Lump                     | 15× Skill Summary - 3, 6× D32 Steel, 6× Sugar Lump                     | **Совпадает** |
| **S3 (Truesilver Slash)**  |  M1   | 6× Skill Summary - 3, 3× Optimized Device, 4× Oriron Cluster           | 6× Skill Summary - 3, 3× Optimized Device, 4× Oriron Cluster           | **Совпадает** |
|                            |  M2   | 12× Skill Summary - 3, 4× Grindstone Pentahydrate, 9× White Horse Kohl | 12× Skill Summary - 3, 4× Grindstone Pentahydrate, 9× White Horse Kohl | **Совпадает** |
|                            |  M3   | 15× Skill Summary - 3, 6× Bipolar Nanoflake, 5× Sugar Lump             | 15× Skill Summary - 3, 6× Bipolar Nanoflake, 5× Sugar Lump             | **Совпадает** |

> [!IMPORTANT]
> **Разбор вопроса по SilverAsh S3 M1:**
> В SilverAsh S3 M1 материал D32 Steel **не используется вовсе** (расход: 6× Skill Summary - 3, 3× Optimized Device, 4× Oriron Cluster). D32 Steel у SilverAsh требуется на **Elite 2** (4 шт.), **S1 M3** (6 шт.) и **S2 M3** (6 шт.), а на S3 M3 расходуется **Bipolar Nanoflake** (6 шт.). Число «8», встречавшееся в ранних шаблонах Terra Wiki, относилось к количеству Skill Summary - 3 у операторов более поздних волн (как у Kal'tsit), тогда как у релизных 6★ (SilverAsh, Exusiai, Eyjafjalla) M1 стоит ровно **6** книг. Расчёт калькулятора полностью идентичен raw-данным и обоим вики-источникам.

#### 4.2.2. Kal'tsit (`char_003_kalts`)

##### Mastery Progression (M1 → M3)

| Skill                                      | Level | Cost in Game Data (`character_table.json`)                                        | PRTS / Terra Wiki                                                                 | Status        |
| :----------------------------------------- | :---: | :-------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------- | :------------ |
| **S1 (Command: Structural Consolidation)** |  M1   | 8× Skill Summary - 3, 4× Keton Colloid, 4× Coagulating Gel                        | 8× Skill Summary - 3, 4× Keton Colloid, 4× Coagulating Gel                        | **Совпадает** |
|                                            |  M2   | 12× Skill Summary - 3, 4× Grindstone Pentahydrate, 9× White Horse Kohl            | 12× Skill Summary - 3, 4× Grindstone Pentahydrate, 9× White Horse Kohl            | **Совпадает** |
|                                            |  M3   | 15× Skill Summary - 3, 6× Polymerization Preparation, 5× Oriron Block             | 15× Skill Summary - 3, 6× Polymerization Preparation, 5× Oriron Block             | **Совпадает** |
| **S2 (Command: Tactical Coordination)**    |  M1   | 8× Skill Summary - 3, 3× Optimized Device, 4× Oriron Cluster                      | 8× Skill Summary - 3, 3× Optimized Device, 4× Oriron Cluster                      | **Совпадает** |
|                                            |  M2   | 12× Skill Summary - 3, 4× RMA70-24, 7× Manganese Trihydrate                       | 12× Skill Summary - 3, 4× RMA70-24, 7× Manganese Trihydrate                       | **Совпадает** |
|                                            |  M3   | 15× Skill Summary - 3, 6× D32 Steel, 5× Keton Colloid                             | 15× Skill Summary - 3, 6× D32 Steel, 5× Keton Colloid                             | **Совпадает** |
| **S3 (Command: Meltdown)**                 |  M1   | 8× Skill Summary - 3, 4× White Horse Kohl, 8× Aketon                              | 8× Skill Summary - 3, 4× White Horse Kohl, 8× Aketon                              | **Совпадает** |
|                                            |  M2   | 12× Skill Summary - 3, 4× Crystalline Circuit, 8× Polymerized Gel                 | 12× Skill Summary - 3, 4× Crystalline Circuit, 8× Polymerized Gel                 | **Совпадает** |
|                                            |  M3   | 15× Skill Summary - 3, 6× Crystalline Electronic Unit, 4× Grindstone Pentahydrate | 15× Skill Summary - 3, 6× Crystalline Electronic Unit, 4× Grindstone Pentahydrate | **Совпадает** |

---

### 4.3. Level Progression Benchmarks

Verified against `data/constants.json` and `data/operators/*.json`:

| Operator           | Stage Progression            | Required EXP  |   Level LMD   | Evolve LMD  |   Total LMD   |
| :----------------- | :--------------------------- | :-----------: | :-----------: | :---------: | :-----------: |
| **SilverAsh (6★)** | E0 L1 $\to$ E0 L50           |    24,400     |    26,719     |      0      |    26,719     |
| **SilverAsh (6★)** | E1 L1 $\to$ E1 L80           |    337,000    |    353,122    |      0      |    353,122    |
| **SilverAsh (6★)** | E2 L1 $\to$ E2 L90           |    750,000    |    744,955    |      0      |    744,955    |
| **SilverAsh (6★)** | **Total E0 L1 $\to$ E2 L90** | **1,111,400** | **1,124,796** | **210,000** | **1,334,796** |

---

## 5. Battle Record Planning (`planExpCards`)

Given required EXP, converts into battle record cards:

- **Strategic Battle Record (ID: 2004)**: 2,000 EXP
- **Tactical Battle Record (ID: 2003)**: 1,000 EXP
- **Frontline Battle Record (ID: 2002)**: 400 EXP
- **Drill Battle Record (ID: 2001)**: 200 EXP

Uses greedy allocation descending by card value, rounding up with the lowest card to prevent unnecessary overflow.
