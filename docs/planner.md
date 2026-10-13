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

## 4. Arithmetic Reference Benchmarks

> [!WARNING]
> **Audit status:** The leveling and promotion benchmarks below (levels, elite promotions, LMD, EXP) have been verified arithmetically against `data/constants.json` and formulas. Skills (1–7), skill masteries (M1–M3), and module upgrade material requirements are currently without external benchmark verification against live databases and require external verification in future audit tasks.

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
