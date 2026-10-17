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
> **Independent Live Verification (2026-10-17):**
>
> - **Source 1 (Global Wiki):** [https://arknights.wiki.gg/wiki/SilverAsh](https://arknights.wiki.gg/wiki/SilverAsh), [https://arknights.wiki.gg/wiki/Kal%27tsit](https://arknights.wiki.gg/wiki/Kal%27tsit) (queried 2026-10-17 via MediaWiki API `action=parse&prop=wikitext`)
> - **Source 2 (CN Wiki):** [https://prts.wiki/w/%E9%93%B6%E7%81%B0](https://prts.wiki/w/%E9%93%B6%E7%81%B0), [https://prts.wiki/w/%E5%87%AF%E5%B0%94%E5%B8%8C](https://prts.wiki/w/%E5%87%AF%E5%B0%94%E5%B8%8C) (queried 2026-10-17 via MediaWiki API `action=parse&prop=wikitext`)
> - **Source 3 (Fresh CN Game Data):** `Kengxxiao/ArknightsGameData` commit `bee3f83c5d60590b5e1cd42b8d09d00ce32ab10d` (`2026-10-16T08:02:27Z`, Client `2.7.81 Data:26-10-14-13-45-10-99469376`) and pinned commit `17759cc8cdf37388414145d16262a3a06f3ab25e` (`2026-10-08T23:46:48Z`)
> - **Source 4 (Frozen EN Game Data):** `Kengxxiao/ArknightsGameData_YoStar` commit `57010cb5b2afea112cae57daa756b58676ba6850` (`2025-11-13`)

#### 4.2.1. Complete Verification Table: SilverAsh (`char_172_svrash`) & Kal'tsit (`char_003_kalts`)

| Operator      | Skill / Transition                    | `wiki.gg` (Terra Wiki)                                                                              | `prts.wiki` (CN Wiki)                                                         | Наш расчёт (`data/`)                  | Совпадает                                        | URL & Дата запроса                                                                                                               |
| :------------ | :------------------------------------ | :-------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------- | :------------------------------------ | :----------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------- |
| **SilverAsh** | **Rank 2 → 3**                        | 5× Skill Summary - 1 (`3301`), 6× Ester (`30031`), 4× Oriron Shard (`30041`)                        | 5× 技巧概要·卷1 (`3301`), 6× 酯原料 (`30031`), 4× 异铁碎片 (`30041`)          | 5× `3301`, 6× `30031`, 4× `30041`     | **Да**                                           | [wiki.gg](https://arknights.wiki.gg/wiki/SilverAsh) / [prts.wiki](https://prts.wiki/w/%E9%93%B6%E7%81%B0) (2026-10-17)           |
| **SilverAsh** | **Rank 3 → 4**                        | 8× Skill Summary - 2 (`3302`), 4× Oriron (`30042`)                                                  | 8× 技巧概要·卷2 (`3302`), 4× 异铁 (`30042`)                                   | 8× `3302`, 4× `30042`                 | **Да**                                           | [wiki.gg](https://arknights.wiki.gg/wiki/SilverAsh) / [prts.wiki](https://prts.wiki/w/%E9%93%B6%E7%81%B0) (2026-10-17)           |
| **SilverAsh** | **Rank 4 → 5**                        | 8× Skill Summary - 2 (`3302`), 4× Polyketon (`30052`), 5× Orirock Cube (`30012`)                    | 8× 技巧概要·卷2 (`3302`), 4× 酮凝集 (`30052`), 5× 固源岩 (`30012`)            | 8× `3302`, 4× `30052`, 5× `30012`     | **Да**                                           | [wiki.gg](https://arknights.wiki.gg/wiki/SilverAsh) / [prts.wiki](https://prts.wiki/w/%E9%93%B6%E7%81%B0) (2026-10-17)           |
| **SilverAsh** | **Rank 5 → 6**                        | 8× Skill Summary - 2 (`3302`), 7× Sugar Pack (`30023`)                                              | 8× 技巧概要·卷2 (`3302`), 7× 糖组 (`30023`)                                   | 8× `3302`, 7× `30023`                 | **Да**                                           | [wiki.gg](https://arknights.wiki.gg/wiki/SilverAsh) / [prts.wiki](https://prts.wiki/w/%E9%93%B6%E7%81%B0) (2026-10-17)           |
| **SilverAsh** | **Rank 6 → 7**                        | 8× Skill Summary - 3 (`3303`), 4× Polyester Pack (`30033`), 5× Manganese Ore (`30083`)              | 8× 技巧概要·卷3 (`3303`), 4× 聚酸酯组 (`30033`), 5× 轻锰矿 (`30083`)          | 8× `3303`, 4× `30033`, 5× `30083`     | **Да**                                           | [wiki.gg](https://arknights.wiki.gg/wiki/SilverAsh) / [prts.wiki](https://prts.wiki/w/%E9%93%B6%E7%81%B0) (2026-10-17)           |
| **SilverAsh** | **S1 (Power Strike γ) M1**            | **8×** Skill Summary - 3 (`3303`), 4× Oriron Block (`30044`), 4× Sugar Pack (`30023`)               | **6×** 技巧概要·卷3 (`3303`), 4× 异铁块 (`30044`), 4× 糖组 (`30023`)          | **6×** `3303`, 4× `30044`, 4× `30023` | **Да с CN/PRTS; расхождение с wiki.gg (8 vs 6)** | [wiki.gg](https://arknights.wiki.gg/wiki/SilverAsh) / [prts.wiki](https://prts.wiki/w/%E9%93%B6%E7%81%B0) (2026-10-17)           |
| **SilverAsh** | **S1 (Power Strike γ) M2**            | 12× Skill Summary - 3 (`3303`), 4× White Horse Kohl (`30074`), 8× Keton Colloid (`30054`)           | 12× 技巧概要·卷3 (`3303`), 4× 白马醇 (`30074`), 8× 酮阵列 (`30054`)           | 12× `3303`, 4× `30074`, 8× `30054`    | **Да**                                           | [wiki.gg](https://arknights.wiki.gg/wiki/SilverAsh) / [prts.wiki](https://prts.wiki/w/%E9%93%B6%E7%81%B0) (2026-10-17)           |
| **SilverAsh** | **S1 (Power Strike γ) M3**            | 15× Skill Summary - 3 (`3303`), 6× D32 Steel (`30135`), 7× White Horse Kohl (`30074`)               | 15× 技巧概要·卷3 (`3303`), 6× D32钢 (`30135`), 7× 白马醇 (`30074`)            | 15× `3303`, 6× `30135`, 7× `30074`    | **Да**                                           | [wiki.gg](https://arknights.wiki.gg/wiki/SilverAsh) / [prts.wiki](https://prts.wiki/w/%E9%93%B6%E7%81%B0) (2026-10-17)           |
| **SilverAsh** | **S2 (Rules of Survival) M1**         | **8×** Skill Summary - 3 (`3303`), 4× Keton Colloid (`30054`), 6× Polyester Pack (`30033`)          | **6×** 技巧概要·卷3 (`3303`), 4× 酮阵列 (`30054`), 6× 聚酸酯组 (`30033`)      | **6×** `3303`, 4× `30054`, 6× `30033` | **Да с CN/PRTS; расхождение с wiki.gg (8 vs 6)** | [wiki.gg](https://arknights.wiki.gg/wiki/SilverAsh) / [prts.wiki](https://prts.wiki/w/%E9%93%B6%E7%81%B0) (2026-10-17)           |
| **SilverAsh** | **S2 (Rules of Survival) M2**         | 12× Skill Summary - 3 (`3303`), 4× Manganese Trihydrate (`30084`), 5× Optimized Device (`30064`)    | 12× 技巧概要·卷3 (`3303`), 4× 三水锰矿 (`30084`), 5× 改量装置 (`30064`)       | 12× `3303`, 4× `30084`, 5× `30064`    | **Да**                                           | [wiki.gg](https://arknights.wiki.gg/wiki/SilverAsh) / [prts.wiki](https://prts.wiki/w/%E9%93%B6%E7%81%B0) (2026-10-17)           |
| **SilverAsh** | **S2 (Rules of Survival) M3**         | 15× Skill Summary - 3 (`3303`), 6× D32 Steel (`30135`), 6× Sugar Lump (`30024`)                     | 15× 技巧概要·卷3 (`3303`), 6× D32钢 (`30135`), 6× 糖聚块 (`30024`)            | 15× `3303`, 6× `30135`, 6× `30024`    | **Да**                                           | [wiki.gg](https://arknights.wiki.gg/wiki/SilverAsh) / [prts.wiki](https://prts.wiki/w/%E9%93%B6%E7%81%B0) (2026-10-17)           |
| **SilverAsh** | **S3 (Truesilver Slash) M1**          | **8×** Skill Summary - 3 (`3303`), 3× Optimized Device (`30064`), 4× Oriron Cluster (`30043`)       | **6×** 技巧概要·卷3 (`3303`), 3× 改量装置 (`30064`), 4× 异铁组 (`30043`)      | **6×** `3303`, 3× `30064`, 4× `30043` | **Да с CN/PRTS; расхождение с wiki.gg (8 vs 6)** | [wiki.gg](https://arknights.wiki.gg/wiki/SilverAsh) / [prts.wiki](https://prts.wiki/w/%E9%93%B6%E7%81%B0) (2026-10-17)           |
| **SilverAsh** | **S3 (Truesilver Slash) M2**          | 12× Skill Summary - 3 (`3303`), 4× Grindstone Pentahydrate (`30094`), 9× White Horse Kohl (`30074`) | 12× 技巧概要·卷3 (`3303`), 4× 五水研磨石 (`30094`), 9× 白马醇 (`30074`)       | 12× `3303`, 4× `30094`, 9× `30074`    | **Да**                                           | [wiki.gg](https://arknights.wiki.gg/wiki/SilverAsh) / [prts.wiki](https://prts.wiki/w/%E9%93%B6%E7%81%B0) (2026-10-17)           |
| **SilverAsh** | **S3 (Truesilver Slash) M3**          | 15× Skill Summary - 3 (`3303`), 6× Bipolar Nanoflake (`30125`), 5× Sugar Lump (`30024`)             | 15× 技巧概要·卷3 (`3303`), 6× 双极纳米片 (`30125`), 5× 糖聚块 (`30024`)       | 15× `3303`, 6× `30125`, 5× `30024`    | **Да**                                           | [wiki.gg](https://arknights.wiki.gg/wiki/SilverAsh) / [prts.wiki](https://prts.wiki/w/%E9%93%B6%E7%81%B0) (2026-10-17)           |
| **Kal'tsit**  | **S1 (Command: Structural Fort.) M1** | 8× Skill Summary - 3 (`3303`), 4× Keton Colloid (`30054`), 4× Coagulating Gel (`31013`)             | 8× 技巧概要·卷3 (`3303`), 4× 酮阵列 (`30054`), 4× 凝胶 (`31013`)              | 8× `3303`, 4× `30054`, 4× `31013`     | **Да**                                           | [wiki.gg](https://arknights.wiki.gg/wiki/Kal%27tsit) / [prts.wiki](https://prts.wiki/w/%E5%87%AF%E5%B0%94%E5%B8%8C) (2026-10-17) |
| **Kal'tsit**  | **S1 (Command: Structural Fort.) M2** | 12× Skill Summary - 3 (`3303`), 4× Grindstone Pentahydrate (`30094`), 9× White Horse Kohl (`30074`) | 12× 技巧概要·卷3 (`3303`), 4× 五水研磨石 (`30094`), 9× 白马醇 (`30074`)       | 12× `3303`, 4× `30094`, 9× `30074`    | **Да**                                           | [wiki.gg](https://arknights.wiki.gg/wiki/Kal%27tsit) / [prts.wiki](https://prts.wiki/w/%E5%87%AF%E5%B0%94%E5%B8%8C) (2026-10-17) |
| **Kal'tsit**  | **S1 (Command: Structural Fort.) M3** | 15× Skill Summary - 3 (`3303`), 6× Polymerization Prep. (`30115`), 5× Oriron Block (`30044`)        | 15× 技巧概要·卷3 (`3303`), 6× 聚合剂 (`30115`), 5× 异铁块 (`30044`)           | 15× `3303`, 6× `30115`, 5× `30044`    | **Да**                                           | [wiki.gg](https://arknights.wiki.gg/wiki/Kal%27tsit) / [prts.wiki](https://prts.wiki/w/%E5%87%AF%E5%B0%94%E5%B8%8C) (2026-10-17) |
| **Kal'tsit**  | **S2 (Command: Tactical Coord.) M1**  | 8× Skill Summary - 3 (`3303`), 3× Optimized Device (`30064`), 4× Oriron Cluster (`30043`)           | 8× 技巧概要·卷3 (`3303`), 3× 改量装置 (`30064`), 4× 异铁组 (`30043`)          | 8× `3303`, 3× `30064`, 4× `30043`     | **Да**                                           | [wiki.gg](https://arknights.wiki.gg/wiki/Kal%27tsit) / [prts.wiki](https://prts.wiki/w/%E5%87%AF%E5%B0%94%E5%B8%8C) (2026-10-17) |
| **Kal'tsit**  | **S2 (Command: Tactical Coord.) M2**  | 12× Skill Summary - 3 (`3303`), 4× RMA70-24 (`30104`), 7× Manganese Trihydrate (`30084`)            | 12× 技巧概要·卷3 (`3303`), 4× RMA70-24 (`30104`), 7× 三水锰矿 (`30084`)       | 12× `3303`, 4× `30104`, 7× `30084`    | **Да**                                           | [wiki.gg](https://arknights.wiki.gg/wiki/Kal%27tsit) / [prts.wiki](https://prts.wiki/w/%E5%87%AF%E5%B0%94%E5%B8%8C) (2026-10-17) |
| **Kal'tsit**  | **S2 (Command: Tactical Coord.) M3**  | 15× Skill Summary - 3 (`3303`), 6× D32 Steel (`30135`), 5× Keton Colloid (`30054`)                  | 15× 技巧概要·卷3 (`3303`), 6× D32钢 (`30135`), 5× 酮阵列 (`30054`)            | 15× `3303`, 6× `30135`, 5× `30054`    | **Да**                                           | [wiki.gg](https://arknights.wiki.gg/wiki/Kal%27tsit) / [prts.wiki](https://prts.wiki/w/%E5%87%AF%E5%B0%94%E5%B8%8C) (2026-10-17) |
| **Kal'tsit**  | **S3 (Command: Meltdown) M1**         | 8× Skill Summary - 3 (`3303`), 4× White Horse Kohl (`30074`), 8× Aketon (`30053`)                   | 8× 技巧概要·卷3 (`3303`), 4× 白马醇 (`30074`), 8× 酮凝集组 (`30053`)          | 8× `3303`, 4× `30074`, 8× `30053`     | **Да**                                           | [wiki.gg](https://arknights.wiki.gg/wiki/Kal%27tsit) / [prts.wiki](https://prts.wiki/w/%E5%87%AF%E5%B0%94%E5%B8%8C) (2026-10-17) |
| **Kal'tsit**  | **S3 (Command: Meltdown) M2**         | 12× Skill Summary - 3 (`3303`), 4× Crystalline Circuit (`31034`), 8× Polymerized Gel (`31014`)      | 12× 技巧概要·卷3 (`3303`), 4× 晶体电路 (`31034`), 8× 聚合凝胶 (`31014`)       | 12× `3303`, 4× `31034`, 8× `31014`    | **Да**                                           | [wiki.gg](https://arknights.wiki.gg/wiki/Kal%27tsit) / [prts.wiki](https://prts.wiki/w/%E5%87%AF%E5%B0%94%E5%B8%8C) (2026-10-17) |
| **Kal'tsit**  | **S3 (Command: Meltdown) M3**         | 15× Skill Summary - 3 (`3303`), 6× Crystalline Elec. Unit (`30145`), 4× Grindstone Pent. (`30094`)  | 15× 技巧概要·卷3 (`3303`), 6× 晶体电子单元 (`30145`), 4× 五水研磨石 (`30094`) | 15× `3303`, 6× `30145`, 4× `30094`    | **Да**                                           | [wiki.gg](https://arknights.wiki.gg/wiki/Kal%27tsit) / [prts.wiki](https://prts.wiki/w/%E5%87%AF%E5%B0%94%E5%B8%8C) (2026-10-17) |

---

#### 4.2.2. Raw `levelUpCostCond` / `masteryCosts` Fragments Across All Sources

##### A. SilverAsh (`char_172_svrash`, Skill 3 `skchr_svrash_3` M1)

1. **Our Built Data (`data/operators/char_172_svrash.json`, JSON path: `$.skills[2].masteryCosts[0]`)**:

```json
{
  "unlockCond": {
    "phase": 2,
    "level": 1
  },
  "levelUpCost": [
    { "id": "3303", "count": 6 },
    { "id": "30064", "count": 3 },
    { "id": "30043", "count": 4 }
  ]
}
```

2. **Fresh Upstream CN (`Kengxxiao/ArknightsGameData`, file: `zh_CN/gamedata/excel/character_table.json`, commit `bee3f83c5d60590b5e1cd42b8d09d00ce32ab10d` dated `2026-10-16T08:02:27Z`, Client `2.7.81 Data:26-10-14`, and local `.cache/raw/zh_CN/character_table.json` commit `17759cc8cdf37388414145d16262a3a06f3ab25e` dated `2026-10-08T23:46:48Z`, JSON path: `$["char_172_svrash"].skills[2].levelUpCostCond[0]`)**:

```json
{
  "unlockCond": {
    "phase": "PHASE_2",
    "level": 1
  },
  "lvlUpTime": 28800,
  "levelUpCost": [
    { "id": "3303", "count": 6, "type": "MATERIAL" },
    { "id": "30064", "count": 3, "type": "MATERIAL" },
    { "id": "30043", "count": 4, "type": "MATERIAL" }
  ]
}
```

3. **Frozen Upstream EN (`Kengxxiao/ArknightsGameData_YoStar`, file: `en_US/gamedata/excel/character_table.json` / `.cache/raw/en_US/character_table.json`, commit `57010cb5b2afea112cae57daa756b58676ba6850` dated `2025-11-13`, JSON path: `$["char_172_svrash"].skills[2].levelUpCostCond[0]`)**:

```json
{
  "unlockCond": {
    "phase": "PHASE_2",
    "level": 1
  },
  "lvlUpTime": 28800,
  "levelUpCost": [
    { "id": "3303", "count": 6, "type": "MATERIAL" },
    { "id": "30064", "count": 3, "type": "MATERIAL" },
    { "id": "30043", "count": 4, "type": "MATERIAL" }
  ]
}
```

##### B. Kal'tsit (`char_003_kalts`, Skill 3 `skchr_kalts_3` M1)

1. **Our Built Data (`data/operators/char_003_kalts.json`, JSON path: `$.skills[2].masteryCosts[0]`)**:

```json
{
  "unlockCond": {
    "phase": 2,
    "level": 1
  },
  "levelUpCost": [
    { "id": "3303", "count": 8 },
    { "id": "30074", "count": 4 },
    { "id": "30053", "count": 8 }
  ]
}
```

2. **Fresh Upstream CN (`Kengxxiao/ArknightsGameData`, commit `bee3f83c5d60590b5e1cd42b8d09d00ce32ab10d` `2026-10-16` & `.cache/raw/zh_CN/character_table.json` commit `17759cc8` `2026-10-08`) AND Frozen Upstream EN (`.cache/raw/en_US/character_table.json`, commit `57010cb5` `2025-11-13`), JSON path: `$["char_003_kalts"].skills[2].levelUpCostCond[0]`**:

```json
{
  "unlockCond": {
    "phase": "PHASE_2",
    "level": 1
  },
  "lvlUpTime": 28800,
  "levelUpCost": [
    { "id": "3303", "count": 8, "type": "MATERIAL" },
    { "id": "30074", "count": 4, "type": "MATERIAL" },
    { "id": "30053", "count": 8, "type": "MATERIAL" }
  ]
}
```

---

#### 4.2.3. Hypothesis Check & Source Attribution (SilverAsh S3 M1: 6 vs 8 `3303`)

1. **Where we source mastery costs (`scripts/data/build-operators.ts`)**:
   - `buildSkills()` in `scripts/data/build-operators.ts` extracts `masteryCosts` directly from `rawChar.skills[i].levelUpCostCond` in `.cache/raw/zh_CN/character_table.json` (`Kengxxiao/ArknightsGameData`, branch `master`, pinned commit `17759cc8cdf37388414145d16262a3a06f3ab25e`, `2026-10-08T23:46:48Z`).
2. **Hypothesis Verification (Outdated Snapshot vs Wiki Discrepancy)**:
   - We queried the latest upstream `HEAD` of `Kengxxiao/ArknightsGameData` (`bee3f83c5d60590b5e1cd42b8d09d00ce32ab10d`, `2026-10-16T08:02:27Z`, Client `2.7.81 Data:26-10-14-13-45-10-99469376`) and compared it against frozen EN (`57010cb5`, `2025-11-13`), `prts.wiki`, and `arknights.wiki.gg`.
   - **Result**: Both the freshest CN client (`2026-10-16`) and the EN client (`2025-11-13`) have `"id": "3303", "count": 6` for SilverAsh (`char_172_svrash`) S1–S3 M1, and `"id": "3303", "count": 8` for Kal'tsit (`char_003_kalts`) S1–S3 M1.
   - In `prts.wiki` (`https://prts.wiki/w/%E9%93%B6%E7%81%B0`), SilverAsh's wikitext is `|三8={{材料消耗|技巧概要·卷3|6}} {{材料消耗|改量装置|3}} {{材料消耗|异铁组|4}}` (**6** books).
   - In `arknights.wiki.gg` (`https://arknights.wiki.gg/wiki/SilverAsh`), the wikitext is `{{Skill upgrade cell|level=8|skill1=Power Strike γ|skill2=Rules of Survival|skill3=Truesilver Slash|summary=8|...}}` (**8** books), whereas other launch 6★ operators on `arknights.wiki.gg` (`https://arknights.wiki.gg/wiki/Exusiai` and `https://arknights.wiki.gg/wiki/Siege`) have `summary=6` matching `character_table.json`.
   - Therefore, our data (`6`) matches the latest CN client (`2026-10-16`), the EN client, and `prts.wiki`; the value `8` on `arknights.wiki.gg/wiki/SilverAsh` is a manual wiki template typo on that page.
3. **Status of PR #41**:
   - PR #41 was merged and closed by the repository owner (`2026-10-16T16:16:00Z`, merge commit `f5935c5c`), and the follow-up commits from the same branch were subsequently merged via PR #42 (`b260df5`).

#### 4.2.3. Tactical Modules: Kal'tsit & Fiammetta Stage Costs

##### Kal'tsit (`char_003_kalts`)

- **Module X (`uniequip_002_kalts`) — "Mon2tr"**:
  - Stage 1: 80,000 LMD | 4× Module Data Block, 2× D32 Steel (`30135`)
  - Stage 2: 100,000 LMD | 4× Module Data Block, 60× Data Supplement Stick, 3× Crystalline Electronic Unit (`30145`)
  - Stage 3: 120,000 LMD | 4× Module Data Block, 20× Data Supplement Instrument, 4× Polymerization Preparation (`30115`)
  - **Total Module X**: 300,000 LMD, 12× Module Data Block.
- **Module Y (`uniequip_003_kalts`) — "Panacea"**:
  - Stage 1: 80,000 LMD | 4× Module Data Block, 2× Crystalline Electronic Unit (`30145`)
  - Stage 2: 100,000 LMD | 4× Module Data Block, 60× Data Supplement Stick, 3× Polymerization Preparation (`30115`)
  - Stage 3: 120,000 LMD | 4× Module Data Block, 20× Data Supplement Instrument, 4× Bipolar Nanoflake (`30125`)
  - **Total Module Y**: 300,000 LMD, 12× Module Data Block.
- **Module A (`uniequip_004_kalts`) — "Kal'tsit's Specialized Badge"**:
  - Stage 1-3: 0 LMD, 1× Module Data Block each (IS game mode badge, excluded from tactical planner).

##### Fiammetta (`char_300_phenxi`)

- **Module Y (`uniequip_002_phenxi`) — "'Out-Law' Special Ammunition Surplus"**:
  - Stage 1: 80,000 LMD | 4× Module Data Block, 2× Bipolar Nanoflake (`30125`)
  - Stage 2: 100,000 LMD | 4× Module Data Block, 60× Data Supplement Stick, 3× Crystalline Electronic Unit (`30145`)
  - Stage 3: 120,000 LMD | 4× Module Data Block, 20× Data Supplement Instrument, 4× Polymerization Preparation (`30115`)
  - **Total Module Y**: 300,000 LMD, 12× Module Data Block.
- **Module X (`uniequip_003_phenxi`) — "A Long Journey"**:
  - Stage 1: 80,000 LMD | 4× Module Data Block, 2× Crystalline Electronic Unit (`30145`)
  - Stage 2: 100,000 LMD | 4× Module Data Block, 60× Data Supplement Stick, 3× Bipolar Nanoflake (`30125`)
  - Stage 3: 120,000 LMD | 4× Module Data Block, 20× Data Supplement Instrument, 4× D32 Steel (`30135`)
  - **Total Module X**: 300,000 LMD, 12× Module Data Block.
- **Module A (`uniequip_004_phenxi`) — "Fiammetta's Specialized Badge"**:
  - Stage 1-3: 0 LMD, 1× Module Data Block each (IS game mode badge, excluded from tactical planner).

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
