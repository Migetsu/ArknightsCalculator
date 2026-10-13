# Аудит и спецификация источников данных (Data Sources)

> **Дата верификации:** 12 октября 2026 г.  
> **Статус:** Проверено напрямую через GitHub API, raw-эндпоинты, CDN jsDelivr и Penguin Stats API.

---

## 1. Репозитории игровых данных: Kengxxiao

### 1.1. Разделение репозиториев (Критическое расхождение с описанием)

В исходном описании предполагалось, что все локали (`zh_CN`, `en_US`, `ja_JP`, `ko_KR`, `zh_TW`) находятся в одном репозитории `Kengxxiao/ArknightsGameData`.  
**Фактическое состояние:**

1. **`Kengxxiao/ArknightsGameData`** содержит **ТОЛЬКО** локаль `zh_CN`.
   - Корневая структура: `.github/`, `README.md`, `zh_CN/`.
   - Ветка по умолчанию: `master`.
   - Актуальность: активно обновляется (последний коммит: `17759cc8cdf37388414145d16262a3a06f3ab25e`, октябрь 2026 г.).
2. **`Kengxxiao/ArknightsGameData_YoStar`** — отдельный репозиторий для глобальных серверов:
   - Содержит каталоги: `en_US/`, `ja_JP/`, `ko_KR/`.
   - Ветка по умолчанию: `main`.
   - Локаль `zh_TW` в репозиториях Kengxxiao отсутствует (традиционный китайский выпускается издателем Longcheng / Komoe Games и дампится сторонними энтузиастами отдельно).

### 1.2. Структура `gamedata/excel` и ключевые таблицы

В каталогах `{locale}/gamedata/excel/` хранятся распакованные таблицы клиента в JSON.

| Файл                       | Размер (CN / EN)  | Ключевые поля                                                                                                                     | Назначение в приложении                                                     |
| -------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `character_table.json`     | 14.8 MB / 11.5 MB | `name`, `description`, `appellation`, `profession`, `subProfessionId`, `rarity`, `phases`, `skills`, `allSkillLvlup`, `talents`   | База операторов, характеристики, стоимость элиты (E1/E2) и прокачки навыков |
| `skill_table.json`         | 10.5 MB / 8.0 MB  | `skillId`, `iconId`, `levels` (`name`, `description`, `spData`, `duration`, `blackboard`)                                         | Описание навыков, затраты SP, типы авторегена/зарядки                       |
| `item_table.json`          | 1.6 MB / 1.2 MB   | `items` (`itemId`, `name`, `description`, `rarity`, `iconId`, `classifyType`, `stageDropList`, `buildingProductList`), `expItems` | Ресурсы склада, материалы крафта, чипы, опыт                                |
| `uniequip_table.json`      | 2.5 MB / 2.1 MB   | `equipDict` (`uniEquipId`, `uniEquipName`, `charId`, `itemCost`, `type`), `charEquip` (`charId -> equipId[]`)                     | Модули операторов (X/Y/D), ветки и материалы разблокировки/уровней          |
| `building_data.json`       | 4.7 MB / 4.4 MB   | `workshopFormulas` (`formulaId`, `targetId`, `count`, `goldCost`, `costs`: `[{id, count}]`), `manufactFormulas`, `buffs`          | Рецепты мастерской (декомпозиция крафта), формулы базы                      |
| `gacha_table.json`         | 425 KB / 300 KB   | `gachaTags` (`tagId`, `tagName`, `tagGroup`), `recruitPool` (`charId`, `rarity`), `gachaPoolClient`                               | Калькулятор рекрутинга (теги и гарантированные комбинации), баннеры         |
| `stage_table.json`         | 19.3 MB / 14.5 MB | `stages` (`stageId`, `code`, `name`, `zoneId`, `apCost`, `stageDropInfo`)                                                         | Миссии и этапы для расчёта затрат sanity/выносливости                       |
| `handbook_info_table.json` | 3.4 MB / 4.5 MB   | `handbookDict` (`charId`, `storyTextAudio`, `infoName`, `drawName`, `voiceName`)                                                  | Профиль оператора, художник, сэйю, лор                                      |
| `char_patch_table.json`    | 48 KB / 47 KB     | `infos` (`char_002_amiya`), `patchChars`                                                                                          | Смена класса Амии (Guard Amiya, Medic Amiya)                                |

> **Примечание по имени:** Таблица смены класса называется `char_patch_table.json`, а не `character_patch_table.json`.

#### Краткий пример записи (`character_table.json`):

```json
"char_002_amiya": {
  "name": "阿米娅",
  "appellation": "Amiya",
  "profession": "CASTER",
  "subProfessionId": "corecaster",
  "rarity": "TIER_5",
  "phases": [
    { "maxLevel": 50, "rangeId": "0-1" },
    { "maxLevel": 70, "rangeId": "0-2", "evolveCost": [{ "id": "30013", "count": 3 }, { "id": "30062", "count": 2 }] }
  ],
  "skills": [
    { "skillId": "skchr_amiya_1", "unlockCond": { "phase": 0, "level": 1 } },
    { "skillId": "skchr_amiya_2", "unlockCond": { "phase": 1, "level": 1 } }
  ]
}
```

---

## 2. Определение доступности операторов в Global

### 2.1. Метод определения

Сравнение операторов выполняется сопоставлением ключей `charId` (например, `char_1033_swire2`):

- Если `charId` присутствует в `en_US/gamedata/excel/character_table.json` — оператор **официально выпущен в Global**.
- Если `charId` присутствует только в `zh_CN/...` — оператор является **CN-эксклюзивом на опережение** (~448 сущностей опережения на момент замера, включая будущие баннеры, альтер-версии и токены).

### 2.2. Ограничения метода

1. **Задержка синхронизации YoStar-репозитория:** Репозиторий `ArknightsGameData_YoStar` может отставать от актуального обновления клиента Global на несколько дней после выхода патча.
2. **Неигровые сущности в таблице:** В `character_table` также включены ловушки/механизмы (`trap_...`), токены призыва (`token_...`) и временные сюжетные персонажи. Для фильтрации реальных операторов проверяются:
   - `subProfessionId` (не пустое, не системное);
   - `isNotObtainable: false` (или отсутствие флага);
   - Префикс `char_`.
3. **Ограниченная доступность:** Наличие в Global-клиенте не гарантирует доступность в текущем стандартном рекрутинге или хедхантинге (лимитированные операторы, коллаборации Rainbow Six / Monster Hunter, ивентовые награды).

---

## 3. Языковые данные и официальные тексты

- **Официальный английский язык (EN):**  
  **Подтверждено.** Для всех операторов, навыков, талантов и модулей, вышедших в Global, существует полноценный официальный английский перевод от издателя Yostar Games в `en_US/gamedata/excel/`.
- **Официальный русский язык (RU):**  
  **Опровергнуто.** В официальных клиентах Hypergryph и Yostar **нет и никогда не было** русского языка. Никаких официальных файлов `ru_RU` в gamedata не существует.
  _Следствие для проекта:_ все названия и термины берутся из официального английского глоссария (Yostar EN). Русскоязычный интерфейс приложения переводит оболочку и элементы управления; терминология игры выводится в официальном виде или снабжается общепринятым фанатским контекстом.

---

## 4. Источники графических ресурсов (Ассеты)

### 4.1. Анализ Aceship (`Aceship/AN-EN-Tags`)

- **Статус:** Устарел. Последний коммит был зафиксирован в ноябре 2025 года (`2025-11-02`). Новейшие операторы CN и свежие патчи Global в репозитории отсутствуют. Использовать как основной источник нельзя.

### 4.2. Актуальные альтернативы

1. **`yuanyan3060/ArknightsGameResource` (Рекомендуемый основной источник)**:
   - Обновляется автоматически в течение нескольких часов после каждого патча CN/Global (последний коммит: 9 октября 2026 г.).
   - Чёткая и удобная структура каталогов:
     - Аватары: `avatar/{charId}.png` (например, `avatar/char_002_amiya.png`)
     - Портреты / Full Art: `portrait/{charId}.png`
     - Иконки предметов: `item/{iconId}.png` (например, `item/30013.png`)
     - Навыки: `skill/{iconId}.png`
     - Базовые навыки: `building_skill/{bskillId}.png`
2. **`fexli/ArknightsResource`**:
   - Также активный автоматический дамп (октябрь 2026 г.), но каталог предметов называется `items/`, а портреты — `charpor/`.

### 4.3. Доставка через jsDelivr и лимиты

- Доступ по URL: `https://cdn.jsdelivr.net/gh/yuanyan3060/ArknightsGameResource@main/avatar/{charId}.png`.
- **Лимиты jsDelivr:**
  - Максимальный размер одного файла: **20 MB** (аватары ~50 KB, портреты ~500 KB–1 MB — укладываются с огромным запасом).
  - Запросы к файлам ветки кэшируются на edge-узлах CDN (TTL ~12 часов). Для гарантированной воспроизводимости в продакшене рекомендуется пинить commit SHA.

---

## 5. Penguin Stats API (Статистика фарма)

- **Базовый URL:** `https://penguin-stats.io/PenguinStats/api/v2/`
- **Матрица дропа:** `GET /result/matrix?is_personal=false`
  - Доступность: 200 OK.
  - Размер ответа: **~1.01 MB** в несжатом JSON (~8 100 записей), в gzip — менее 250 KB.
  - Поля записи матрицы: `stageId`, `itemId`, `times` (количество забегов), `quantity` (выпало предметов), `stdDev`, `start`, `end`.
- **CORS:** Полностью поддерживается (сервер динамически отдаёт `Access-Control-Allow-Origin: <Origin>`).
- **Правила вежливого использования (Fair Use):**
  - Кэшировать матрицу: данные дропа меняются медленно (рекомендуемый интервал обновления — от 1 до 24 часов). Запрещено запрашивать матрицу на каждый клик пользователя.
  - Передавать заголовок `User-Agent: ArknightsCalculator/1.0 (+https://arkcalc.vercel.app)` при серверных запросах.

---

## 6. Лицензии и правовой статус

- Все исходные игровые таблицы и спрайты являются интеллектуальной собственностью **HYPERGRYPH Co., Ltd.** и **YOSTAR (HONG KONG) LIMITED**.
- Ни репозиторий Kengxxiao, ни Aceship, ни ArknightsGameResource не обладают коммерческой открытой лицензией (в репозиториях нет `LICENSE`).
- Использование допустимо исключительно в рамках **некоммерческого фанатского компаньона** (Fan Content Policy).
- Обязательно размещение дисклеймера в футере приложения (уже реализовано в `app/layouts/default.vue`).

---

## 7. Сводка расхождений с исходным ТЗ

1. **Репозиторий `Kengxxiao/ArknightsGameData`** не содержит локали `en_US`, `ja_JP` или `ko_KR`. Для глобальных серверов используется отдельный репозиторий **`Kengxxiao/ArknightsGameData_YoStar`**.
2. **Локаль `zh_TW`** отсутствует в обоих официальных репозиториях Kengxxiao.
3. Таблица смены класса называется **`char_patch_table.json`** (не `character_patch_table.json`).
4. Репозиторий **`Aceship/AN-EN-Tags` заброшен** с конца 2025 года; в качестве актуального источника графики используется **`yuanyan3060/ArknightsGameResource`**.

---

## Freshness audit (2026-10-13)

Аудит без изменений данных. Все цифры получены реальными запросами 2026-10-13 (UTC ~08:12–08:16).

### 1. Репозитории: даты и версии данных

Источник: GitHub API `GET /repos/{repo}/commits?sha={branch}&per_page=3` и `.../commits/{pinned}`; `data_version.txt` через `raw.githubusercontent.com` на закреплённом коммите.

| Источник                                                                                                                    | Последний коммит (он же закреплённый в проекте) | Сообщение коммита                                 | `data_version.txt`                                |
| :-------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------- | :------------------------------------------------ | :------------------------------------------------ |
| [Kengxxiao/ArknightsGameData](https://api.github.com/repos/Kengxxiao/ArknightsGameData/commits?sha=master) (CN)             | `17759cc` — 2026-10-08 23:46 UTC                | `[CN UPDATE] Client:2.7.81 Data:26-10-08-...`     | `rel78.0`, `Change:124981 on 2026/10/08`, v78.0.0 |
| [Kengxxiao/ArknightsGameData_YoStar](https://api.github.com/repos/Kengxxiao/ArknightsGameData_YoStar/commits?sha=main) (EN) | `57010cb` — 2025-11-13 15:53 UTC                | `[EN UPDATE] Client:31.5.80 Data:25-11-11-08-...` | `VersionControl:46.4.0` (даты в файле нет)        |

Оба закреплённых коммита совпадают с последними коммитами веток на момент аудита: проект не отстаёт от репозиториев, отстают сами репозитории.

### 2. EN: операторы Global, которых нет в `en_US/character_table.json`

Источник списка: `arknights.wiki.gg`, MediaWiki API — [`Category:Operator`](https://arknights.wiki.gg/api.php?action=query&list=categorymembers&cmtitle=Category:Operator&cmlimit=500) (411 страниц, Global) и [`Category:CN Operator`](https://arknights.wiki.gg/api.php?action=query&list=categorymembers&cmtitle=Category%3ACN%20Operator&cmlimit=500) (22 страницы, только CN). Даты релиза на Global — Cargo-запрос `action=cargoquery` (таблицы `Operators` + `EventServerDetails`, `server = global`). Сравнение по нормализованному имени с `name`/`appellation` из закреплённого `en_US/character_table.json` (401 запись `char_*`).

- Не найдено в `en_US`: **36** названий. Из них **35** — реальные релизы Global после даты репозитория (2025-11-13); даты релиза 2025-12-11 … 2026-09-16. Оставшееся одно — `Reserve Operator - Supporter (Ritualist)` (служебный режим, строки Cargo нет).
- Первые 20 (по возрастанию даты релиза на Global): Leizi the Thunderbringer, Record Keeper (2025-12-11); Hoshiguma the Breacher, Matsukiri, Kichisei, Haruka (2026-01-16); Sakiko Togawa, Uika Misumi, Mutsumi Wakaba, Umiri Yahata, Nyamu Yūtenji (2026-02-10); Vetochki, Snegurochka, Mantra (2026-03-19); Snow Hunter, Hadiya, Pramanix the Prerita, Akkord, SilverAsh the Reignfrost, Astgenne the Lightchaser (2026-04-14).
- Остальные 15: Skybox, Cairn, Nasti (2026-05-21); Varkáris, Perfumer the Distilled, Titi (2026-06-22); Ju, Taraxacum, Ch'en the Dawnstreak, Wang (2026-07-16); Ripresa, Bellone (2026-08-13); Ukusik, Botani, Zima the Raging Tide (2026-09-16).
- Ближайший релиз на Global (страница `Operator` wiki.gg, 2026-10-13): 2026-10-14 — Kal'tsit Esperanta, Closure, Viy, Crackborne, GALLUS².

### 3. Penguin Stats (`server=US`) против `en_US` stage_table / item_table

Источник: [`/PenguinStats/api/v2/result/matrix?server=US&show_closed_zones=true`](https://penguin-stats.io/PenguinStats/api/v2/result/matrix?server=US&show_closed_zones=true): 7588 строк, 1133 этапа, 132 предмета.

- Этапы вне `en_US/stage_table.json`: **303**. Разбор: 203 `*_rep` (у каждого базовый этап в таблице есть), 76 `*_perm` (у каждого базовый этап в таблице есть), 14 `randomMaterial*` (служебные), 2 служебных (`recruit`, `act24side_gacha`), **8 реально новых** — `act45side_01…08` (префикса `act45` в таблице нет).
- Предметы вне `en_US/item_table.json`: **37**, все — псевдопредметы Penguin (`furni`, `4001_2000`, `charm_*`, `trap_oxygen_3`, `recruit_tag_*`). Реально новых игровых предметов: **0**.

### 4. CN: `zh_CN` репозиторий против актуального списка prts.wiki

Источник: [`prts.wiki` — «干员一览/干员id»](https://prts.wiki/api.php?action=parse&page=%E5%B9%B2%E5%91%98%E4%B8%80%E8%A7%88/%E5%B9%B2%E5%91%98id&prop=wikitext&format=json) (CSV `sortId,name,rarity,approach,date`): 434 оператора (`sortId >= 0`); самая поздняя дата выхода 2026-10-04 (旅骨, 德·托莱多, 克莱门莎).

- Расхождений по имени с `zh_CN/character_table.json` (+ `char_patch_table`): **2**, оба — формы Амии (`阿米娅(近卫)`, `阿米娅(医疗)`), хранящиеся в таблице под другим именем; фактически отсутствующих операторов: **0**.
- Penguin `server=CN` (1587 этапов, 148 предметов): вне `zh_CN` stage_table 539 (357 `_rep`, 153 `_perm`, 25 `randomMaterial*`, 4 служебных; из них новый реальный — `act50side_gacha`), вне item_table 41 (все — псевдопредметы Penguin). Для `_rep`/`_perm` в CN наличие базового этапа проверено только для `_rep` (356 из 357).

### 5. Выводы

| Источник                        | Отставание                                                                                                      | Доля отсутствующего                                                                        |
| :------------------------------ | :-------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------- |
| `ArknightsGameData_YoStar` (EN) | по дате коммита 334 дня ≈ **47,7 недели** (2025-11-13 → 2026-10-13); первый пропущенный релиз Global 2025-12-11 | операторов: 35 из 411 Global = **8,5 %**; плюс событие `act45side` (8 этапов) и его тексты |
| `ArknightsGameData` (CN)        | по дате коммита 5 дней ≈ **0,7 недели**; `data_version`: Change от 2026/10/08                                   | операторов: 0 из 434 по prts.wiki (2 формы Амии — артефакт сравнения имён)                 |

Следствия для проекта:

- Поле `servers`/`cnOnly` в `data/` вычислено по устаревшему EN-репозиторию: проект считает CN-only **58** операторов (`data/meta.json`), а по wiki.gg CN-only **22** (411 Global + 22 CN = 433 против 434 по PRTS). Разница 36 = 36 названий выше. Флаги недостоверны; в интерфейсе они не используются (см. `docs/design/DEVIATIONS.md`, п. 4).
- Для английских названий и текстов 35 новых операторов нужен другой источник EN-данных (репозиторий не обновляется с 2025-11-13). Для CN-контента проблем с актуальностью нет.
- Ограничения: сопоставление операторов — по нормализованному имени, а не по `charId` (wiki.gg ID не публикует); даты релиза Global взяты из Cargo wiki.gg (сторонний источник); `data_version.txt` EN-репозитория не содержит даты.

---

## 6. Юридический статус источников и лицензирование

### 6.1. Hypergryph Co., Ltd. & Yostar (Hong Kong) Limited

- **Статус:** Официальные издатели и правообладатели торговой марки Arknights.
- **Объекты:** Графика (спрайты, иконки, арты), оригинальные китайские и английские игровые тексты, наименования операторов и механики.
- **Условия использования:** Некоммерческое добросовестное использование (fair use / non-profit fan companion). Приложение не взимает плату, не монетизируется рекламой и в обязательном порядке отображает дисклеймер об авторских правах в подвале страниц (`layout.footer.disclaimer`).

### 6.2. arknights.wiki.gg (Terra Wiki)

- **Лицензия контента:** [Creative Commons Attribution-ShareAlike 4.0 International (CC-BY-SA 4.0)](https://creativecommons.org/licenses/by-sa/4.0/).
- **Дата проверки:** 13 октября 2026 г. ([Arknights Terra Wiki:Copyrights](https://arknights.wiki.gg/wiki/Arknights_Terra_Wiki:Copyrights)).
- **Условия API и сбора:** В соответствии с `robots.txt` и [indie.io Terms of Service](https://www.indie.io/terms-of-service), разрешён автоматизированный доступ с умеренной частотой запросов (`User-Agent: ArknightsCalculator-Build/1.0`).
- **Требование атрибуции:** Все производные текстовые данные, полученные с wiki.gg, снабжаются заголовком атрибуции (`data/i18n/wiki/operators.json`), в интерфейсе сайта выводится ссылка на лицензию в подвале, а также явно разграничиваются переводы уже вышедшего контента (`wiki`) и фанатские предпереводы не вышедшего контента CN (`community`).
- **Совместимость лицензий:** Код веб-приложения разрабатывается независимо, а контентные выборки с wiki.gg сохраняют лицензию CC-BY-SA 4.0.

### 6.3. Penguin Stats (penguin-stats.io)

- **Статус:** Общедоступный фанатский агрегатор статистики дропа.
- **API:** Публичный REST API v2 (`/PenguinStats/api/v2/result/matrix`).
- **Условия:** Разрешено использование для аналитических компаньонов и калькуляторов с кэшированием результатов.
