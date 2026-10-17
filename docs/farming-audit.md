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

---

## 2. Skill Leveling (Ranks 2→7) & Mastery (M1–M3) Cost Audit: SilverAsh & Kal'tsit

**Live Verification Timestamp**: `2026-10-17T10:02:07.541Z`

- **SilverAsh Wiki URL**: `https://arknights.wiki.gg/wiki/SilverAsh` (`https://arknights.wiki.gg/api.php?action=parse&page=SilverAsh&prop=wikitext&format=json`, HTTP `200 OK`)
  - Quote ($\le 15$ words): `{{Skill upgrade cell|level=8|...|skill3=Truesilver Slash|summary=8|...|m31=Optimized Device,3|m32=Oriron Cluster,4}}`
- **Kal'tsit Wiki URL**: `https://arknights.wiki.gg/wiki/Kal%27tsit` (`https://arknights.wiki.gg/api.php?action=parse&page=Kal%27tsit&prop=wikitext&format=json`, HTTP `200 OK`)
  - Quote ($\le 15$ words): `{{Skill upgrade cell|level=8|...|skill3=Command: Meltdown|m31=White Horse Kohl,4|m32=Aketon,8}}`

### 2.1. Raw JSON Fragments from `data/operators/char_172_svrash.json` & `data/operators/char_003_kalts.json`

#### A. `char_172_svrash` (SilverAsh)

```json
{
  "allSkillLvlup": [
    { "unlockCond": { "phase": 0, "level": 1 }, "lvlUpCost": [{ "id": "3301", "count": 5 }] },
    {
      "unlockCond": { "phase": 0, "level": 1 },
      "lvlUpCost": [
        { "id": "3301", "count": 5 },
        { "id": "30031", "count": 6 },
        { "id": "30041", "count": 4 }
      ]
    },
    {
      "unlockCond": { "phase": 0, "level": 1 },
      "lvlUpCost": [
        { "id": "3302", "count": 8 },
        { "id": "30042", "count": 4 }
      ]
    },
    {
      "unlockCond": { "phase": 1, "level": 1 },
      "lvlUpCost": [
        { "id": "3302", "count": 8 },
        { "id": "30052", "count": 4 },
        { "id": "30012", "count": 5 }
      ]
    },
    {
      "unlockCond": { "phase": 1, "level": 1 },
      "lvlUpCost": [
        { "id": "3302", "count": 8 },
        { "id": "30023", "count": 7 }
      ]
    },
    {
      "unlockCond": { "phase": 1, "level": 1 },
      "lvlUpCost": [
        { "id": "3303", "count": 8 },
        { "id": "30033", "count": 4 },
        { "id": "30083", "count": 5 }
      ]
    }
  ],
  "skills": [
    {
      "skillId": "skchr_svrash_1",
      "masteryCosts": [
        {
          "unlockCond": { "phase": 2, "level": 1 },
          "levelUpCost": [
            { "id": "3303", "count": 6 },
            { "id": "30044", "count": 4 },
            { "id": "30023", "count": 4 }
          ]
        },
        {
          "unlockCond": { "phase": 2, "level": 1 },
          "levelUpCost": [
            { "id": "3303", "count": 12 },
            { "id": "30074", "count": 4 },
            { "id": "30054", "count": 8 }
          ]
        },
        {
          "unlockCond": { "phase": 2, "level": 1 },
          "levelUpCost": [
            { "id": "3303", "count": 15 },
            { "id": "30135", "count": 6 },
            { "id": "30074", "count": 7 }
          ]
        }
      ]
    },
    {
      "skillId": "skchr_svrash_2",
      "masteryCosts": [
        {
          "unlockCond": { "phase": 2, "level": 1 },
          "levelUpCost": [
            { "id": "3303", "count": 6 },
            { "id": "30054", "count": 4 },
            { "id": "30033", "count": 6 }
          ]
        },
        {
          "unlockCond": { "phase": 2, "level": 1 },
          "levelUpCost": [
            { "id": "3303", "count": 12 },
            { "id": "30084", "count": 4 },
            { "id": "30064", "count": 5 }
          ]
        },
        {
          "unlockCond": { "phase": 2, "level": 1 },
          "levelUpCost": [
            { "id": "3303", "count": 15 },
            { "id": "30135", "count": 6 },
            { "id": "30024", "count": 6 }
          ]
        }
      ]
    },
    {
      "skillId": "skchr_svrash_3",
      "masteryCosts": [
        {
          "unlockCond": { "phase": 2, "level": 1 },
          "levelUpCost": [
            { "id": "3303", "count": 6 },
            { "id": "30064", "count": 3 },
            { "id": "30043", "count": 4 }
          ]
        },
        {
          "unlockCond": { "phase": 2, "level": 1 },
          "levelUpCost": [
            { "id": "3303", "count": 12 },
            { "id": "30094", "count": 4 },
            { "id": "30074", "count": 9 }
          ]
        },
        {
          "unlockCond": { "phase": 2, "level": 1 },
          "levelUpCost": [
            { "id": "3303", "count": 15 },
            { "id": "30125", "count": 6 },
            { "id": "30024", "count": 5 }
          ]
        }
      ]
    }
  ]
}
```

#### B. `char_003_kalts` (Kal'tsit)

```json
{
  "allSkillLvlup": [
    { "unlockCond": { "phase": 0, "level": 1 }, "lvlUpCost": [{ "id": "3301", "count": 5 }] },
    {
      "unlockCond": { "phase": 0, "level": 1 },
      "lvlUpCost": [
        { "id": "3301", "count": 5 },
        { "id": "30061", "count": 4 },
        { "id": "30031", "count": 4 }
      ]
    },
    {
      "unlockCond": { "phase": 0, "level": 1 },
      "lvlUpCost": [
        { "id": "3302", "count": 8 },
        { "id": "30012", "count": 7 }
      ]
    },
    {
      "unlockCond": { "phase": 1, "level": 1 },
      "lvlUpCost": [
        { "id": "3302", "count": 8 },
        { "id": "30022", "count": 4 },
        { "id": "30052", "count": 4 }
      ]
    },
    {
      "unlockCond": { "phase": 1, "level": 1 },
      "lvlUpCost": [
        { "id": "3302", "count": 8 },
        { "id": "30043", "count": 6 }
      ]
    },
    {
      "unlockCond": { "phase": 1, "level": 1 },
      "lvlUpCost": [
        { "id": "3303", "count": 8 },
        { "id": "30053", "count": 3 },
        { "id": "30073", "count": 6 }
      ]
    }
  ],
  "skills": [
    {
      "skillId": "skchr_kalts_1",
      "masteryCosts": [
        {
          "unlockCond": { "phase": 2, "level": 1 },
          "levelUpCost": [
            { "id": "3303", "count": 8 },
            { "id": "30054", "count": 4 },
            { "id": "31013", "count": 4 }
          ]
        },
        {
          "unlockCond": { "phase": 2, "level": 1 },
          "levelUpCost": [
            { "id": "3303", "count": 12 },
            { "id": "30094", "count": 4 },
            { "id": "30074", "count": 9 }
          ]
        },
        {
          "unlockCond": { "phase": 2, "level": 1 },
          "levelUpCost": [
            { "id": "3303", "count": 15 },
            { "id": "30115", "count": 6 },
            { "id": "30044", "count": 5 }
          ]
        }
      ]
    },
    {
      "skillId": "skchr_kalts_2",
      "masteryCosts": [
        {
          "unlockCond": { "phase": 2, "level": 1 },
          "levelUpCost": [
            { "id": "3303", "count": 8 },
            { "id": "30064", "count": 3 },
            { "id": "30043", "count": 4 }
          ]
        },
        {
          "unlockCond": { "phase": 2, "level": 1 },
          "levelUpCost": [
            { "id": "3303", "count": 12 },
            { "id": "30104", "count": 4 },
            { "id": "30084", "count": 7 }
          ]
        },
        {
          "unlockCond": { "phase": 2, "level": 1 },
          "levelUpCost": [
            { "id": "3303", "count": 15 },
            { "id": "30135", "count": 6 },
            { "id": "30054", "count": 5 }
          ]
        }
      ]
    },
    {
      "skillId": "skchr_kalts_3",
      "masteryCosts": [
        {
          "unlockCond": { "phase": 2, "level": 1 },
          "levelUpCost": [
            { "id": "3303", "count": 8 },
            { "id": "30074", "count": 4 },
            { "id": "30053", "count": 8 }
          ]
        },
        {
          "unlockCond": { "phase": 2, "level": 1 },
          "levelUpCost": [
            { "id": "3303", "count": 12 },
            { "id": "31034", "count": 4 },
            { "id": "31014", "count": 8 }
          ]
        },
        {
          "unlockCond": { "phase": 2, "level": 1 },
          "levelUpCost": [
            { "id": "3303", "count": 15 },
            { "id": "30145", "count": 6 },
            { "id": "30094", "count": 4 }
          ]
        }
      ]
    }
  ]
}
```

### 2.2. Verification Table: Raw JSON vs `calculateCost` vs `arknights.wiki.gg`

| Оператор      | Уровень                       | Предмет                                                                                    | Сырой JSON        | Наш расчёт `calculateCost` | Wiki.gg (`2026-10-17`) | Совпадает (Да/Нет)                                                 |
| :------------ | :---------------------------- | :----------------------------------------------------------------------------------------- | :---------------- | :------------------------- | :--------------------- | :----------------------------------------------------------------- |
| **SilverAsh** | **Rank 2 → 3**                | Skill Summary - 1 (`3301`) / Ester (`30031`) / Oriron Shard (`30041`)                      | `5 / 6 / 4`       | `5 / 6 / 4`                | `5 / 6 / 4`            | **Да**                                                             |
| **SilverAsh** | **Rank 3 → 4**                | Skill Summary - 2 (`3302`) / Oriron (`30042`)                                              | `8 / 4`           | `8 / 4`                    | `8 / 4`                | **Да**                                                             |
| **SilverAsh** | **Rank 4 → 5**                | Skill Summary - 2 (`3302`) / Polyketon (`30052`) / Orirock Cube (`30012`)                  | `8 / 4 / 5`       | `8 / 4 / 5`                | `8 / 4 / 5`            | **Да**                                                             |
| **SilverAsh** | **Rank 5 → 6**                | Skill Summary - 2 (`3302`) / Sugar Pack (`30023`)                                          | `8 / 7`           | `8 / 7`                    | `8 / 7`                | **Да**                                                             |
| **SilverAsh** | **Rank 6 → 7**                | Skill Summary - 3 (`3303`) / Polyester Pack (`30033`) / Manganese Ore (`30083`)            | `8 / 4 / 5`       | `8 / 4 / 5`                | `8 / 4 / 5`            | **Да**                                                             |
| **SilverAsh** | **S1 M1**                     | Skill Summary - 3 (`3303`) / Oriron Block (`30044`) / Sugar Pack (`30023`)                 | **`6`**` / 4 / 4` | **`6`**` / 4 / 4`          | **`8`**` / 4 / 4`      | **Нет по `3303` (опечатка на Wiki.gg: `8` вместо клиентских `6`)** |
| **SilverAsh** | **S1 M2**                     | Skill Summary - 3 (`3303`) / White Horse Kohl (`30074`) / Keton Colloid (`30054`)          | `12 / 4 / 8`      | `12 / 4 / 8`               | `12 / 4 / 8`           | **Да**                                                             |
| **SilverAsh** | **S1 M3**                     | Skill Summary - 3 (`3303`) / D32 Steel (`30135`) / White Horse Kohl (`30074`)              | `15 / 6 / 7`      | `15 / 6 / 7`               | `15 / 6 / 7`           | **Да**                                                             |
| **SilverAsh** | **S2 M1**                     | Skill Summary - 3 (`3303`) / Keton Colloid (`30054`) / Polyester Pack (`30033`)            | **`6`**` / 4 / 6` | **`6`**` / 4 / 6`          | **`8`**` / 4 / 6`      | **Нет по `3303` (опечатка на Wiki.gg: `8` вместо клиентских `6`)** |
| **SilverAsh** | **S2 M2**                     | Skill Summary - 3 (`3303`) / Manganese Trihydrate (`30084`) / Optimized Device (`30064`)   | `12 / 4 / 5`      | `12 / 4 / 5`               | `12 / 4 / 5`           | **Да**                                                             |
| **SilverAsh** | **S2 M3**                     | Skill Summary - 3 (`3303`) / D32 Steel (`30135`) / Sugar Lump (`30024`)                    | `15 / 6 / 6`      | `15 / 6 / 6`               | `15 / 6 / 6`           | **Да**                                                             |
| **SilverAsh** | **S3 M1 (Truesilver Slash)**  | Skill Summary - 3 (`3303`) / Optimized Device (`30064`) / Oriron Cluster (`30043`)         | **`6`**` / 3 / 4` | **`6`**` / 3 / 4`          | **`8`**` / 3 / 4`      | **Нет по `3303` (опечатка на Wiki.gg: `8` вместо клиентских `6`)** |
| **SilverAsh** | **S3 M2 (Truesilver Slash)**  | Skill Summary - 3 (`3303`) / Grindstone Pent. (`30094`) / White Horse Kohl (`30074`)       | `12 / 4 / 9`      | `12 / 4 / 9`               | `12 / 4 / 9`           | **Да**                                                             |
| **SilverAsh** | **S3 M3 (Truesilver Slash)**  | Skill Summary - 3 (`3303`) / Bipolar Nanoflake (`30125`) / Sugar Lump (`30024`)            | `15 / 6 / 5`      | `15 / 6 / 5`               | `15 / 6 / 5`           | **Да**                                                             |
| **Kal'tsit**  | **Rank 2 → 3**                | Skill Summary - 1 (`3301`) / Damaged Device (`30061`) / Ester (`30031`)                    | `5 / 4 / 4`       | `5 / 4 / 4`                | `5 / 4 / 4`            | **Да**                                                             |
| **Kal'tsit**  | **Rank 3 → 4**                | Skill Summary - 2 (`3302`) / Orirock Cube (`30012`)                                        | `8 / 7`           | `8 / 7`                    | `8 / 7`                | **Да**                                                             |
| **Kal'tsit**  | **Rank 4 → 5**                | Skill Summary - 2 (`3302`) / Sugar (`30022`) / Polyketon (`30052`)                         | `8 / 4 / 4`       | `8 / 4 / 4`                | `8 / 4 / 4`            | **Да**                                                             |
| **Kal'tsit**  | **Rank 5 → 6**                | Skill Summary - 2 (`3302`) / Oriron Cluster (`30043`)                                      | `8 / 6`           | `8 / 6`                    | `8 / 6`                | **Да**                                                             |
| **Kal'tsit**  | **Rank 6 → 7**                | Skill Summary - 3 (`3303`) / Aketon (`30053`) / Loxic Kohl (`30073`)                       | `8 / 3 / 6`       | `8 / 3 / 6`                | `8 / 3 / 6`            | **Да**                                                             |
| **Kal'tsit**  | **S1 M1**                     | Skill Summary - 3 (`3303`) / Keton Colloid (`30054`) / Coagulating Gel (`31013`)           | `8 / 4 / 4`       | `8 / 4 / 4`                | `8 / 4 / 4`            | **Да**                                                             |
| **Kal'tsit**  | **S1 M2**                     | Skill Summary - 3 (`3303`) / Grindstone Pent. (`30094`) / White Horse Kohl (`30074`)       | `12 / 4 / 9`      | `12 / 4 / 9`               | `12 / 4 / 9`           | **Да**                                                             |
| **Kal'tsit**  | **S1 M3**                     | Skill Summary - 3 (`3303`) / Polymerization Prep. (`30115`) / Oriron Block (`30044`)       | `15 / 6 / 5`      | `15 / 6 / 5`               | `15 / 6 / 5`           | **Да**                                                             |
| **Kal'tsit**  | **S2 M1**                     | Skill Summary - 3 (`3303`) / Optimized Device (`30064`) / Oriron Cluster (`30043`)         | `8 / 3 / 4`       | `8 / 3 / 4`                | `8 / 3 / 4`            | **Да**                                                             |
| **Kal'tsit**  | **S2 M2**                     | Skill Summary - 3 (`3303`) / RMA70-24 (`30104`) / Manganese Trihydrate (`30084`)           | `12 / 4 / 7`      | `12 / 4 / 7`               | `12 / 4 / 7`           | **Да**                                                             |
| **Kal'tsit**  | **S2 M3**                     | Skill Summary - 3 (`3303`) / D32 Steel (`30135`) / Keton Colloid (`30054`)                 | `15 / 6 / 5`      | `15 / 6 / 5`               | `15 / 6 / 5`           | **Да**                                                             |
| **Kal'tsit**  | **S3 M1 (Command: Meltdown)** | Skill Summary - 3 (`3303`) / White Horse Kohl (`30074`) / Aketon (`30053`)                 | `8 / 4 / 8`       | `8 / 4 / 8`                | `8 / 4 / 8`            | **Да**                                                             |
| **Kal'tsit**  | **S3 M2 (Command: Meltdown)** | Skill Summary - 3 (`3303`) / Crystalline Circuit (`31034`) / Polymerized Gel (`31014`)     | `12 / 4 / 8`      | `12 / 4 / 8`               | `12 / 4 / 8`           | **Да**                                                             |
| **Kal'tsit**  | **S3 M3 (Command: Meltdown)** | Skill Summary - 3 (`3303`) / Crystalline Elec. Unit (`30145`) / Grindstone Pent. (`30094`) | `15 / 6 / 4`      | `15 / 6 / 4`               | `15 / 6 / 4`           | **Да**                                                             |

### 2.3. Proof on SilverAsh S3 M1 (`3303` Skill Summary - 3 Count)

- **Our JSON (`data/operators/char_172_svrash.json`, `$.skills[2].masteryCosts[0].levelUpCost[0]`)**: `{"id": "3303", "count": 6}` (**6** шт.).
- **Raw CN `Kengxxiao/ArknightsGameData` (`zh_CN/gamedata/excel/character_table.json`, HEAD commit `bee3f83c5d60590b5e1cd42b8d09d00ce32ab10d` `2026-10-16` & pinned `17759cc8` `2026-10-08`, `$["char_172_svrash"].skills[2].levelUpCostCond[0].levelUpCost[0]`)**: `{"id": "3303", "count": 6, "type": "MATERIAL"}` (**6** шт.).
- **Raw EN `SanityGoneAK/arknights-gamedata` (`en/gamedata/excel/character_table.json`, commit `a85e3a9d` `2026-10-14`) & `Kengxxiao/ArknightsGameData_YoStar` (`57010cb5`, `2025-11-13`)**: `{"id": "3303", "count": 6, "type": "MATERIAL"}` (**6** шт.).
- **CN Wiki `prts.wiki` (`https://prts.wiki/w/%E9%93%B6%E7%81%B0`, queried `2026-10-17`)**: `{{材料消耗|技巧概要·卷3|6}}` (**6** шт.).
- **Global Wiki `arknights.wiki.gg` (`https://arknights.wiki.gg/wiki/SilverAsh`, queried `2026-10-17`)**: `summary=8` (**8** шт.).
- **Exact Conclusion**: All official CN and EN game client tables and `prts.wiki` specify **6× `3303`** for SilverAsh S1–S3 M1. Our `calculateCost` output (`6`) is 100% faithful to the game client data; `summary=8` on `arknights.wiki.gg/wiki/SilverAsh` is a wiki typo on that page.

---

## 3. Proof of CN-Exclusive Stage Exclusion for US (`global`)

### 3.1. Exact Code Lines Enforcing Server Filtering

1. **[`scripts/data/build-stages.ts`](file:///c:/Projects/ArknightsCalculator/scripts/data/build-stages.ts#L111-L115) (lines 111–115)**:
   Assigns `servers` strictly from Penguin Statistics `existence.{CN,US}.exist`:
   ```ts
   const servers: ServerRegion[] = []
   if (pStage.existence?.CN?.exist) servers.push('cn')
   if (pStage.existence?.US?.exist) servers.push('global')
   if (servers.length === 0) servers.push('cn')
   ```
2. **[`scripts/data/fetch-penguin.ts`](file:///c:/Projects/ArknightsCalculator/scripts/data/fetch-penguin.ts#L139-L154) (lines 139–154)**:
   Excludes any drop entry whose stage is not in `stage.servers` for the target server or has `ex.exist === false`, and records `exist`, `openTime`, `closeTime`:
   ```ts
   const serverKey = server === 'CN' ? 'cn' : 'global'
   if (!stage.servers.includes(serverKey)) continue

   const ex = existenceByStageId.get(entry.stageId)
   if (ex && ex.exist === false) continue
   ```
3. **[`shared/utils/farming/optimize.ts`](file:///c:/Projects/ArknightsCalculator/shared/utils/farming/optimize.ts#L92-L97) (lines 92–97 & 268–288)**:
   Verifies both `isStageCurrentlyOpen(stage, now)` and `meta.servers.includes(server)` at runtime:
   ```ts
   export function isStageCurrentlyOpen(stage: PenguinStageMatrix, now: number): boolean {
     if (stage.exist === false) return false
     if (typeof stage.openTime === 'number' && stage.openTime > now) return false
     if (typeof stage.closeTime === 'number' && stage.closeTime <= now) return false
     return true
   }
   ```
   ```ts
   if (stagesMap) {
     const meta = stagesMap[stage.stageId]
     if (!meta || meta.matchedGameData === false) continue
     if (!meta.servers.includes(server)) continue
   }
   ```

### 3.2. Trace of 3 Real CN-Exclusive Stages in `data/stages.json`, `data/penguin/cn.json`, and `data/penguin/us.json`

| `stageId`           | Code      | `data/stages.json` (`servers`)         | `data/penguin/cn.json`                                                                               | `data/penguin/us.json`   | Why Excluded on `server=global` (`us`)                                                                                    |
| :------------------ | :-------- | :------------------------------------- | :--------------------------------------------------------------------------------------------------- | :----------------------- | :------------------------------------------------------------------------------------------------------------------------ |
| `main_17-09`        | **17-10** | `["cn"]` (`existence.US.exist: false`) | Present (`apCost: 21`, `exist: true`, `openTime: 1777608000000`, `closeTime: null`, 15 drops)        | **Absent (`undefined`)** | Absent from `us.json` matrix AND `stages["main_17-09"].servers` is `["cn"]` (does not include `"global"`).                |
| `act16side_04_perm` | **GA-4**  | `["cn"]` (`existence.US.exist: false`) | Present (`apCost: 12`, `exist: true`, `openTime: 1678132800000`, `closeTime: null`, 7 drops)         | **Absent (`undefined`)** | Absent from `us.json` matrix AND `stages["act16side_04_perm"].servers` is `["cn"]`.                                       |
| `act52side_02`      | **YW-2**  | `["cn"]` (`existence.US.exist: false`) | Present (`apCost: 9`, `exist: true`, `openTime: 1791518400000`, `closeTime: 1792699200000`, 7 drops) | **Absent (`undefined`)** | Absent from `us.json`, `servers` is `["cn"]`, and `isStageCurrentlyOpen` also rejects it outside `[openTime, closeTime)`. |

---

## 4. LMD (`CE-1..CE-6`) & EXP (`LS-1..LS-6`) Supply Stages Verification & Kal'tsit Sanity Recalculation

**Verification Date**: `2026-10-17`

- **Raw Game Data**: `.cache/raw/en/stage_table.json` (`SanityGoneAK/arknights-gamedata`, commit `b5ff1ff3c389d18d8c0fcfa30735bd90f1d1ac74`, `$["stages"]["wk_melee_1..6"]` & `$["stages"]["wk_kc_1..6"]`) and `data/constants.json` (`expItems`).
- **Live Wiki Queries (`2026-10-17`)**:
  - `https://arknights.wiki.gg/wiki/Operation/Supply` (`https://arknights.wiki.gg/api.php?action=parse&page=Operation/Supply&prop=wikitext&format=json`, HTTP `200 OK`)
    - Quote: `"'''Tactical Drill''' ('''LS''') operations mainly award {{I|Battle Record|2=Battle Records}}."`
  - `https://arknights.wiki.gg/wiki/LMD` (`https://arknights.wiki.gg/api.php?action=parse&page=LMD&prop=wikitext&format=json`, HTTP `200 OK`)
    - Quote: `"Every [[operation]] awards LMD... equal to 10 times of the {{I|Sanity|g=0}} spent... increased by 20% when it is cleared with 3 stars"`
  - `https://arknights.wiki.gg/wiki/Battle_Record` (`https://arknights.wiki.gg/api.php?action=parse&page=Battle_Record&prop=wikitext&format=json`, HTTP `200 OK`)
    - EXP equivalents: `2001` (Drill) = `200` EXP, `2002` (Frontline) = `400` EXP, `2003` (Tactical) = `1,000` EXP, `2004` (Strategic) = `2,000` EXP.
  - `https://arknights.wiki.gg/wiki/CE-6` & `https://arknights.wiki.gg/wiki/LS-6` (queried `2026-10-17`, HTTP `200 OK`):
    - `CE-6` quote: `"|cost=36 ... |reg drop={{I|LMD|10000}}"`
    - `LS-6` quote: `"|cost=36 ... |reg drop={{I|Strategic Battle Record|4}}{{I|Tactical Battle Record|2}}"`

### 4.1. Verified `CE-1..CE-6` & `LS-1..LS-6` Parameters

| `stageId`    | Code     | `apCost` | 2★ `goldGain` (`stage_table.json`) | Guaranteed 3★ Clear Output                                           | Efficiency (`per AP`) |
| :----------- | :------- | :------: | :--------------------------------: | :------------------------------------------------------------------- | :-------------------- |
| `wk_melee_1` | **CE-1** |    10    |               1,410                | `1,700` LMD (`4001`)                                                 | `170.00` LMD / AP     |
| `wk_melee_2` | **CE-2** |    15    |               2,325                | `2,800` LMD (`4001`)                                                 | `186.67` LMD / AP     |
| `wk_melee_3` | **CE-3** |    20    |               3,410                | `4,100` LMD (`4001`)                                                 | `205.00` LMD / AP     |
| `wk_melee_4` | **CE-4** |    25    |               4,740                | `5,700` LMD (`4001`)                                                 | `228.00` LMD / AP     |
| `wk_melee_5` | **CE-5** |    30    |               6,240                | `7,500` LMD (`4001`)                                                 | `250.00` LMD / AP     |
| `wk_melee_6` | **CE-6** |  **36**  |             **8,325**              | **`10,000` LMD (`4001`)**                                            | **`277.78` LMD / AP** |
| `wk_kc_1`    | **LS-1** |    10    |                100                 | `3× 2002` + `2× 2001` = `1,600` EXP                                  | `160.00` EXP / AP     |
| `wk_kc_2`    | **LS-2** |    15    |                150                 | `5× 2002` + `4× 2001` = `2,800` EXP                                  | `186.67` EXP / AP     |
| `wk_kc_3`    | **LS-3** |    20    |                200                 | `3× 2003` + `1.75× 2002` + `2× 2001` = `4,100` EXP                   | `205.00` EXP / AP     |
| `wk_kc_4`    | **LS-4** |    25    |                250                 | `1× 2004` + `2× 2003` + `3× 2002` + `2× 2001` = `5,600` EXP          | `224.00` EXP / AP     |
| `wk_kc_5`    | **LS-5** |    30    |                300                 | `3× 2004` + `1× 2003` + `1× 2002` = `7,400` EXP                      | `246.67` EXP / AP     |
| `wk_kc_6`    | **LS-6** |  **36**  |              **360**               | **`4× 2004` (`8,000` EXP) + `2× 2003` (`2,000` EXP) = `10,000` EXP** | **`277.78` EXP / AP** |

### 4.2. Kal'tsit Full Plan Sanity Recalculation (Before vs After LMD & EXP Integration)

For **Kal'tsit** (`char_003_kalts`, E0 L1 $\to$ E2 L90, Skill 1$\to$7, S1–S3 M3, Module X `uniequip_002_kalts` Stage 3, empty depot, `allowCrafting = true`):

| Component                           | Demand                                                      | Selected Stage(s)           |    Runs (CN / US)     |     Sanity Cost (CN / US)     |
| :---------------------------------- | :---------------------------------------------------------- | :-------------------------- | :-------------------: | :---------------------------: |
| **Materials Only (Before LMD/EXP)** | Post-workshop raw material deficit (`resolvedRawDeficit`)   | `1-7`, `CA-5`, `14-12`, ... |    `840` / `1,073`    | **`17,265` AP / `18,783` AP** |
| **LMD (`4001`, +Crafting LMD)**     | `1,634,796` upgrade + `279,500` craft = **`1,914,296` LMD** | **`CE-6` (`wk_melee_6`)**   |     `192` / `192`     |  **`6,912` AP / `6,912` AP**  |
| **EXP (`2001`–`2004` Equivalent)**  | **`1,111,400` EXP** (`555× 2004 + 1× 2003 + 1× 2002`)       | **`LS-6` (`wk_kc_6`)**      |     `112` / `112`     |  **`4,032` AP / `4,032` AP**  |
| **Full Plan Total (After)**         | Materials + LMD + EXP                                       | Materials + `CE-6` + `LS-6` | **`1,144` / `1,377`** | **`28,209` AP / `29,727` AP** |

_(Note: With default 0 modules selected in the Planner UI, upgrade LMD is `1,334,796` + `225,900` craft LMD = `1,560,696` LMD $\to$ `157` runs of `CE-6` (`5,652` AP) + `112` runs of `LS-6` (`4,032` AP) + materials (`15,825` AP on CN / `17,250` AP on US) = **`25,509` AP on CN (`1,047` runs)** and **`26,934` AP on US (`1,260` runs)**.)_
