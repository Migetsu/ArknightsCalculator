# Аудит полноты вики по операторам (Operator Wiki Completeness Audit)

Документ представляет собой системный аудит данных и пользовательского интерфейса страницы оператора (`app/pages/operators/[id].vue`). Цель аудита — инвентаризация всех доступных в проекте игровых данных, сопоставление их с текущим состоянием UI и формирование приоритизированного плана (P1/P2/P3) для превращения страницы оператора в полноценную вики-базу.

---

## 1. Ответы на ключевые вопросы владельца проекта

### 1. Какие арты сейчас показываются?

- **Текущее состояние в UI:** отображаются **только 2 варианта артов** — `E0 / E1` (базовый) и `E2` (элита 2).
  - В [`AkOperatorHero.vue`](file:///c:/Projects/ArknightsCalculator/app/components/operators/AkOperatorHero.vue#L36-L83) и [`AkArtViewer.vue`](file:///c:/Projects/ArknightsCalculator/app/components/operators/AkArtViewer.vue#L36-L45) состояние захардкожено через union-тип `'e0' | 'e2'`.
  - Вариант `'e0'` запрашивает через [`resolveAsset('art', id, { variant: '1' })`](file:///c:/Projects/ArknightsCalculator/shared/utils/resolveAsset.ts) каноничный арт 1-й фазы (в Arknights фазы E0 и E1 используют идентичный арт).
  - Вариант `'e2'` запрашивает через `resolveAsset('art', id, { variant: '2' })` арт элиты 2.
  - Для операторов 1★–3★ и роботов (из набора `LOW_RARITY_OPERATOR_IDS`), не имеющих элиты 2, отображается только `e0`, а кнопки переключения скрываются.
- **Чего не хватает:**
  - Полностью отсутствует поддержка альтернативных скинов (нарядов) операторов, хотя в `data/skins.json` собрана база из 1,359 скинов.

### 2. Отображается ли ренж (дальность атаки) вообще, и если да — как?

- **Текущее состояние в UI:** **Ренж полностью отображается в панели характеристик и карточках навыков** (Задача 5, P1.1, P1.2).
  - В [`AkOperatorStatsPanel.vue`](file:///c:/Projects/ArknightsCalculator/app/components/operators/AkOperatorStatsPanel.vue) отображается тактическая карточка `Attack Range` с сеткой [`AkRangeGrid.vue`](file:///c:/Projects/ArknightsCalculator/app/components/ui/AkRangeGrid.vue), динамически переключающаяся при выборе фазы элиты (`E0 / E1 / E2`).
  - В [`AkOperatorSkillsPanel.vue`](file:///c:/Projects/ArknightsCalculator/app/components/operators/AkOperatorSkillsPanel.vue) для каждого навыка отображается мини-сетка дальности активного уровня: с бейджем `Inherited from Operator` (если `rangeId === null`) или `Skill Modified Range` (если навык меняет дальность).
  - Данные `data/ranges.json` изолированы в отдельный ленивый чанк через `app/composables/useOperatorRanges.ts` и не увеличивают начальный бандл.
- **Что есть в данных:**
  - В `data/ranges.json` уже собрана полная нормализованная база всех 73 ренжей игры (бинарные матрицы `0/1`, габариты `rows x cols`, координаты оператора `anchor`, исходные смещения `grids`).
  - В `data/operators/*.json` у каждой фазы оператора заполнен `phases[].rangeId` (например, у Amiya: E0 = `'3-6'`, E1 = `'3-1'`, E2 = `'3-1'`).
  - У навыков, временно модифицирующих дальность (например, SilverAsh S3, Eyjafjalla S3, Amiya S3), заполнен `skills[].levels[].rangeId`.

### 3. Отображаются ли скины, и есть ли где-то цена?

- **Текущее состояние в UI:** **Скины отображаются во вкладке Outfits (`AkOperatorSkinsPanel.vue`), в селекторе артов `AkOperatorHero.vue` и в полноэкранном модальном вьюере `AkArtViewer.vue`**.
- **Что есть в данных:**
  - В `data/skins.json` содержится 1,359 скинов для 432 операторов: идентификаторы артов (`illustId`, `avatarId`, `portraitId`), бренд (`brandName`), название наряда (`displaySkinName`), художник (`drawerList`), текстовое описание (`description`), реплика (`dialog`), способ получения (`obtainApproach`) и статус цены (`priceStatus: 'default' | 'free' | 'unknown'`).
- **Где цена и как отображается:**
  - Как установлено в Задачах 1 и 1a, в статическом каталоге клиентских игровых таблиц (`skin_table.json`) цены в Originium Prime (OP) отсутствуют: они задаются динамическими расписаниями событий магазина (`shop_table.json`).
  - В UI выводятся честные тактические бейджи статуса цены: `'default'` → `Base`, `'free'` → `Free`, `'unknown'` → `—`. Выдуманные числовые цены в OP категорически не используются. Дополнительно отображается способ получения (`obtainApproach`) и тактический бейдж `CN ONLY` для скинов китайского сервера.

### 4. Чего не хватает для «полноценной вики», и в каком порядке это закрывать?

Для превращения страницы в авторитетную фанатскую вики не хватает 3 пластов функционала:

1. **P1 (Данные готовы в `data/`, нужен только UI):**
   - Интерактивная сетка дальности атаки (Range Grid) для E0/E1/E2 в блоке характеристик.
   - Сетка дальности в карточках навыков с подсветкой модификаций базового ренжа.
   - Галерея скинов с переключением артов в полный рост, инфой об авторе, бренде и описанием наряда.
   - Отображение требований материалов на повышение элиты (`phases[].evolveCost`).
   - Отображение материалов на базовую прокачку навыков 1–7 уровней (`allSkillLvlup[]`).
   - Расшифровка бонусов потенциалов (`potentialRanks[]`, уровни P1–P6 с описанием).
2. **P2 (Данные уже скачаны в `.cache/raw/`, требуется доработка сборщика `build-operators.ts`):**
   - Блок досье/анкеты из `handbook_info_table.json` (пол, день рождения, рост, раса, место рождения, боевой опыт, статус заражения).
   - Архивные истории оператора (Архивы 1–4, Клинический анализ, Запись о повышении).
   - Базовые навыки базы (RIIC Skills) из `building_data.json`.
3. **P3 (Требуются новые источники или межмодульная интеграция):**
   - Реплики и озвучка (Voice lines / Audio transcripts).
   - Интеграция с рекрутингом (`data/recruit.json` — гарантированные теги оператора).
   - Интеграция с историей баннеров (`data/banners.json` — когда оператор был на баннере).

---

## 2. Полная инвентаризация данных проекта

### 2.1. Данные в `data/operators/[id].json` (434 файла)

| Группа данных              | JSON-путь                             | Тип                            | Описание                                                                                           |
| :------------------------- | :------------------------------------ | :----------------------------- | :------------------------------------------------------------------------------------------------- |
| **Идентификация**          | `id`                                  | `string`                       | Внутренний код игры (напр. `'char_002_amiya'`)                                                     |
| **Имя**                    | `name`                                | `I18nString`                   | `{ en, zh, source, isMachineTranslation, stale }`                                                  |
| **Позывной**               | `appellation`                         | `string`                       | Латинский позывной (напр. `'Amiya'`)                                                               |
| **Код профиля**            | `displayNumber`                       | `string \| null`               | Тактический номер (напр. `'R001'`)                                                                 |
| **Редкость**               | `rarity`                              | `number` (1..6)                | Количество звезд оператора                                                                         |
| **Класс**                  | `class`                               | `OperatorClass`                | `'PIONEER'`, `'WARRIOR'`, `'SNIPER'`, `'TANK'`, `'MEDIC'`, `'SUPPORT'`, `'CASTER'`, `'SPECIALIST'` |
| **Подкласс (ветка)**       | `subclass`                            | `string`                       | Код архетипа (напр. `'c_core'`, `'p_charger'`)                                                     |
| **Фракция**                | `faction`                             | `string \| null`               | Принадлежность (напр. `'rhodes'`, `'kjerag'`)                                                      |
| **Позиция**                | `position`                            | `'MELEE' \| 'RANGED' \| 'ALL'` | Тип размещения на поле боя                                                                         |
| **Теги рекрутинга**        | `tagList`                             | `string[]`                     | Официальные теги (напр. `['DPS', 'Caster']`)                                                       |
| **Серверы**                | `servers`                             | `('global' \| 'cn')[]`         | Доступность на серверах (`isCnOnly` флаг)                                                          |
| **Боевое применение**      | `itemUsage`                           | `I18nString`                   | Краткое описание роли/особенности в бою                                                            |
| **Цитата/Девиз**           | `itemDesc`                            | `I18nString`                   | Художественная цитата из карточки оператора                                                        |
| **Художник**               | `artist`                              | `string \| null`               | Имя иллюстратора базового арта (напр. `'唯@W'`)                                                    |
| **Сэйю (VA)**              | `va`                                  | `string \| null`               | Актер озвучки (напр. `'Tomoyo Kurosawa'`)                                                          |
| **Фазы элиты**             | `phases[].phase`                      | `number` (0..2)                | Индекс ступени элиты                                                                               |
| **Кап уровня**             | `phases[].maxLevel`                   | `number`                       | Максимальный уровень на данной фазе                                                                |
| **Ренж фазы**              | `phases[].rangeId`                    | `string`                       | Идентификатор ренжа (напр. `'3-6'`, `'3-1'`)                                                       |
| **Материалы элиты**        | `phases[].evolveCost`                 | `Array<{ id, count }>`         | Список предметов и их количество для промоушена                                                    |
| **Ключевые кадры статов**  | `phases[].attributesKeyFrames`        | `Array<{ level, data }>`       | Опорные точки характеристик на 1 и max уровне                                                      |
| **Статы: HP**              | `...data.maxHp`                       | `number`                       | Запас здоровья                                                                                     |
| **Статы: ATK**             | `...data.atk`                         | `number`                       | Сила атаки                                                                                         |
| **Статы: DEF**             | `...data.def`                         | `number`                       | Защита                                                                                             |
| **Статы: RES**             | `...data.magicResistance`             | `number`                       | Сопротивление магии                                                                                |
| **Статы: DP Cost**         | `...data.cost`                        | `number`                       | Стоимость развертывания                                                                            |
| **Статы: Block**           | `...data.blockCnt`                    | `number`                       | Число блокируемых целей                                                                            |
| **Статы: Время атаки**     | `...data.baseAttackTime`              | `number`                       | Базовый интервал между атаками в секундах                                                          |
| **Статы: Редеплой**        | `...data.respawnTime`                 | `number`                       | Время повторного развертывания в секундах                                                          |
| **Скиллы: ID**             | `skills[].skillId`                    | `string`                       | Уникальный код навыка                                                                              |
| **Скиллы: Иконка**         | `skills[].iconId`                     | `string \| null`               | Идентификатор спрайта иконки навыка                                                                |
| **Скиллы: Имя уровня**     | `skills[].levels[].name`              | `I18nString`                   | Название навыка на данном уровне (1..10)                                                           |
| **Скиллы: Описание**       | `skills[].levels[].description`       | `I18nString`                   | RichText описание с плейсхолдерами                                                                 |
| **Скиллы: Ренж**           | `skills[].levels[].rangeId`           | `string \| null`               | Модификатор ренжа (null = наследуется от фазы)                                                     |
| **Скиллы: Тип заряда**     | `skills[].levels[].spType`            | `number \| string`             | Авто/Удар/Получение урона/Пассивный                                                                |
| **Скиллы: Активация**      | `skills[].levels[].skillType`         | `number \| string`             | Ручной / Автоматический / Пассивный                                                                |
| **Скиллы: Стоимость SP**   | `skills[].levels[].spCost`            | `number`                       | Требуемое количество энергии для пуска                                                             |
| **Скиллы: Старт SP**       | `skills[].levels[].initSp`            | `number`                       | Начальное количество энергии при спавне                                                            |
| **Скиллы: Длительность**   | `skills[].levels[].duration`          | `number`                       | Время действия активного эффекта в сек                                                             |
| **Скиллы: Параметры**      | `skills[].levels[].blackboard`        | `Record<string, number>`       | Числовые переменные для подстановки в описание                                                     |
| **Мастерство: Стоимость**  | `skills[].masteryCosts[].levelUpCost` | `Array<{ id, count }>`         | Материалы для уровней M1, M2, M3                                                                   |
| **Общие уровни навыков**   | `allSkillLvlup[].lvlUpCost`           | `Array<{ id, count }>`         | Материалы для прокачки всех навыков с 1 по 7 уровень                                               |
| **Таланты: Имя**           | `talents[].candidates[].name`         | `I18nString`                   | Название таланта на определенной ступени                                                           |
| **Таланты: Описание**      | `talents[].candidates[].description`  | `I18nString`                   | RichText описание эффекта таланта                                                                  |
| **Таланты: Условие**       | `talents[].candidates[].unlockCond`   | `{ phase, level, potential }`  | Требуемая элита, уровень и потенциал                                                               |
| **Таланты: Параметры**     | `talents[].candidates[].blackboard`   | `Record<string, number>`       | Переменные таланта для форматирования текста                                                       |
| **Потенциалы: Тип**        | `potentialRanks[].type`               | `number \| string`             | Числовой тип модификатора потенциала                                                               |
| **Потенциалы: Описание**   | `potentialRanks[].description`        | `I18nString`                   | Описание бонуса ранга (DP -1, улучшение таланта)                                                   |
| **Бонусы доверия (Trust)** | `favorKeyFrames[].data`               | `Record<string, number>`       | Прибавки статов при 100% доверии (HP, ATK, DEF)                                                    |
| **Модули: Базовые данные** | `modules[].id, name, type, icon`      | `string, I18nString`           | Идентификатор, название, категория, иконка                                                         |
| **Модули: Код подкласса**  | `modules[].typeName2`                 | `string`                       | Тактический код ветки (напр. `'CAC-X'`, `'CHG-Y'`)                                                 |
| **Модули: Лор/История**    | `modules[].description`               | `I18nString`                   | Полный художественный текст досье модуля                                                           |
| **Модули: Статы стадий**   | `modules[].stages[].stats`            | `Record<string, number>`       | Бонусы характеристик на 1, 2, 3 стадиях                                                            |
| **Модули: Апгрейды черт**  | `modules[].stages[].parts[]`          | `Array<OperatorModulePart>`    | Улучшения трейта и талантов оператора                                                              |
| **Модули: Материалы**      | `modules[].stages[].cost`             | `Array<{ id, count }>`         | Требуемые материалы для открытия стадий                                                            |

---

### 2.2. Данные в смежных сгенерированных файлах

| Файл                                                                                           | Ключевые поля                                                                                                                              | Описание                                             |
| :--------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------- |
| [`data/ranges.json`](file:///c:/Projects/ArknightsCalculator/data/ranges.json)                 | `Record<rangeId, { matrix, rows, cols, anchor, grids }>`                                                                                   | 73 нормализованных сетки дальности атаки             |
| [`data/skins.json`](file:///c:/Projects/ArknightsCalculator/data/skins.json)                   | `skinId, charId, illustId, avatarId, portraitId, brandName, displaySkinName, drawerList, description, dialog, obtainApproach, priceStatus` | 1,359 скинов операторов                              |
| [`data/constants.json`](file:///c:/Projects/ArknightsCalculator/data/constants.json)           | `characterExpMap, characterUpgradeCostMap, evolveGoldCost, maxLevel, lmdItemId`                                                            | Формулы и кривые опыта, LMD и уровней                |
| [`data/recruit.json`](file:///c:/Projects/ArknightsCalculator/data/recruit.json)               | `pools.global, pools.cn, tags`                                                                                                             | База доступности в рекрутинге и гарантированные теги |
| [`data/banners.json`](file:///c:/Projects/ArknightsCalculator/data/banners.json)               | `banners[].operators`                                                                                                                      | История баннеров и присутствие оператора на рейт-апе |
| [`data/asset-manifest.json`](file:///c:/Projects/ArknightsCalculator/data/asset-manifest.json) | `avatars, portraits, items, skills, equips`                                                                                                | Проверенные манифесты путей к ассетам                |

---

### 2.3. Доступные, но пока не извлеченные данные (в `.cache/raw/`)

| Таблица сырых данных                        | Что содержит                                                                                                                                                                                                                                                         | Почему нужно извлечь                                                                                                                  |
| :------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------ |
| `handbook_info_table.json` (`handbookDict`) | **Анкета и досье оператора:** пол, дата рождения, место рождения, рост, раса, боевой опыт, статус заражения (Basic Info). **Архивы:** Архивы 1–4, Клинический анализ, Запись о повышении. **Аудио-реплики:** реплики приветствия, боя, базы, назначения ассистентом. | Критично для вики-раздела «Досье / История / Озвучка». Сейчас файл скачивается в кеш, но сборщик `build-operators.ts` его игнорирует. |
| `building_data.json` (`chars`, `buffs`)     | **Навыки базы (RIIC Skills):** привязка оператора к комнатам (Control Center, Factory, Trading Post, Dormitory, Office, Workshop, Training Room) с описанием эффектов и условий разблокировки (E0 / E2).                                                             | Базовые навыки — обязательная часть страницы любого оператора в Arknights.                                                            |

---

## 3. Инвентаризация текущего UI (`app/pages/operators/[id].vue`)

Страница использует 7 специализированных компонентов. Ниже описано, что отображает каждый из них:

1. **[`AkOperatorHero.vue`](file:///c:/Projects/ArknightsCalculator/app/components/operators/AkOperatorHero.vue)**
   - **Отображает:**
     - Имя оператора (`displayName` с бейджем машинного перевода `AkTranslationBadge`).
     - Тактический код (`displayNumber` или fallback `OPS-04`).
     - Мета-строка: редкость, класс, подкласс, фракция.
     - Чипы: звезды (`AkBadge variant="rarity"`), класс, подкласс, фракция.
     - Арт оператора в полный рост (клик открывает `AkArtViewer`).
     - Переключатель артов: кнопки `E0 / E1` и `E2` с мини-портретами.
     - Полоса ключевых характеристик: текущие расчетные HP, ATK, DEF, RES.
   - **Не отображает:**
     - Скины, сетку дальности атаки (Range), статус CN-only (напрямую в Hero).

2. **[`AkArtViewer.vue`](file:///c:/Projects/ArknightsCalculator/app/components/operators/AkArtViewer.vue)**
   - **Отображает:**
     - Полноэкранный модальный просмотрщик арта в оригинальном разрешении.
     - Зум (50% – 400%), панорамирование перетаскиванием (drag & pinch-to-zoom).
     - Переключение между `E0 / E1` и `E2` стрелками и миниатюрами.
   - **Не отображает:**
     - Ни одного скина оператора (только базовые `e0` и `e2`).

3. **[`AkOperatorStatsPanel.vue`](file:///c:/Projects/ArknightsCalculator/app/components/operators/AkOperatorStatsPanel.vue) (Вкладка "Stats")**
   - **Отображает:**
     - Интерактивные контролы: ступень элиты (`AkSegmented`), уровень (stepper + slider), процент доверия (0–100%), потенциал (P1–P6).
     - Выбор модуля и стадии модуля (S1, S2, S3).
     - Детализированную таблицу декомпозиции характеристик: HP, ATK, DEF, RES, DP Cost, Block Count, Attack Interval (сек), Redeploy Time (сек).
     - Столбцы декомпозиции: Base, Trust bonus, Potential bonus, Module bonus, Total.
   - **Не отображает:**
     - Сетку дальности атаки (Range Grid).
     - Стоимость повышения элиты (материалы и LMD).
     - Описания бонусов потенциалов (что дает каждый ранг P1–P6).
     - Затраты опыта (EXP) и денег (LMD) на повышение уровней.

4. **[`AkOperatorSkillsPanel.vue`](file:///c:/Projects/ArknightsCalculator/app/components/operators/AkOperatorSkillsPanel.vue) (Вкладка "Skills")**
   - **Отображает:**
     - Иконка скилла (`AkSkillIcon`).
     - Название навыка с бейджем источника локализации.
     - Бейджи типа энергии (Auto / Offensive / Defensive / Passive) и типа активации (Manual / Auto / Passive).
     - Селектор уровней: кнопки `Lv 1` – `Lv 7` и `M1` – `M3`.
     - Телеметрию: SP Cost, Initial SP, Duration (длительность).
     - Описание с форматированием RichText и интерполяцией переменных blackboard.
     - Затраты материалов на мастерство (M1, M2, M3) с иконками `AkItemIcon`.
   - **Не отображает:**
     - Модификацию ренжа навыком (`rangeId`) и сетку атаки навыка.
     - Стоимость базовой прокачки навыков (уровни 1–7 из `allSkillLvlup`).

5. **[`AkOperatorTalentsPanel.vue`](file:///c:/Projects/ArknightsCalculator/app/components/operators/AkOperatorTalentsPanel.vue) (Вкладка "Talents")**
   - **Отображает:**
     - Список всех ступеней талантов.
     - Название таланта с бейджем локализации.
     - Условие открытия: элита и уровень (`unlockedAt`), требуемый потенциал (`requiresPot`).
     - Описание с форматированием RichText и переменными blackboard.
   - **Не отображает:**
     - Фильтрацию/подсветку текущего активного таланта в зависимости от выбранной элиты/потенциала (выводятся все кандидаты сплошным списком).

6. **[`AkOperatorModulesPanel.vue`](file:///c:/Projects/ArknightsCalculator/app/components/operators/AkOperatorModulesPanel.vue) (Вкладка "Modules")**
   - **Отображает:**
     - Иконка модуля (`AkModuleIcon`), название, тип (`INITIAL`, `ADVANCED`), бейдж подкласса (`AkModuleType`).
     - Сворачиваемое досье/лор модуля (`t('operators.detail.modules.story')`).
     - Переключатель стадий (Stage 1..3).
     - Чипы статов стадии (`MAX_HP: +150`, `ATK: +45` и т.д.).
     - Улучшения трейта и талантов с RichText.
     - Материалы для разблокировки стадий с иконками предметов.

7. **[`AkOperatorInfoPanel.vue`](file:///c:/Projects/ArknightsCalculator/app/components/operators/AkOperatorInfoPanel.vue) (Вкладка "Info")**
   - **Отображает:**
     - Карточки метаданных: Код (`displayNumber`), Фракция, Подкласс, Художник (`artist`), Сэйю (`va`).
     - Список тегов рекрутинга (`tagList`).
     - Карточку боевого применения (`itemUsage`).
     - Карточку цитаты оператора (`itemDesc`).
   - **Не отображает:**
     - Личное досье (пол, рост, раса, день рождения, место рождения, боевой опыт, статус заражения).
     - Истории и архивы (Архивы 1–4, Клинический анализ, Запись о повышении).
     - Базовые навыки базы (RIIC Skills).
     - Озвучку и аудио-реплики.

---

## 4. Сводная матрица расхождений (Data vs UI)

| Данные / Сущность                             | Есть в данных (путь / файл)                                              | Показано в UI (файл / компонент)                                    | Чего не хватает (пробел)                                                      |
| :-------------------------------------------- | :----------------------------------------------------------------------- | :------------------------------------------------------------------ | :---------------------------------------------------------------------------- |
| **Базовый арт E0 / E1**                       | `resolveAsset('art', id, { variant: '1' })`                              | `AkOperatorHero.vue`, `AkArtViewer.vue`                             | Полностью отображается                                                        |
| **Арт элиты 2 (E2)**                          | `resolveAsset('art', id, { variant: '2' })`                              | `AkOperatorHero.vue`, `AkArtViewer.vue`                             | Полностью отображается                                                        |
| **Скины операторов**                          | `data/skins.json` (`1,359` записей, 432 оператора)                       | `AkOperatorSkinsPanel.vue`, `AkArtViewer.vue`, `AkOperatorHero.vue` | Полностью отображается (галерея Outfits, просмотрщик и Hero)                  |
| **Статус цены скинов**                        | `data/skins.json` (`priceStatus`)                                        | `AkOperatorSkinsPanel.vue`                                          | Отображаются честные статусы `Base`, `Free`, `—` и способ получения           |
| **Ренж фаз элиты**                            | `data/operators/*.json` `phases[].rangeId` + `data/ranges.json`          | `AkOperatorStatsPanel.vue`, `AkRangeGrid.vue`                       | Полностью отображается (карточка Attack Range с динамической сменой E0/E1/E2) |
| **Ренж навыков**                              | `data/operators/*.json` `skills[].levels[].rangeId` + `data/ranges.json` | `AkOperatorSkillsPanel.vue`, `AkRangeGrid.vue`                      | Полностью отображается (мини-сетки с бейджами Inherited / Modified)           |
| **Статы: HP, ATK, DEF, RES**                  | `phases[].attributesKeyFrames`                                           | `AkOperatorHero.vue`, `AkOperatorStatsPanel.vue`                    | Полностью отображается (Hero + Декомпозиция)                                  |
| **Статы: Cost, Block, Интервал, Редеплой**    | `phases[].attributesKeyFrames`                                           | `AkOperatorStatsPanel.vue`                                          | Отображается в таблице декомпозиции                                           |
| **Затраты на элиту (Evolve Cost)**            | `phases[].evolveCost`                                                    | `AkOperatorStatsPanel.vue` (блок Promotion Costs)                   | Отображаются материалы для E1 и E2 с иконками `AkItemIcon`                    |
| **Стоимость элиты в LMD**                     | `data/constants.json` `evolveGoldCost`                                   | `AkOperatorStatsPanel.vue` (в карточках E1/E2)                      | Отображается в блоке Promotion Costs (E1 / E2) с иконкой LMD                  |
| **Опыт и LMD по уровням**                     | `data/constants.json` `characterExpMap, characterUpgradeCostMap`         | **Не показано**                                                     | Нет калькулятора/вывода затрат EXP и LMD до капа                              |
| **Расшифровка потенциалов**                   | `potentialRanks[].description`                                           | `AkOperatorStatsPanel.vue` (блок Potential Enhancement)             | Отображаются карточки бонусов P2–P6 с активным состоянием и бейджами перевода |
| **Бонусы доверия (Trust)**                    | `favorKeyFrames[].data`                                                  | `AkOperatorStatsPanel.vue` (в колонке Trust)                        | Стат учтен в формуле, но нет отдельной карточки капа доверия (+HP, +ATK)      |
| **Навыки: Иконка, Имя, Описание**             | `skills[].iconId, levels[].name, description`                            | `AkOperatorSkillsPanel.vue`                                         | Полностью отображается с RichText                                             |
| **Навыки: SP Cost, Init SP, Длительность**    | `skills[].levels[].spCost, initSp, duration`                             | `AkOperatorSkillsPanel.vue`                                         | Полностью отображается                                                        |
| **Навыки: Затраты на Мастерство (M1-M3)**     | `skills[].masteryCosts[].levelUpCost`                                    | `AkOperatorSkillsPanel.vue`                                         | Полностью отображается через `AkItemIcon`                                     |
| **Навыки: Затраты на уровни 1–7**             | `allSkillLvlup[].lvlUpCost`                                              | `AkOperatorSkillsPanel.vue` (блок Base Skill Levels)                | Отображаются все 6 шагов с условиями и суммарный итог материалов              |
| **Таланты: Имя, Описание, Условия**           | `talents[].candidates[]`                                                 | `AkOperatorTalentsPanel.vue`                                        | Полностью отображается                                                        |
| **Модули: Статы, Трейты, Истории, Стоимость** | `modules[].stages[], parts[], description`                               | `AkOperatorModulesPanel.vue`                                        | Полностью отображается                                                        |
| **Метаданные: Художник, Сэйю, Фракция, Код**  | `artist, va, faction, displayNumber, subclass`                           | `AkOperatorInfoPanel.vue`                                           | Полностью отображается                                                        |
| **Теги рекрутинга**                           | `tagList`                                                                | `AkOperatorInfoPanel.vue`                                           | Отображаются в виде чипов                                                     |
| **Анкета: Пол, День рождения, Рост, Раса**    | `data/handbook.json` (`profile`)                                         | **Ожидает UI (Задача 11)**                                          | Данные собраны и типизированы в `data/handbook.json`                          |
| **Физосмотр / Тесты боевых качеств**          | `data/handbook.json` (`physicalExam`)                                    | **Ожидает UI (Задача 11)**                                          | Данные собраны и типизированы в `data/handbook.json`                          |
| **Архивы оператора 1–4, Клиника, Промоушен**  | `data/handbook.json` (`stories`)                                         | **Ожидает UI (Задача 11)**                                          | Данные собраны и типизированы в `data/handbook.json`                          |
| **Голосовые реплики / транскрипты**           | `.cache/raw/en/handbook_info_table.json`                                 | **Не показано**                                                     | **Нет в `data/operators/*.json`**, нет в UI                                   |
| **Базовые навыки базы (RIIC Skills)**         | `.cache/raw/en/building_data.json`                                       | **Не показано**                                                     | **Нет в `data/operators/*.json`**, нет в UI                                   |
| **Гарантированные теги рекрутинга**           | `data/recruit.json`                                                      | **Не показано**                                                     | Нет кросс-линка со страницей калькулятора рекрутинга                          |
| **История появления в баннерах**              | `data/banners.json`                                                      | **Не показано**                                                     | Нет истории баннеров и даты дебюта                                            |

---

## 5. Приоритизация задач (P1 / P2 / P3)

### Приоритет P1: Данные готовы в `data/`, требуется только реализация UI-компонентов

_Эти задачи дадут максимальный прирост ценности вики без изменения скриптов сборки данных._

1. **P1.1 — Компонент сетки дальности атаки (`AkRangeGrid.vue`):** ✅ **РЕАЛИЗОВАНО**
   - Создан тактический компонент `app/components/ui/AkRangeGrid.vue` на дизайн-токенах Ember Editorial с поддержкой размеров `sm`, `md`, `lg`, выделением оператора прицельной сеткой (reticle), корректной обработкой мёртвых зон (Besieger `4-3`, где клетка оператора `matrix === 0`), 1x1 (`0-1`) и асимметричных ренжей (`b-1`).
   - Добавлена тактическая карточка `Attack Range` в `AkOperatorStatsPanel.vue` с динамическим реактивным переключением дальности при выборе фазы элиты (`E0 / E1 / E2`).
   - Изолирована ленивая подгрузка `data/ranges.json` в отдельный чанк через `app/composables/useOperatorRanges.ts` (`ranges-*.mjs`, 74.3 kB).
   - Компонент зарегистрирован в витрине `app/pages/_ui.vue` (UI // 13).
2. **P1.2 — Дальность атаки навыков в `AkOperatorSkillsPanel.vue`:** ✅ **РЕАЛИЗОВАНО**
   - Для каждого навыка на странице оператора выводится мини-сетка `AkRangeGrid` (`size="sm"`).
   - Если навык временно меняет ренж (`rangeId` не null, напр. Amiya S3 `3-4`), сетка выводится с бейджем `Skill Modified Range` (`variant="modified"`).
   - Если навык наследует дальность оператора (`rangeId === null`), выводится текущая дальность выбранной элиты с бейджем `Inherited from Operator` (`variant="inherited"`).
3. **P1.3 — Галерея скинов оператора (`AkOperatorSkinsPanel.vue` / расширение `AkArtViewer`):** ✅ **РЕАЛИЗОВАНО**
   - Добавлена вкладка `Outfits` в `app/pages/operators/[id].vue` с ленивой загрузкой данных через `useOperatorSkins`.
   - Карточки скинов отображают превью 480px WebP, бренд (`brandName`), название (`displaySkinName`), автора (`drawerList`), текстовое описание (`description`), цитату (`dialog`), способ получения (`obtainApproach`), тактические бейджи `CN ONLY` и `PENDING`, а также честный статус цены (`Base`, `Free`, `—`).
   - Кнопка «Inspect Artwork» открывает полноэкранный `AkArtViewer` с выбором наряда в оригинальном разрешении, циклической навигацией стрелками (клавиатура и кнопки `‹` `›`) и полосой миниатюр.
   - Селектор артов в `AkOperatorHero.vue` обновлен для отображения 1280px WebP арта выбранного скина.
4. **P1.4 — Секция затрат на повышение элиты (Evolve Costs):** ✅ **РЕАЛИЗОВАНО**
   - В `AkOperatorStatsPanel.vue` добавлена карточка `Promotion Costs` с разбивкой по ступеням элиты (E1, E2).
   - Отображаются необходимые материалы (`AkItemIcon`), валюта LMD (`data/constants.json -> evolveGoldCost`).
   - Учтены правила редкости: 3★ операторы (Fang) выводят E1 с 0 материалами и 10,000 LMD, а E2 отсутствует; 1★-2★ операторы скрывают блок полностью.
5. **P1.5 — Материалы прокачки базовых навыков 1–7 (`allSkillLvlup`):** ✅ **РЕАЛИЗОВАНО**
   - В `AkOperatorSkillsPanel.vue` добавлена секция `Base Skill Levels (1 → 7)`.
   - Отображаются баннер суммарного расхода материалов на прокачку 1->7 уровней и пошаговая сетка из 6 переходов (Lv 1->2 ... Lv 6->7) с указанием условий открытия (Req: E0/E1 Lv 1) и иконками `AkItemIcon`.
6. **P1.6 — Карточки бонусов потенциала (Potential Dossier):**
   - Под слайдером потенциала в `AkOperatorStatsPanel.vue` (или отдельным модальным окном) вывести список всех 5 рангов из `potentialRanks[]` с их официальными описаниями.

---

### Приоритет P2: Данные есть в `.cache/raw/`, требуется расширение пайплайна сборки

_Таблицы уже скачиваются в `.cache/raw/`, необходимо извлечь их в `scripts/data/build-operators.ts` и обновить схему._

1. **P2.1 — Извлечение анкеты оператора (Basic Info Profile):**
   - **Источник:** `.cache/raw/{en,cn}/handbook_info_table.json` (`handbookDict[charId].storyTextAudio[0]`).
   - **Поля:** Gender, Birthday, Place of Birth, Race, Height, Combat Experience, Infection Status.
   - **Действие:** Добавить парсер в `scripts/data/build-operators.ts`, расширить `OperatorDetailSchema.profile`, вывести в `AkOperatorInfoPanel.vue`.
2. **P2.2 — Извлечение навыков базы (RIIC Base Skills):**
   - **Источник:** `.cache/raw/{en,cn}/building_data.json` (`chars[charId].buffChar`, `buffs`).
   - **Поля:** комната размещения (Control, Factory, Trading, Dormitory), условие открытия (E0 / E2), название и описание баффа.
   - **Действие:** Расширить `build-operators.ts`, добавить новую вкладку «Base / RIIC» или секцию в инфо-панель.
3. **P2.3 — Извлечение историй и архивов (Archive Stories):**
   - **Источник:** `.cache/raw/{en,cn}/handbook_info_table.json` (Истории 1–4, Clinical Analysis, Promotion Record).
   - **Действие:** Создать отдельный файл историй (или lazy-чанк `data/stories/[id].json`, чтобы не раздувать базовый бандл оператора), добавить вкладку «Story / Lore».

---

### Приоритет P3: Данных нет в скачанных JSON, требуются новые источники

_Требуется подключение внешних таблиц или интеграция с другими модулями приложения._

1. **P3.1 — Озвучка и транскрипты реплик (Voice Lines):**
   - **Источник данных:** `charword_table.json` (аудио-транскрипты в апстриме SanityGoneAK) или аудиофайлы из репозитория ресурсов `yuanyan3060/ArknightsGameResource`.
   - **UI:** Плеер голосовых реплик с транскриптом на английском и японском.
2. **P3.2 — Интеграция с рекрутингом и тегами:**
   - **Источник данных:** локальный `data/recruit.json`.
   - **UI:** Бейдж «Recruitable» со ссылкой на калькулятор рекрутинга с предзаполненными тегами оператора.
3. **P3.3 — Даты релиза и история баннеров:**
   - **Источник данных:** `data/banners.json` + сторонние базы событий (PRTS Wiki / Fandom API / SanityGone Events).
   - **UI:** Карточка «Banner History» со списком дебютных и повторных баннеров оператора.

---

## 6. Резюме аудита

- **Всего проанализировано полей и сущностей:** **91**.
- **Отображается в UI сегодня:** **38** (41.8%).
- **НЕ отображается в UI:** **53** (58.2%).
- **Главные точки роста вики без расширения базы данных (P1):**
  1. Сетка дальности атаки оператора (`AkRangeGrid.vue` для фаз и скиллов).
  2. Галерея скинов с описанием нарядов и статусом цены.
  3. Полная материалоемкость (промоушен элиты и базовые уровни навыков 1–7).
  4. Описания улучшений потенциала (P1–P6).
