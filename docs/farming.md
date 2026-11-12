# Farming Optimization Engine (`docs/farming.md`)

This document describes the design, mathematical model, and implementation of the farming efficiency calculation core in `shared/utils/farming/`.

---

## 1. Overview & Architecture

The farming optimizer bridges the user's material demand (from the Planner or a custom override) and empirical drop matrices from Penguin Statistics.

```
[Planner item-level demand]
         │
         ▼
[Farming Optimizer v3: Dual Simplex LP over stages + crafts] (shared/utils/farming/optimize.ts)
         │
         ├─ 1. Filter candidate stages by server, existence (exist), and active schedule (openTime <= now < closeTime)
         ├─ 2. Build the crafting DAG from Workshop synthesis recipes (allowCrafting = true)
         ├─ 3. Solve continuous LP: stage runs and craft counts, demand per item (min c^T x s.t. A x >= b, x >= 0)
         └─ 4. Integer rounding with greedy residual cover, then redundancy pruning
         │
         ▼
[Farming Plan & Cost Equivalents]
```

---

## 2. Model: Linear Program with Upward Crafting (v3)

### 2.1 What the optimizer solves

Given the planner's item-level demand (materials at every tier, plus LMD and EXP), the optimizer
chooses stage runs and Workshop crafts that together satisfy the demand at minimum sanity:

```
min  Σ apCost_j · x_j
s.t. Σ_j rate_{j,i} · x_j  +  Σ_c (out_{c,i} − in_{c,i}) · y_c  ≥  demand_i    for every item i
     x_j ≥ 0 (stage runs),  y_c ≥ 0 (craft executions)
```

- `rate_{j,i}` is the expected drop per run from Penguin Statistics.
- A craft column produces `resultCount` of its result and consumes its ingredients.
- Crafting costs no sanity, so the objective only prices stage runs.
- The matrix is built from the "recipe → ingredient" DAG (chip and furniture conversions excluded),
  so crafting can only turn ingredients into products: a Sugar Pack can never become a Sugar
  Substitute, exactly like the game.

### 2.2 Why the previous "T1-equivalence" model was wrong (fixed 2026-11-12)

v2 unrolled the demand into Tier-1 items and then credited _any_ drop that unravels to those items,
so a Sugar Pack counted as 12 Sugar Substitutes and a 1-7 run counted as 3.7 Orirock. That is the
opposite direction of the game's crafting: nothing can be crafted downward. The result looked cheap
but was not executable — on a real Blue Poison target the 777 AP plan covered only part of the
demand, and a pure raw-material deficit (100 Orirock) was covered by 3%. v3 keeps the LP optimum but
fixes the direction: pure Tier-1 demand is farmed on Tier-1 stages, while higher-tier demand is
crafted upward from the cheapest base stage (for example 1-7 Orirock Cubes for Orirock Clusters).

### 2.3 Integer rounding

1. Round the continuous LP solution **up**: flooring can leave a fractional gap that a greedy
   completion would then fill by crafting a whole intermediate chain from scratch (10 Aketon cost
   522 AP instead of the 288 AP of 12 direct 14-20 runs).
2. Greedily cover any remaining shortfall with the cheapest stage that drops the missing item.
3. Prune redundant runs in descending AP order while a top-down crafting pass still reports full
   coverage.

## 3. Stage Availability & Server Filtering

1. **Existence & Event Window (`exist`, `openTime`, `closeTime`)**:
   - `scripts/data/fetch-penguin.ts` fetches `/PenguinStats/api/v2/stages` alongside `/result/matrix` and stores `exist`, `openTime`, and `closeTime` on each stage in `data/penguin/{cn,us,benchmark}.json`.
   - `scripts/data/build-stages.ts` populates `servers` (`['cn']` vs `['cn', 'global']`) strictly from `existence.CN.exist` and `existence.US.exist`.
   - `isStageCurrentlyOpen(stage, now)` in `shared/utils/farming/optimize.ts` excludes any stage where `exist === false`, `openTime > now`, or `closeTime != null && closeTime <= now` (filtering out closed temporary events and past reruns).

---

## 4. Cost & Time Equivalents

### 4.1 Natural Sanity Regeneration

- In Arknights, natural sanity recovers at the rate of **1 point per 6 minutes** (10 sanity per hour, or 240 sanity per 24 hours).
- Estimated days of natural regeneration:
  $$\text{Days} = \frac{\text{Total Sanity}}{24 \times (60 / \text{regenMinutes})} = \frac{\text{Total Sanity}}{240}$$

### 4.2 Originite Prime (OP) Refills

- 1 Originite Prime completely replenishes sanity to the player's maximum sanity capacity $M$ (default 135, configurable in Settings):
  $$\text{OP Cost} = \lceil \frac{\text{Total Sanity}}{M} \rceil$$

---

## 5. Key Properties & Invariants

1. **Monotonicity ("More inventory $\to$ not more sanity")**:
   - If depot inventory increases, deficit $D$ strictly decreases or remains identical.
   - For any two deficits $D_A \le D_B$ (element-wise), $\text{Total Sanity}(D_A) \le \text{Total Sanity}(D_B)$.
   - Verified in unit tests (`tests/unit/shared/farming/optimize.test.ts`), including on Kal'tsit's full deficit across CN and US snapshots.
2. **Determinism**:
   - Given the same deficit, snapshot, and timestamp `now`, the result is completely deterministic.
3. **Offline Compatibility**:
   - Operates entirely on local JSON snapshots without making external network calls.
