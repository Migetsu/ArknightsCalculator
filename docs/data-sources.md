# External Data Sources & Attribution (`docs/data-sources.md`)

This document details external data sources, licensing terms, attribution guidelines, and server time conventions used by Arknights Calculator.

---

## 1. Penguin Statistics (企鹅物流数据统计)

- **Website**: [https://penguin-stats.io/](https://penguin-stats.io/)
- **License**: [Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/)
- **License Quote (<15 words)**:
  > _"Free to share and adapt under non-commercial terms with appropriate credit given."_
- **Verification Date**: 2026-10-15
- **Attribution Terms & Polite Use Rules**:
  - **Credit**: Credit Penguin Statistics as the provider of drop rate statistics with a link to [penguin-stats.io](https://penguin-stats.io/).
  - **Non-Commercial**: Use data solely for non-commercial purposes.
  - **No Live Browser Hotlinking**: Never query Penguin Statistics APIs directly from user browsers in runtime. All data is served from local, pre-processed offline JSON snapshots.
  - **Request Identification**: Batch synchronization scripts identify themselves via descriptive `User-Agent: ArknightsCalculator/1.0 (+https://github.com/Migetsu/ArknightsCalculator)`.
  - **Throttling & Backoff**: Polite pauses (>= 400ms) between server endpoints and hard failure on network errors in CI.
- **Implementation in ArkCalc**:
  - Displayed in the footer of the `/farming` module:
    > "Drop statistics provided by Penguin Statistics (CC BY-NC 4.0). Thank you to all contributors. [penguin-stats.io ↗](https://penguin-stats.io/)"
  - Displayed in `data/penguin/*.json` metadata with snapshot timestamp.
  - Polite crawling policy (`User-Agent: ArknightsCalculator/1.0 (+https://github.com/Migetsu/ArknightsCalculator)`, request throttling, cached responses).

---

## 2. Server Timezones & Daily Reset Conventions

In Arknights, the in-game day rolls over daily at **04:00:00 local server time**.

| Server Region   | Operator / Publisher | Timezone                         | UTC Equivalent of 04:00 Reset     | Verification Source & Date                                                                                                                                                                                               |
| :-------------- | :------------------- | :------------------------------- | :-------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CN (China)**  | Hypergryph           | UTC+8 (Beijing/Shanghai)         | 20:00 UTC (previous calendar day) | [PRTS Daily Reset](https://prts.wiki/w/%E6%97%A5%E5%B8%B8%E4%BB%BB%E5%8A%A1) & [zone_table.json](https://raw.githubusercontent.com/Kengxxiao/ArknightsGameData/master/zh_CN/gamedata/excel/zone_table.json) (2026-10-16) |
| **Global / EN** | Yostar               | UTC-7 (Standard Pacific, no DST) | 11:00 UTC (same calendar day)     | [Terra Wiki Missions](https://arknights.wiki.gg/wiki/Missions) & [Yostar Reset Notices](https://arknights.global/) (2026-10-16)                                                                                          |

### Boundary Behavior:

- **03:59:59 Server Time**: Evaluated as the _previous_ calendar day.
- **04:00:00 Server Time**: Rolls over to the _new_ in-game day.
- Unit tested under `tests/unit/shared/farming/schedule.test.ts`.

---

## 3. Game Data & Intellectual Property

- **Copyright Holders**: All character portraits, illustrations, skill icons, item graphics, and game text belong to **Shanghai Hypergryph Network Technology Co., Ltd.** and **Yostar (Hong Kong) Limited**.
- **Usage Context**: Arknights Calculator is a non-commercial, open-source fan companion. Game assets and game data tables are not licensed under the project code repository and are displayed under fair community informational usage.
