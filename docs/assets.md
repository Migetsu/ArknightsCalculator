# Архитектура и выдача ассетов (Assets Architecture)

Документ описывает стратегию доставки изображений и ассетов для Arknights Companion: источники, CDN-инфраструктуру, защиту от лимитов Vercel, добавление новых видов ассетов и правовые ограничения.

---

## 1. Источники и CDN-инфраструктура

Прямые запросы (хотлинк) к ресурсам вроде `prts.wiki`, `fandom.com` или `raw.githubusercontent.com` из рантайма браузера пользователей **строго запрещены**. Прямой хотлинк нарушает правила вежливости к фанатским вики, а GitHub Raw имеет жесткие ограничения по rate-limit и Content-Type.

Все ассеты поставляются через единую чистую функцию [`resolveAsset()`](file:///c:/Projects/ArknightsCalculator/shared/utils/resolveAsset.ts), возвращающую упорядоченный список URL-кандидатов.

### Приоритет источников:

1. **Основной CDN (Primary):**
   - **Провайдер:** jsDelivr (`https://cdn.jsdelivr.net/gh/`)
   - **Таблица зафиксированных внешних репозиториев ресурсов:**

| Репозиторий                         | Зафиксированный SHA                        | Дата последнего коммита | Лицензия                                   | Назначение                          |
| :---------------------------------- | :----------------------------------------- | :---------------------- | :----------------------------------------- | :---------------------------------- |
| `yuanyan3060/ArknightsGameResource` | `9bf239661e37766fba585806fb9fa67e79bb679e` | 2026-10-09              | GNU AGPL-3.0                               | Аватары, портреты, предметы, навыки |
| `fexli/ArknightsResource`           | `d7bdc0146f99f6fa88ecdc1bbf79021c012c21c5` | 2026-10-10              | None / Custom (Game Fan Assets / Fair Use) | Модули операторов (100% покрытие)   |
| `Aceship/Arknight-Images`           | `0b28f9562fcadbd644c6225f8f8aefbb500b4d22` | 2024-05-01              | None / Custom (Game Fan Assets / Fair Use) | Резервный источник модулей (legacy) |

- **Шаблоны URL:**
  - Аватары / портреты: `https://cdn.jsdelivr.net/gh/yuanyan3060/ArknightsGameResource@9bf239661e37766fba585806fb9fa67e79bb679e/{kind}/{id}.png`
  - Навыки: `https://cdn.jsdelivr.net/gh/yuanyan3060/ArknightsGameResource@9bf239661e37766fba585806fb9fa67e79bb679e/skill/skill_icon_{iconId}.png`
  - Предметы: `https://cdn.jsdelivr.net/gh/yuanyan3060/ArknightsGameResource@9bf239661e37766fba585806fb9fa67e79bb679e/item/{iconId}.png`
  - Модули (Fexli): `https://cdn.jsdelivr.net/gh/fexli/ArknightsResource@d7bdc0146f99f6fa88ecdc1bbf79021c012c21c5/equip/{id}.png`
  - Модули (Aceship fallback): `https://cdn.jsdelivr.net/gh/Aceship/Arknight-Images@0b28f9562fcadbd644c6225f8f8aefbb500b4d22/equip/icon/{id}.png`
- **Характеристики:** Глобальный Anycast CDN, HTTP/2 и HTTP/3, автоматическое сжатие, высокая надежность, отсутствие авторизации.

2. **Запасное зеркало (Secondary Mirror):**
   - **Провайдер:** Statically CDN (`https://cdn.statically.io/gh/`)
   - **Шаблоны URL:**
     - Операторы/предметы/навыки: `https://cdn.statically.io/gh/yuanyan3060/ArknightsGameResource/9bf239661e37766fba585806fb9fa67e79bb679e/{kind}/{id}.png`
     - Модули: `https://cdn.statically.io/gh/fexli/ArknightsResource/d7bdc0146f99f6fa88ecdc1bbf79021c012c21c5/equip/{id}.png`
   - **Характеристики:** Автоматический fallback на клиенте, если основной CDN заблокирован или недоступен.

3. **Локальный плейсхолдер (Fallback):**
   - Если все внешние кандидаты вернули ошибку сети или 404, компоненты (`AkAvatar`, `AkItemIcon`, `AkSkillIcon`, `AkModuleIcon`) не ломают верстку, а рендерят стилизованные плейсхолдеры в стилистике Ember Editorial.

---

### 1.1. Разведка структуры папок и метрики веса ассетов (yuanyan3060/ArknightsGameResource, 13 октября 2026 г.)

По результатам анализа дерева коммита `9bf239661e37766fba585806fb9fa67e79bb679e` и реальных сетевых GET-запросов (HTTP Range 206 Partial Content) на выборке из 30 репрезентативных операторов (1★–6★):

| Категория ассета               | Папка в репозитории | Шаблон имени файла | Разрешение (px)    | Формат | Min (КБ) | Max (КБ) | Средний вес (КБ)        | Пример ID                             |
| :----------------------------- | :------------------ | :----------------- | :----------------- | :----- | :------- | :------- | :---------------------- | :------------------------------------ |
| **Квадратные кропы лиц**       | `avatar/`           | `{id}.png`         | **180×180**        | PNG    | 38.4     | 67.6     | **52.9 КБ**             | `char_172_svrash` (59.2 КБ)           |
| **Поясные портреты (E0/E1)**   | `portrait/`         | `{id}_1.png`       | **180×360**        | PNG    | 68.9     | 125.5    | **106.1 КБ**            | `char_172_svrash` (111.5 КБ)          |
| **Поясные портреты (E2)**      | `portrait/`         | `{id}_2.png`       | **180×360**        | PNG    | 95.8     | 127.8    | **113.3 КБ**            | `char_172_svrash` (126.8 КБ)          |
| **Полноразмерный арт (E0/E1)** | `skin/`             | `{id}_1b.png`      | **800~1024×1300**  | PNG    | 213.6    | 1515.0   | **689.4 КБ**            | `char_172_svrash` (990.4 КБ)          |
| **Полноразмерный арт (E2)**    | `skin/`             | `{id}_2b.png`      | **1024~2400×2000** | PNG    | 567.0    | 4266.7   | **2068.6 КБ** (2.07 МБ) | `char_003_kalts` (3118.7 КБ)          |
| **Скины персонажей**           | `skin/`             | `{id}_{skin}b.png` | **1024~2560×2000** | PNG    | 299.3    | 5755.2   | **2430.8 КБ** (2.43 МБ) | `char_003_kalts_sale#14b` (5755.2 КБ) |

> **Ключевой вывод:** Полные арты E2 в оригинальном разрешении в среднем весят более **2 МБ**, а максимальные — свыше **4.2 МБ**. Использование таких изображений в сетке каталога операторов привело бы к колоссальному расходу трафика (>150 МБ на страницу) и недопустимому LCP на мобильных соединениях. Поэтому для каталога используется скрипт генерации оптимизированных WebP миниатюр шириной 480px (`npm run data:thumbs`), снижающий средний вес карточки до ~60–80 КБ.

---

## 2. Поддерживаемые типы ассетов (`AssetKind`)

| Тип (`kind`) | Репозиторий CDN                                              | Описание                                       | Правило формирования пути                                                                               | Пример ID             |
| :----------- | :----------------------------------------------------------- | :--------------------------------------------- | :------------------------------------------------------------------------------------------------------ | :-------------------- |
| `avatar`     | `yuanyan3060/ArknightsGameResource`                          | Квадратные иконки операторов                   | `avatar/{id}.png` (с учетом Amiya Medic `char_1037_amiya3_2`)                                           | `char_102_texas`      |
| `portrait`   | `yuanyan3060/ArknightsGameResource`                          | Вертикальные поясные портреты                  | `portrait/{id}_{variant}.png`                                                                           | `char_102_texas`      |
| `art`        | `yuanyan3060/ArknightsGameResource` + локальный кэш миниатюр | Полноразмерный арт (E2 если есть, иначе E1/E0) | `/art/thumbs/{id}.webp` (для `thumbnail: true`) -> `skin/{id}_{variant}b.png` -> `portrait` -> `avatar` | `char_172_svrash`     |
| `item`       | `yuanyan3060/ArknightsGameResource`                          | Иконки материалов и предметов                  | `item/{iconId ?? id}.png`                                                                               | `30012` (`MTL_SL_G2`) |
| `skill`      | `yuanyan3060/ArknightsGameResource`                          | Иконки навыков                                 | `skill/skill_icon_{iconId ?? id}.png`                                                                   | `skchr_texas_2`       |
| `equip`      | `fexli/ArknightsResource` + `Aceship/Arknight-Images`        | Иконки модулей операторов                      | `equip/{id}.png` / `equip/icon/{id}.png` (для INITIAL: `original.png`)                                  | `uniequip_002_texas`  |

---

## 3. Защита от лимитов бесплатного тарифа Vercel

### Проблема:

Vercel Free (Hobby) Plan имеет жесткий лимит: **1 000 Image Optimization transformations в месяц**.
При наличии 434+ операторов, иконок предметов и навыков проксирование изображений через серверные функции Vercel исчерпало бы месячную квоту за первые сутки работы сайта.

### Решение:

В `nuxt.config.ts` модуль `@nuxt/image` сконфигурирован с `provider: 'none'`:

```typescript
image: {
  provider: 'none',
  domains: ['cdn.jsdelivr.net', 'cdn.statically.io'],
  format: ['webp', 'png'],
}
```

Благодаря этому:

- Браузер запрашивает ассеты **напрямую с глобальных CDN** jsDelivr и Statically.
- Расход квоты Vercel Image Optimization равен **0 / 1000**.
- Компоненты сохраняют преимущества правильной разметки: явные `width` и `height` для предотвращения сдвигов макета (Cumulative Layout Shift, CLS), `loading="lazy"`, `decoding="async"`.

---

## 4. Манифест доступности и полное покрытие ассетов (`data/asset-manifest.json`)

Скрипт `scripts/data/build-asset-manifest.ts` (`npm run data:assets`) выполняет полный аудит покрытия ассетов по дереву репозиториев (GitHub Git Trees API) без массовых HTTP-запросов и формирует манифест с `source: 'tree'`:

```bash
npm run data:assets
```

### 4.1. Результаты аудита покрытия по деревьям Git (13 октября 2026 г.)

| Категория ассетов           | Всего в БД | Существует на основном источнике | Пропусков на основном | Доля пропусков | Итоговое покрытие с fallback |
| :-------------------------- | :--------- | :------------------------------- | :-------------------- | :------------- | :--------------------------- |
| **Операторы (аватары)**     | 434        | 434                              | 0                     | 0.00%          | **100.0%** (434 / 434)       |
| **Предметы (`items.json`)** | 848        | 848                              | 0                     | 0.00%          | **100.0%** (848 / 848)       |
| **Навыки (`skills`)**       | 900        | 900                              | 0                     | 0.00%          | **100.0%** (900 / 900)       |
| **Модули (`modules`)**      | 891        | 632 (`Aceship`)                  | 259                   | 29.07%         | **100.0%** (891 / 891)       |

### 4.2. Анализ покрытия модулей и устранение пропусков

- **Причина пропусков в Aceship:** Коммит `0b28f9562fcadbd644c6225f8f8aefbb500b4d22` в `Aceship/Arknight-Images` датирован **01.05.2024**. Ровно **259 модулей** вышли в игре после этой даты.
- **Устранение:** Для модулей подключен актуальный репозиторий `fexli/ArknightsResource` (коммит `d7bdc0146f99f6fa88ecdc1bbf79021c012c21c5`), содержащий иконки для всех вышедших модулей.
- **Совокупный результат:** При комбинировании `fexli/ArknightsResource` и `Aceship/Arknight-Images` покрытие модулей составляет **891 / 891 (100.0%)** при 0 пропусков.

#### Первые 30 модулей, отсутствующих в базовом коммите Aceship (вышли после 01.05.2024, покрыты через Fexli):

1. `uniequip_004_kalts` — Kal'tsit's Specialized Badge (Kal'tsit)
2. `uniequip_003_huang` — “稍后回来” (Blaze)
3. `uniequip_002_amiya2` — Anger to be Tuned (Amiya Guard)
4. `uniequip_002_skadi2` — An Exuvia of Her Past (Skadi the Corrupting Heart)
5. `uniequip_003_skadi2` — 新生代 (Skadi the Corrupting Heart)
6. `uniequip_002_chen2` — Beach Combat Suit (Ch'en the Holungday)
7. `uniequip_003_chen2` — 假期的最后一天 (Ch'en the Holungday)
8. `uniequip_002_agoat2` — Sounds I Want to Retain (Eyjafjalla the Hvít Aska)
9. `uniequip_003_agoat2` — 想要留下的生命 (Eyjafjalla the Hvít Aska)
10. `uniequip_002_siege2` — The Adventure of the Lioness (Vina Victoria)
11. `uniequip_003_siege2` — 秩序圣“球” (Vina Victoria)
12. `uniequip_002_sora` — 'Unison' (Sora)
13. `uniequip_002_reed2` — 'A Floral Garland to the Red Dragon' (Reed the Flame-Shadow)
14. `uniequip_003_reed2` — “独属自己的一隅” (Reed the Flame-Shadow)
15. `uniequip_002_flwr2` — “双月的呼吸” (Muelsyse)
16. `uniequip_004_ghost2` — 归溟幽灵鲨特限证章 (Specter the Unchained)
17. `uniequip_002_hbisc2` — Crystal Corsage (Hibiscus the Purifier)
18. `uniequip_003_gvial2` — 好锯多磨 (Gavial the Invincible)
19. `uniequip_004_gvial2` — 百炼嘉维尔特限证章 (Gavial the Invincible)
20. `uniequip_003_texas2` — “新车和新生活” (Texas the Omertosa)
21. `uniequip_004_texas2` — 缄默德克萨斯特限证章 (Texas the Omertosa)
22. `uniequip_002_penunc` — Silent Justice (Penance)
23. `uniequip_003_penunc` — 荆棘的背面 (Penance)
24. `uniequip_002_chongy` — 'Reflections of Sights and Sounds' (Chongyue)
25. `uniequip_003_chongy` — “剑下有千山” (Chongyue)
26. `uniequip_002_qiubai` — 'Drizzle on the Cape' (Qiubai)
27. `uniequip_003_qiubai` — “听雨” (Qiubai)
28. `uniequip_002_yato2` — Hunting Boots (Kirin R Yato)
29. `uniequip_002_noirc2` — Rathalos S Armor (Rathalos S Noir Corne)
30. `uniequip_002_ines` — Dead Leaves and Twigs (Ines)

---

## 5. Аудит и живая проверка доставки (12–13 октября 2026 г.)

### 5.1. Сравнение CDN для операторов (jsDelivr vs Statically CDN)

Скрипт `scripts/data/verify-assets.ts` (`npm run data:verify-assets`) выполняет реальные HTTP GET-запросы к выборке из 60 операторов (все редкости 1★–6★, все 3 формы Амии, CN-операторы из манифеста):

| CDN-провайдер              | Успешных ответов     | Content-Type | Размер > 0 | Средняя задержка |
| :------------------------- | :------------------- | :----------- | :--------- | :--------------- |
| **jsDelivr (Primary)**     | **60 / 60 (100.0%)** | `image/png`  | 100%       | **165 мс**       |
| **Statically (Secondary)** | **60 / 60 (100.0%)** | `image/png`  | 100%       | **740 мс**       |

### 5.2. Амия со сменой класса (Class Change)

В репозитории `yuanyan3060/ArknightsGameResource@9bf239661e37766fba585806fb9fa67e79bb679e` проверены фактические имена файлов для трёх форм Амии:

1. **Кастер (`char_002_amiya`):**
   - Аватар: `avatar/char_002_amiya.png`
   - Портреты: `portrait/char_002_amiya_1.png` (дефолт) и `portrait/char_002_amiya_2.png` (E2)
2. **Гвардеец (`char_1001_amiya2`):**
   - Аватар: `avatar/char_1001_amiya2.png`
   - Портрет: только `portrait/char_1001_amiya2_2.png` (базовый `_1.png` в репозитории отсутствует)
3. **Медик (`char_1037_amiya3`):**
   - Аватар: `avatar/char_1037_amiya3_2.png` (базовый `char_1037_amiya3.png` в репозитории отсутствует)
   - Портрет: только `portrait/char_1037_amiya3_2.png`

В [`shared/utils/resolveAsset.ts`](file:///c:/Projects/ArknightsCalculator/shared/utils/resolveAsset.ts) добавлены явные маппинги:

- `AVATAR_DEFAULT_OVERRIDE_MAP`: маппит `char_1037_amiya3` на `char_1037_amiya3_2`.
- `PORTRAIT_DEFAULT_VARIANT_MAP`: для `char_1001_amiya2` и `char_1037_amiya3` основным вариантом портрета назначен `'2'`.

### 5.3. Проверка в DOM и доля fallback-аватаров

В тесте Playwright `tests/e2e/audit-assets-dom.spec.ts` выполнена визуальная и DOM-проверка каталога `/operators`:

- Проверено наличие реальных изображений: `naturalWidth > 0` для всех отрендеренных `<img>`.
- Полный скролл каталога (376 доступных глобальных операторов):
  - Отрендерено карточек: **376 / 376**
  - Загружено аватаров: **376 / 376**
  - Плейсхолдеров-инициалов (`fallbackCount`): **0**
  - **Доля fallback-аватаров (`fallbackRatio`): 0.0%**

### 5.4. Аудит предметов, навыков и модулей (13 октября 2026 г.)

Скрипт `scripts/data/verify-new-assets.ts` выполнил живую проверку (HTTP GET) выборки из **61 предмета**, **60 навыков** и **60 модулей** операторов:

| Категория ассетов     | Выборка | jsDelivr (Primary)   | Statically (Secondary) | Средняя задержка jsDelivr | Особенности путей / исправленные расхождения                                                                                                                                                                                         |
| :-------------------- | :------ | :------------------- | :--------------------- | :------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Предметы (`item`)** | 61      | **61 / 61 (100.0%)** | **61 / 61 (100.0%)**   | 418 мс                    | В игровых данных предметы имеют `iconId` (например, `30012` -> `MTL_SL_G2.png`, `4001` -> `GOLD.png`). `resolveAsset` отдает приоритет `options.iconId`.                                                                             |
| **Навыки (`skill`)**  | 60      | **60 / 60 (100.0%)** | **60 / 60 (100.0%)**   | 432 мс                    | Файлы навыков в репозитории игры обязательно имеют префикс `skill_icon_` (`skill_icon_{iconId}.png`). Общие навыки (например, Power Strike у Блейз) имеют свой `iconId` (`skcom_powerstrike[3]`).                                    |
| **Модули (`equip`)**  | 60      | **60 / 60 (100.0%)** | **60 / 60 (100.0%)**   | 362 мс                    | Модули доставляются из зафиксированного репозитория `Aceship/Arknight-Images@0b28f9562fcadbd644c6225f8f8aefbb500b4d22`. Уникальные модули берутся из `equip/icon/{id}.png`, а начальные бейджи (`_001_`) маппятся на `original.png`. |

---

## 6. Как добавить новый тип ассета

1. Добавить тип в `AssetKind` в [`shared/utils/resolveAsset.ts`](file:///c:/Projects/ArknightsCalculator/shared/utils/resolveAsset.ts):
   ```typescript
   export type AssetKind = 'avatar' | 'portrait' | 'item' | 'skill' | 'equip' | 'enemy'
   ```
2. Зарегистрировать поддиректорию в `KIND_DIR_MAP`.
3. Покрыть новый тип unit-тестом в `tests/unit/shared/resolveAsset.test.ts`.

---

## 7. План на случай исчезновения внешних репозиториев (Disaster Recovery)

В случае удаления или блокировки любого из апстрим-репозиториев (`yuanyan3060/ArknightsGameResource`, `fexli/ArknightsResource`, `Aceship/Arknight-Images`) доставка ассетов защищена многоуровневым планом обеспечения непрерывности:

1. **Многоуровневый Fallback:**
   - Клиентская функция `resolveAsset()` автоматически пробует запасной CDN (`cdn.statically.io`), а для модулей — цепочку `fexli` -> `Aceship` -> SVG/CSS плейсхолдер.
2. **Скрипт автономного зеркалирования (`scripts/data/mirror-assets.ts`):**
   - В проект включён скрипт локального кэширования:
     ```bash
     npm run data:mirror-assets
     ```
   - Скрипт последовательно скачивает файлы, перечисленные в `data/asset-manifest.json`, сохраняя их в локальное хранилище `.cache/assets-mirror/` с вежливыми интервалами между запросами.
3. **Хранилище артефактов (Object Storage):**
   - При необходимости зеркало ассетов загружается в бесплатный бакет Cloudflare R2 (10 GB бесплатного хранилища, 0$ за исходящий трафик) или GitHub Releases/Pages.
   - В `shared/utils/resolveAsset.ts` для переключения на собственное зеркало достаточно изменить `ASSET_CDN_BASE` через переменную окружения `NUXT_PUBLIC_ASSET_CDN_URL`.

---

## 8. Авторские права и дисклеймер

Все игровые изображения, арты операторов, иконки предметов и логотипы являются интеллектуальной собственностью **Hypergryph Co., Ltd.** и **Yostar, Inc.**.

Данный проект является бесплатным, неофициальным и фанатским компаньоном. Все материалы используются исключительно в справочных и информационных целях (Fair Use). В футере приложения на всех страницах выводится обязательный дисклеймер об авторских правах.
