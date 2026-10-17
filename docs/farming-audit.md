# Farming Optimizer Diagnostic Audit (`docs/farming-audit.md`)

**Audit Date**: 2026-10-17  
**Verified Sources**:

- Penguin Statistics Stages API: `https://penguin-stats.io/PenguinStats/api/v2/stages` (queried 2026-10-17)
- Penguin Statistics CN Matrix API: `https://penguin-stats.io/PenguinStats/api/v2/result/matrix?server=CN` (queried 2026-10-17)
- Penguin Statistics US Matrix API: `https://penguin-stats.io/PenguinStats/api/v2/result/matrix?server=US` (queried 2026-10-17)
- Local snapshots: `data/penguin/cn.json`, `data/penguin/us.json`, `data/stages.json`

---

## 1a. Stage Comparison: Live Penguin Stats vs Local Snapshot (`data/penguin/cn.json`)

In the Penguin Statistics API (`/PenguinStats/api/v2/stages`), stage availability per server is stored under the `existence` field with the exact schema:

```json
"existence": {
  "CN": { "exist": true, "openTime": 1647331200000, "closeTime": 1648497600000 },
  "US": { "exist": true, "openTime": 1663347600000, "closeTime": 1664535600000 }
}
```

- Permanent story/supply stages have `exist: true` and either no `openTime`/`closeTime` or only `openTime` in the past.
- Temporary event stages (`act13d5_04`, `act16side_04`, `a001_04`) have both `openTime` and `closeTime` in the past (closed), whereas their permanent Side Story Archive counterparts (`act13d5_04_perm`, `act16side_04_perm`, `a001_04_perm`) have `openTime` in the past and no `closeTime` (permanently open in CN; `act16side_04_perm` has `US.exist: false`).

| Code      | `stageId`           | Type / Zone   | `apCost` (Penguin / Snapshot) | Key Item (`itemId`)           | Penguin Live (`quantity / times = rate`) | Our Snapshot (`quantity / times = rate`) | `existence.CN` (`exist` / `openTime` / `closeTime`)      | Open Now on CN?   | Matches? |
| :-------- | :------------------ | :------------ | :---------------------------- | :---------------------------- | :--------------------------------------- | :--------------------------------------- | :------------------------------------------------------- | :---------------- | :------- |
| **S2-5**  | `sub_02-05`         | Main Ch.2     | `12 / 12`                     | `30011` (Orirock)             | `80420 / 21447 = 3.7497`                 | `80420 / 21447 = 3.7497`                 | `exist: true` (permanent)                                | **Yes**           | **Yes**  |
| **MN-4**  | `act13d5_04`        | Event (2020)  | `12 / —`                      | `30041` (Oriron Shard)        | Excluded from open matrix                | Not in `cn.json`                         | `exist: true, open: 1602748800000, close: 1603915200000` | **No** (Closed)   | **Yes**  |
| **MN-4**  | `act13d5_04_perm`   | Archive Perm  | `12 / 12`                     | `30041` (Oriron Shard)        | `3348 / 1777 = 1.8841`                   | `3348 / 1777 = 1.8841`                   | `exist: true, open: 1634241600000`                       | **Yes** (Archive) | **Yes**  |
| **GA-4**  | `act16side_04`      | Event (2022)  | `12 / —`                      | `30061` (Damaged Device)      | Excluded from open matrix                | Not in `cn.json`                         | `exist: true, open: 1647331200000, close: 1648497600000` | **No** (Closed)   | **Yes**  |
| **GA-4**  | `act16side_04_perm` | Archive Perm  | `12 / 12`                     | `30061` (Damaged Device)      | `6003 / 3975 = 1.5102`                   | `6003 / 3975 = 1.5102`                   | `exist: true, open: 1678132800000` (`US.exist: false`)   | **Yes** (CN only) | **Yes**  |
| **GT-4**  | `a001_04`           | Event (2019)  | `12 / —`                      | `30021` (Sugar Sub.)          | Excluded from open matrix                | Not in `cn.json`                         | `exist: true, open: 1559181600000, close: 1560369599000` | **No** (Closed)   | **Yes**  |
| **GT-4**  | `a001_04_perm`      | Archive Perm  | `12 / 12`                     | `30021` (Sugar Sub.)          | `11491 / 4880 = 2.3547`                  | `11491 / 4880 = 2.3547`                  | `exist: true, open: 1618473600000`                       | **Yes** (Archive) | **Yes**  |
| **CA-2**  | `wk_fly_2`          | Supply Weekly | `15 / 15`                     | `3301` (Skill Summary 1)      | `21590 / 4318 = 5.0000`                  | `21590 / 4318 = 5.0000`                  | `exist: true` (Tue/Wed/Fri/Sun)                          | **Yes**           | **Yes**  |
| **9-19**  | `main_09-17`        | Main Ch.9     | `21 / 21`                     | `30103` (RMA70-12)            | `366051 / 913908 = 0.4005`               | `366033 / 913865 = 0.4005`               | `exist: true, open: 1631865600000`                       | **Yes**           | **Yes**  |
| **1-7**   | `main_01-07`        | Main Ch.1     | `6 / 6`                       | `30012` (Orirock Cube)        | `2693519737 / 2163458042 = 1.2450`       | `2691532989 / 2161862344 = 1.2450`       | `exist: true` (permanent)                                | **Yes**           | **Yes**  |
| **14-8**  | `main_14-07`        | Main Ch.14    | `21 / 21`                     | `31013` (Coagulating Gel)     | `264081 / 544316 = 0.4852`               | `264070 / 544288 = 0.4852`               | `exist: true, open: 1714550400000`                       | **Yes**           | **Yes**  |
| **17-10** | `main_17-09`        | Main Ch.17    | `21 / 21`                     | `31043` (Semi-Synth. Solvent) | `12774 / 27300 = 0.4679`                 | `12752 / 27250 = 0.4680`                 | `exist: true, open: 1777608000000` (`US.exist: false`)   | **Yes** (CN only) | **Yes**  |

---

## 1b. Expected Drop Formula Verification (`shared/utils/farming`)

1. **Snapshot Normalization (`scripts/data/fetch-penguin.ts:127`)**:
   $$\text{dropRate} = \frac{\text{Math.round}\left(\frac{\text{quantity}}{\text{times}} \times 10000\right)}{10000}$$
2. **Expected Yield Calculation (`shared/utils/farming/optimize.ts:132, 178`)**:
   $$\text{runs} = \left\lceil \frac{\text{neededQty}}{\text{dropRate}} \right\rceil, \quad \text{expectedQuantity} = \frac{\text{Math.round}(\text{runs} \times \text{dropRate} \times 10)}{10}$$
3. **Why S2-5 yields 3.75 Orirock (`30011`) per run**:
   - In `data/penguin/cn.json` (and live Penguin Stats), `sub_02-05` (`S2-5`, 12 AP) drops multiple `30011` per clear (guaranteed 3–5 drops per run).
   - Empirical totals: $\text{quantity} = 80,420$, $\text{times} = 21,447$.
   - Exact ratio: $\frac{80420}{21447} = 3.74970858\dots \to \text{dropRate} = \mathbf{3.7497}$ items per run.
   - For a deficit of $1,071$–$1,072$ Orirock: $\lceil 1072 / 3.7497 \rceil = 286\text{ runs}$, and $286 \times 3.7497 = 1072.4142 \to \mathbf{1072.4}$ expected Orirock ($1072.4 / 286 = 3.75$ per run).
4. **Why CA-2 yields 5.0 Skill Summary - 1 (`3301`) per run**:
   - In `data/penguin/cn.json` (and live Penguin Stats), `wk_fly_2` (`CA-2`, 15 AP) has a deterministic fixed drop of 5x `3301` per clear:
   - Empirical totals: $\text{quantity} = 21,590$, $\text{times} = 4,318$.
   - Exact ratio: $\frac{21590}{4318} = \mathbf{5.0000}$ items per run.

- **Conclusion on formula**: The per-run drop formula `quantity / times` is mathematically accurate (`quantity` in Penguin Stats is total items dropped across `times` clears, so `quantity / times` > 1 when a stage drops multiple copies per clear).

---

## 1c. Presence of `1-7` (`main_01-07`) and Top-5 Stages for Orirock (`30011`) vs Orirock Cube (`30012`)

- **Is `1-7` in `data/penguin/cn.json` and `data/stages.json`?**
  **Yes.** Stage `main_01-07` (`code: "1-7"`, `apCost: 6`) is present in `data/stages.json` (`matchedGameData: true`, `servers: ["cn", "global"]`) and in `data/penguin/cn.json` with 19 drop entries (`2,161,862,344` samples for `30012`). It was **not** lost during fetching, threshold filtering, or stage matching.

### Top-5 Stages for `30011` (Orirock, Tier 1) by Direct Drop Efficiency (`dropRate / apCost`)

| Rank | Code     | `stageId`      | `apCost` | `quantity / times` (Penguin & Snapshot) | `dropRate` | Efficiency (`items / AP`)      |
| :--- | :------- | :------------- | :------- | :-------------------------------------- | :--------- | :----------------------------- |
| 1    | **S2-5** | `sub_02-05`    | 12       | `80,420 / 21,447`                       | `3.7497`   | **0.3125** (`3.20 AP / item`)  |
| 2    | **GT-3** | `a001_03_perm` | 12       | `2,902 / 842`                           | `3.4466`   | **0.2872** (`3.48 AP / item`)  |
| 3    | **0-9**  | `main_00-09`   | 6        | `66,677 / 39,422`                       | `1.6914`   | **0.2819** (`3.55 AP / item`)  |
| 4    | **YW-2** | `act52side_02` | 9        | `4,435 / 7,066`                         | `0.6277`   | **0.0697** (`14.34 AP / item`) |
| 5    | **14-3** | `tough_14-02`  | 21       | `34,836 / 23,884`                       | `1.4585`   | **0.0695** (`14.40 AP / item`) |

_(Note: On `1-7`, direct T1 `30011` only drops during special supply events: `2,005 / 16,896 = 0.1187`, efficiency `0.0198 / AP`)._

### Top-5 Stages for `30012` (Orirock Cube, Tier 2) by Direct Drop Efficiency (`dropRate / apCost`)

| Rank | Code      | `stageId`           | `apCost` | `quantity / times` (Penguin & Snapshot) | `dropRate` | Efficiency (`Cubes / AP`)     | Equivalent `30011 / AP` ($\times 3$) |
| :--- | :-------- | :------------------ | :------- | :-------------------------------------- | :--------- | :---------------------------- | :----------------------------------- |
| 1    | **1-7**   | `main_01-07`        | 6        | `2,691,532,989 / 2,161,862,344`         | `1.2450`   | **0.2075** (`4.82 AP / Cube`) | **0.6225** (`1.61 AP / Orirock`)     |
| 2    | **S2-12** | `sub_02-12`         | 15       | `2,353,966 / 1,027,531`                 | `2.2909`   | **0.1527** (`6.55 AP / Cube`) | **0.4582** (`2.18 AP / Orirock`)     |
| 3    | **DV-5**  | `act19side_05_perm` | 15       | `13,159 / 5,778`                        | `2.2774`   | **0.1518** (`6.59 AP / Cube`) | **0.4555** (`2.20 AP / Orirock`)     |
| 4    | **DM-5**  | `act9d0_05_perm`    | 15       | `163,064 / 71,793`                      | `2.2713`   | **0.1514** (`6.60 AP / Cube`) | **0.4543** (`2.20 AP / Orirock`)     |
| 5    | **IW-1**  | `act15side_01_perm` | 9        | `1,256 / 1,001`                         | `1.2547`   | **0.1394** (`7.17 AP / Cube`) | **0.4182** (`2.39 AP / Orirock`)     |

- **Why the optimizer chose `S2-5` instead of `1-7`**:
  `resolveDemand` in `plannerStore` decomposed all Tier 2 `30012` (Orirock Cube) requirements into Tier 1 `30011` (Orirock) at 1:3 ratio, leaving `rawDeficit['30012'] = 0` and `rawDeficit['30011'] = 1191` (or `1072` with partial depot stock). Because `optimizeFarming` matched stage drops strictly by exact `itemId === '30011'` without knowing that 1x `30012` substitutes for 3x `30011`, it ignored `1-7`'s `1.2450` `30012` drop and picked `S2-5`.

---

## 1d. Server & Closed Stage Filtering Audit

1. **Missing `existence` (`exist`, `openTime`, `closeTime`) in `data/penguin/*.json`**:
   - `scripts/data/fetch-penguin.ts` only fetched `/result/matrix` and did not store `exist`, `openTime`, or `closeTime` from `/stages`.
   - While Penguin's `/result/matrix` excludes past closed events by default, it includes **currently active temporary events** — specifically **8 stages** of `act52side` (`YW-1` through `YW-8`, `openTime: 1791518400000`, `closeTime: 1792699200000`) in `cn.json`. Once the event closes, a static snapshot without `closeTime` continues recommending closed event stages.
2. **Server Attribution Bug in `scripts/data/build-stages.ts`**:
   - `fetchPenguinStages('US')` queried `https://penguin-stats.io/PenguinStats/api/v2/stages?server=US`, which returns **all 1,620 stages** in Penguin's database (with `existence.US.exist: false` for CN-only stages).
   - Because `build-stages.ts` set `inUS = true` for every element in that response array, `if (inUS || pStage.existence?.US?.exist)` marked **all 1,620 stages** in `data/stages.json` with `servers: ["cn", "global"]`.
   - Across `data/stages.json` (1,620 stages total):
     - **997 stages** are currently closed or unavailable on **CN** (`!exist || openTime > now || closeTime <= now`).
     - **286 stages** do not exist on **US** (`existence.US.exist === false`, including `main_17-09` `17-10` and `act16side_04_perm` `GA-4`).
     - **804 stages** exist on **US** but are closed temporary/rerun events (`closeTime <= now`), totaling **1,090 unavailable stages on US**.

---

## 1e. Workshop Crafting vs Direct Farming Audit (Kal'tsit Example)

For **Kal'tsit** (E0 L1 $\to$ E2 L90, Skill 1$\to$7, S1–S3 M3, Module X Stage 3, empty depot):

- **Direct upgrade requirements (`calculateCost`)**:
  - `30011` (Orirock T1): **0** needed directly.
  - `30012` (Orirock Cube T2): **7** needed directly (Skill Lv 4$\to$5) + **390** needed to craft `30013` (Orirock Cluster T3) for `30014` (Orirock Concentration T4) and `30145`/`30135`/`30115` (T5) = **397 Cubes total**.
  - `3301` (Skill Summary 1): **10** needed directly; `3302`: **24**; `3303`: **113**.
- **What `resolveDemand` did**:
  - Unrolled all 397x `30012` (Orirock Cube) via recipe `wf_34` (`3x 30011 -> 1x 30012`) into **1,191x `30011` (Orirock T1)** (plus 39,700 LMD crafting fee).
  - Unrolled all 113x `3303` and 24x `3302` via `wf_38` and `wf_37` into $10 + 24 \times 3 + 113 \times 9 = \mathbf{1,099\text{x } 3301}$.
  - Unrolled `30043` (Oriron Cluster) into **1,080x `30041`**, `30053` (Aketon) into **759x `30051`**, `30063` (Integrated Device) into **616x `30061`**, `30023` (Sugar Pack) into **420x `30021`**, and `30033` (Polyester Pack) into **364x `30031`**.
- **Consequence in `optimizeFarming` v1**:
  - Because `optimizeFarming` did not know that 1x `30012` dropped on `1-7` satisfies 3x `30011` (or 1x `30013` satisfies 15x `30011`), it farmed **318 runs of `S2-5` (3,816 Sanity)** instead of `1-7` (**~1,854 Sanity** standalone, or even less with Chapter 11/14 T3 byproducts).
  - Similarly, it farmed `MN-4` (6,888 Sanity for T1 `30041`), `GA-4` (4,476 Sanity for T1 `30061`), `S2-9` (3,588 Sanity for T1 `30051`), and `CA-2` (3,300 Sanity for T1 `3301` instead of `CA-5` at 1,380 Sanity).
  - Total sanity inflated to **33,969 Sanity on CN** and **116,222 Sanity on US**, whereas Linear Programming with recipe substitution reduces this to **~17,298 Sanity on CN** and **~18,750 Sanity on US**.
