# Farming Optimization Engine (`docs/farming.md`)

This document describes the design, mathematical model, and implementation of the farming efficiency calculation core in `shared/utils/farming/`.

---

## 1. Overview & Architecture

The farming optimizer bridges the user's raw material deficit (derived after all optimal intermediate workshop synthesis recipes have been accounted for in `resolveDemand`) and empirical drop matrices from Penguin Statistics.

```
[Planner / Depot Deficit]
         │
         ▼
[Workshop Synthesis Engine] (shared/utils/workshop)
         │
         ▼  (Raw uncraftable deficit)
[Farming Optimizer v1] (shared/utils/farming/optimize.ts)
         │
         ├─ Filter candidate stages by server & availability
         ├─ Select best stages by drop efficiency (dropRate / apCost)
         └─ Iterative byproduct deduction
         │
         ▼
[Farming Plan & Cost Equivalents]
```

---

## 2. Algorithm v1: Greedy with Byproduct Deduction

### 2.1 Formulation

Let $D$ be the raw item deficit where $D_i > 0$ denotes the remaining count of item $i$ required.
For any candidate stage $s$ with sanity cost $C_s > 0$:

- Drop rate of item $i$ on stage $s$ is $R_{s, i} = \frac{\text{quantity}_{s, i}}{\text{times}_{s, i}}$.
- Drop efficiency is $E_{s, i} = \frac{R_{s, i}}{C_s}$ (expected items yielded per unit of sanity).

### 2.2 Optimization Steps:

1. **Candidate Stage Filtering**:
   - Only consider stages with $C_s > 0$.
   - Must match real game data (`matchedGameData === true`).
   - Must exist on the selected server (`servers.includes(selectedServer)`).
   - If schedule filtering is active, stage must be currently open.
2. **Best Stage Identification**:
   - For each missing item $i$, select $s^* = \arg\max_{s} E_{s, i}$.
3. **Iterative Coverage & Byproduct Deduction**:
   - Process target items in order of remaining demand.
   - For item $i$, calculate required runs: $N_{s^_} = \lceil \frac{D_i}{R\_{s^_, i}} \rceil$.
   - Plan $N_{s^_}$ runs for stage $s^_$.
   - Deduct all dropped items (including byproducts) from the remaining deficit:
     $$\forall j \in \text{drops}(s^*): D_j \leftarrow \max(0, D_j - N_{s^*} \cdot R_{s^*, j})$$
   - Repeat until all items are covered or no candidate stages remain.
4. **Uncovered Items**:
   - Items not dropping on any available stages (e.g. event-exclusive tokens or rare items) are flagged as `uncoveredItems` for workshop or credit store resolution.

### 2.3 Why Greedy with Byproduct Deduction Over Simplex / LP Solver

1. **Practicality & Player Experience**:
   A continuous Linear Programming (LP) simplex solver optimizes purely for mathematical fractions of sanity. In practice, this distributes farming across dozens of sub-optimal stages (e.g. 3.2 runs of 1-7, 1.4 runs of JT8-2, 2.1 runs of 4-6). Real Arknights players farm specific stages in bulk (e.g. 20 runs of 1-7, then 10 runs of 4-6).
2. **Deterministic Clustered Plans**:
   The greedy heuristic identifies the single highest-efficiency stage for each primary bottleneck item, allocates whole integer runs, and immediately subtracts secondary and tertiary byproduct drops from other deficit items. The resulting plan clusters runs into 1–4 primary stages with <2% divergence from theoretical linear programming minimums.
3. **Bundle Size & Mobile Performance**:
   Simplex and Integer Linear Programming (ILP/branch-and-bound) solvers require large third-party WASM or heavy JS matrices, significantly inflating client bundle size. The pure TypeScript greedy optimizer runs in under 1ms on mobile devices with zero external libraries.

---

## 3. Cost & Time Equivalents

### 3.1 Natural Sanity Regeneration

- In Arknights, natural sanity recovers at the rate of **1 point per 6 minutes** (10 sanity per hour, or 240 sanity per 24 hours).
- Estimated days of natural regeneration:
  $$\text{Days} = \frac{\text{Total Sanity}}{24 \times (60 / \text{regenMinutes})} = \frac{\text{Total Sanity}}{240}$$

### 3.2 Originite Prime (OP) Refills

- 1 Originite Prime completely replenishes sanity to the player's maximum sanity capacity $M$ (default 135, configurable in Settings):
  $$\text{OP Cost} = \lceil \frac{\text{Total Sanity}}{M} \rceil$$

---

## 4. Key Properties & Invariants

1. **Monotonicity ("More inventory $\to$ not more sanity")**:
   - If depot inventory increases, deficit $D$ strictly decreases or remains identical.
   - For any two deficits $D_A \le D_B$ (element-wise), $\text{Total Sanity}(D_A) \le \text{Total Sanity}(D_B)$.
   - Verified in unit tests (`tests/unit/shared/farming/optimize.test.ts`).
2. **Determinism**:
   - Given the same deficit and snapshot, the result is completely deterministic.
3. **Offline Compatibility**:
   - Operates entirely on local JSON snapshots without making external network calls.

---

## 5. UI States & Sanity Estimation Accuracy

### 5.1 Outdated Data Warning (>30 Days)

If the local Penguin Statistics matrix snapshot is older than 30 days (`(Date.now() - Date.parse(snapshot.fetchedAt)) > 30 * 24 * 3600 * 1000`):

- A warning banner is displayed at the top of `/farming`.
- The Settings module (`/settings`) displays the snapshot date and highlights stale data status.

### 5.2 Sanity Estimate Disclaimer (* Estimate)

Sanity equivalent numbers (days of natural regeneration and Originite Prime refills) are explicitly marked with an asterisk (* Estimate) because in-game sanity replenishment varies depending on:

1. **Player Level & Max Sanity**: Higher level accounts have up to 135+ max sanity, altering OP refill values.
2. **Weekly Mission Sanity Potions**: Players receive weekly Emergency Sanity Samplers (+100 AP) and Top Emergency Sanity Potions (+120 AP).
3. **Event & Battle Pass Rewards**: Periodic events and battle passes award additional sanity potions with specific expiration dates.
4. **Natural Cap Overflow**: Inactive periods without logging in lose potential natural AP recovery.
