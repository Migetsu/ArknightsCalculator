# Licenses and attribution

This document explains the separate terms for the code, community data, game data, and
assets in Arknights Companion. The short version is in [NOTICE](../NOTICE); the MIT text
is in [LICENSE](../LICENSE).

## At a glance

| Component                                                                               | Terms                                         | Source                                                                |
| --------------------------------------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------- |
| Application code, calculation cores, components, scripts, tests                         | **MIT**                                       | This repository                                                       |
| Wiki-derived data (operator translations, banner names, dates, rate-ups, skin metadata) | **CC-BY-SA 4.0**                              | [Arknights Terra Wiki](https://arknights.wiki.gg)                     |
| Arknights game data tables and game artwork                                             | Proprietary; **not** licensed by this project | Hypergryph / Yostar                                                   |
| CN banner/operator art source files                                                     | No license file at source; attribution only   | [fexli/ArknightsResource](https://github.com/fexli/ArknightsResource) |
| Drop-rate statistics                                                                    | **CC BY-NC 4.0**                              | [Penguin Statistics](https://penguin-stats.io/)                       |
| Optimized WebP thumbnails                                                               | Derived; original terms still apply           | [Migetsu/arkcalc-assets](https://github.com/Migetsu/arkcalc-assets)   |
| npm dependencies                                                                        | Their own licenses                            | `package.json`, `package-lock.json`                                   |

## 1. Code: MIT

The application code is MIT-licensed. You may reuse, modify, and redistribute it under
the MIT conditions (copyright notice and permission notice included). The MIT license does
not cover data or artwork.

## 2. Wiki data: CC-BY-SA 4.0

Data derived from Arknights Terra Wiki is licensed under
[CC-BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

Attribution:

> Data derived from Arknights Terra Wiki contributors,
> https://arknights.wiki.gg, licensed under CC-BY-SA 4.0. Changes: normalized, merged,
> machine-assisted translations, and optimized assets.

Affected files include `data/wiki-banners.json`, `data/i18n/wiki/*.json`, and
wiki-derived fields in `data/banners.json` and `data/skins.json`.

If you reuse this data, keep the attribution, link the license, indicate changes, and
share derivative data under CC-BY-SA 4.0.

## 3. Game IP and game data: proprietary

Arknights and all related characters, artwork, names, story text, and game parameters
belong to **Hypergryph Co., Ltd.** and **Yostar (Hong Kong) Limited**. This is an
unofficial, non-commercial fan project. Game data and artwork are used for informational
purposes only and are not relicensed by this repository. The in-app footer and README
display the required disclaimer.

## 4. fexli/ArknightsResource

Some CN banner and operator art is sourced from
[fexli/ArknightsResource](https://github.com/fexli/ArknightsResource). The repository had
no `LICENSE` file when checked on 2026-10-21. This project makes no license claim over
that artwork and attributes the source; rights remain with the original authors and the
game rights holders.

## 5. Penguin Statistics: CC BY-NC 4.0

Drop statistics are provided by [Penguin Statistics](https://penguin-stats.io/) under
[CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/). The project is
non-commercial and serves pre-processed offline snapshots from `data/penguin/`.

Attribution:

> Drop statistics provided by Penguin Statistics (CC BY-NC 4.0). Thank you to all
> contributors. https://penguin-stats.io/

## 6. Optimized assets

`Migetsu/arkcalc-assets` stores 480px WebP thumbnails derived from the sources above.
Optimization does not create a new license: the original rights and attribution terms
still apply.

## 7. Third-party software

npm dependencies keep their own licenses as declared by their packages and
`package-lock.json`. They are not relicensed by this project.

## 8. Reporting attribution problems

If content is missing attribution or attributed incorrectly, open an issue in the
[repository](https://github.com/Migetsu/ArknightsCalculator/issues) with the file and the
correct source. We will fix the attribution or remove the content.
