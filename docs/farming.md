# Farming Optimization Engine (`docs/farming.md`)

This document describes the design, mathematical model, and implementation of the farming efficiency calculation core in `shared/utils/farming/`.

---

## 1. Overview & Architecture

The farming optimizer bridges the user's material deficit (from the Planner / Workshop engine or custom override) and empirical drop matrices from Penguin Statistics.

```
[Planner / Depot Deficit]
         │
         ▼
[Workshop Synthesis Engine] (shared/utils/workshop)
         │
         ▼  (Post-stock raw deficit)
[Farming Optimizer v2: Dual Simplex LP + Crafting Substitution] (shared/utils/farming/optimize.ts)
         │
         ├─ 1. Filter candidate stages by server, existence (exist), and active schedule (openTime <= now < closeTime)
         ├─ 2. Map stage drops to base-equivalent yields via Workshop synthesis recipes (allowCrafting = true)
         ├─ 3. Solve continuous LP relaxation (min c^T x s.t. A x >= b, x >= 0) via Dual Simplex
         └─ 4. Integer rounding with greedy residual cover & redundancy pruning
         │
         ▼
[Farming Plan & Cost Equivalents]
```

---

## 2. Evolution of the Model: From v1 Greedy to v2 Dual Simplex LP with Crafting Substitution

### 2.1 Why v1 Greedy without Crafting Equivalents Failed (`S2-5` vs `1-7`, `CA-2` vs `CA-5`)

In `v1`, `docs/farming.md` originally rejected Linear Programming in favor of a greedy single-item efficiency selector ($E_{s, i} = R_{s, i} / C_s$) that matched stage drops strictly by exact `itemId`. During the `fix/farming-audit` audit on **Kal'tsit** (E0 L1 $\to$ E2 L90, S1–S3 M3, Module X Stage 3), three critical flaws in the `v1` model were identified:

1. **Decoupling Between `resolveDemand` and Stage Drop Tiers (`S2-5` Instead of `1-7`)**:
   - In the Planner, `resolveDemand` (with `craftableTiers = [2, 3, 4, 5]`) decomposes all craftable requirements (`30014` Concentration, `30013` Cluster, `30012` Cube) down to Tier 1 base items (`30011` Orirock: `1,191` units), leaving `rawDeficit['30012'] = 0`.
   - Because `v1` matched drops only by exact `itemId === '30011'`, it ignored `1-7` (`main_01-07`, 6 AP), which drops **1.245 `30012` (Orirock Cube)** per run (`= 3.735` Orirock equivalents per 6 AP, or **`0.6225` Orirock/AP**), and instead selected **`S2-5`** (12 AP, `3.7497` `30011` per run = **`0.3125` Orirock/AP**), doubling the sanity cost.
2. **Skill Summary Tier Mismatch (`CA-2` Instead of `CA-5`)**:
   - `resolveDemand` unrolled `113x 3303` (Summary 3) and `24x 3302` (Summary 2) into `1,099x 3301` (Summary 1).
   - `v1` selected **`CA-2`** (15 AP, `5.0` `3301`/run = `0.3333` `3301`-eq/AP, costing **3,300 AP**) instead of **`CA-5`** (30 AP, `2.0947` `3303` + `1.4914` `3302` = `23.3265` `3301`-eq/run = **`0.7776` `3301`-eq/AP**, costing **1,440 AP**).
3. **T1 vs T3 Stage Selection Across All Craftable Material Families**:
   - `v1` farmed T1 stages (`MN-4` for `30041` Oriron Shard, `GA-4` for `30061` Damaged Device, `S2-9` for `30051` Diketon, `GT-4` for `30021`, `S2-7` for `30031`), inflating Kal'tsit's total farming cost to **33,969 AP on CN** and **116,222 AP on US**.

### 2.2 v2 Formulation: Crafting Substitution (T1-Equivalents) & Dual Simplex LP

When `allowCrafting` is enabled (default `true`, configurable in UI/Settings):

1. **Hierarchical Recipe Equivalence ($E$)**:
   Using Workshop synthesis recipes from `data/recipes.json` (`kind === 'synthesis'`), every higher-tier drop is mapped to its base-ingredient equivalents:
   - `30012` (Orirock Cube) $= 3 \times \text{30011}$ (Orirock)
   - `30013` (Orirock Cluster) $= 5 \times \text{30012} = 15 \times \text{30011}$
   - `30023` / `30033` / `30043` / `30053` / `30063` (Tier 3) $= 4 \times \text{Tier 2} = 12 \times \text{Tier 1}$
   - `3302` (Skill Summary - 2) $= 3 \times \text{3301}$ (Skill Summary - 1)
   - `3303` (Skill Summary - 3) $= 3 \times \text{3302} = 9 \times \text{3301}$

2. **Effective Yield Matrix ($A$)**:
   For each demanded base item $i \in \{1, \dots, m\}$ with required quantity $b_i > 0$ and each open candidate stage $j \in \{1, \dots, n\}$ with sanity cost $c_j = \text{apCost}_j > 0$:
   $$A_{i, j} = \sum_{d \in \text{drops}(j)} R_{j, d} \cdot E(d)_i$$
   where $R_{j, d} = \frac{\text{quantity}_{j, d}}{\text{times}_{j, d}}$ is the expected drop per run and $E(d)_i$ is the number of units of base item $i$ represented by 1 unit of dropped item $d$.

3. **Dual Simplex Linear Program**:
   We solve the primal linear program:
   $$\min_{x \ge 0} \sum_{j=1}^{n} c_j x_j \quad \text{subject to} \quad \sum_{j=1}^{n} A_{i, j} x_j \ge b_i \quad \forall i \in \{1, \dots, m\}$$
   Because $c_j > 0$ for all stages, the initial tableau with basic surplus variables $s_i = -b_i < 0$ is immediately **dual feasible**. The pure TypeScript Dual Simplex solver (`solveContinuousLpDualSimplex`) pivots to the exact global optimum $x^* \ge 0$ in $< 2\text{ ms}$ with zero external dependencies.
   By the fundamental theorem of linear programming, the number of basic stages with $x^*_j > 0$ is at most $m$ (the number of distinct missing materials), so the solution naturally concentrates runs onto the single best stage per bottleneck material while simultaneously accounting for all cross-stage T1/T2/T3 byproducts.

4. **Integer Run Rounding & Redundancy Pruning**:
   - Initialize integer runs $N_j = \lfloor x^*_j \rfloor$.
   - Greedily increment runs for any residual fractional deficit $b_i - \sum_j A_{i, j} N_j > 0$ using highest marginal coverage per sanity.
   - Perform a descending-cost redundancy pass to decrement any $N_j$ whose removal keeps all constraints $\sum_j A_{i, j} N_j \ge b_i$ satisfied.

5. **Impact on Kal'tsit Full Deficit**:
   - **CN Server**: Reduced from **33,969 AP (2,240 runs)** to **17,373 AP (841 runs)** — selecting `1-7`, `CA-5`, `14-12`, `10-3`, `14-18`, `12-16`, `11-12`, `14-20`, `14-8`, etc.
   - **US (Global) Server**: Reduced from **116,222 AP (7,798 runs)** to **18,864 AP (1,068 runs)** — selecting `1-7`, `CA-5`, `14-12`, `11-12`, `12-16`, `14-18`, `10-12`, etc.

---

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
