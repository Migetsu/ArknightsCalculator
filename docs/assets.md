# Архитектура и выдача ассетов (Assets Architecture)

Документ описывает стратегию доставки изображений и ассетов для Arknights Companion: источники, CDN-инфраструктуру, защиту от лимитов Vercel, добавление новых видов ассетов и правовые ограничения.

---

## 1. Источники и CDN-инфраструктура

Прямые запросы (хотлинк) к ресурсам вроде `prts.wiki`, `fandom.com` или `raw.githubusercontent.com` из рантайма браузера пользователей **строго запрещены**. Прямой хотлинк нарушает правила вежливости к фанатским вики, а GitHub Raw имеет жесткие ограничения по rate-limit и Content-Type.

Все ассеты поставляются через единую чистую функцию [`resolveAsset()`](file:///c:/Projects/ArknightsCalculator/shared/utils/resolveAsset.ts), возвращающую упорядоченный список URL-кандидатов.

### Приоритет источников:

1. **Основной CDN (Primary):**
   - **Провайдер:** jsDelivr (`https://cdn.jsdelivr.net/gh/`)
   - **Репозиторий операторов, навыков и предметов:** `yuanyan3060/ArknightsGameResource` (коммит `9bf239661e37766fba585806fb9fa67e79bb679e`)
   - **Репозиторий эксклюзивных модулей (equip):** `Aceship/Arknight-Images` (коммит `0b28f9562fcadbd644c6225f8f8aefbb500b4d22`)
   - **Шаблоны URL:**
     - Аватары / портреты: `https://cdn.jsdelivr.net/gh/yuanyan3060/ArknightsGameResource@9bf239661e37766fba585806fb9fa67e79bb679e/{kind}/{id}.png`
     - Навыки: `https://cdn.jsdelivr.net/gh/yuanyan3060/ArknightsGameResource@9bf239661e37766fba585806fb9fa67e79bb679e/skill/skill_icon_{iconId}.png`
     - Предметы: `https://cdn.jsdelivr.net/gh/yuanyan3060/ArknightsGameResource@9bf239661e37766fba585806fb9fa67e79bb679e/item/{iconId}.png`
     - Модули: `https://cdn.jsdelivr.net/gh/Aceship/Arknight-Images@0b28f9562fcadbd644c6225f8f8aefbb500b4d22/equip/icon/{id}.png`
   - **Характеристики:** Глобальный Anycast CDN, HTTP/2 и HTTP/3, автоматическое сжатие, высокая надежность, отсутствие авторизации.

2. **Запасное зеркало (Secondary Mirror):**
   - **Провайдер:** Statically CDN (`https://cdn.statically.io/gh/`)
   - **Шаблоны URL:**
     - Операторы/предметы/навыки: `https://cdn.statically.io/gh/yuanyan3060/ArknightsGameResource/9bf239661e37766fba585806fb9fa67e79bb679e/{kind}/{id}.png`
     - Модули: `https://cdn.statically.io/gh/Aceship/Arknight-Images/0b28f9562fcadbd644c6225f8f8aefbb500b4d22/equip/icon/{id}.png`
   - **Характеристики:** Автоматический fallback на клиенте, если основной CDN заблокирован или недоступен.

3. **Локальный плейсхолдер (Fallback):**
   - Если все внешние кандидаты вернули ошибку сети или 404, компоненты (`AkAvatar`, `AkItemIcon`, `AkSkillIcon`, `AkModuleIcon`) не ломают верстку, а рендерят стилизованные плейсхолдеры в стилистике Ember Editorial.

---

## 2. Поддерживаемые типы ассетов (`AssetKind`)

| Тип (`kind`) | Репозиторий CDN                     | Описание                      | Правило формирования пути                                     | Пример ID             |
| :----------- | :---------------------------------- | :---------------------------- | :------------------------------------------------------------ | :-------------------- |
| `avatar`     | `yuanyan3060/ArknightsGameResource` | Квадратные иконки операторов  | `avatar/{id}.png` (с учетом Amiya Medic `char_1037_amiya3_2`) | `char_102_texas`      |
| `portrait`   | `yuanyan3060/ArknightsGameResource` | Вертикальные арты и портреты  | `portrait/{id}_{variant}.png`                                 | `char_102_texas`      |
| `item`       | `yuanyan3060/ArknightsGameResource` | Иконки материалов и предметов | `item/{iconId ?? id}.png`                                     | `30012` (`MTL_SL_G2`) |
| `skill`      | `yuanyan3060/ArknightsGameResource` | Иконки навыков                | `skill/skill_icon_{iconId ?? id}.png`                         | `skchr_texas_2`       |
| `equip`      | `Aceship/Arknight-Images`           | Иконки модулей операторов     | `equip/icon/{id}.png` (для INITIAL: `original.png`)           | `uniequip_002_texas`  |

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

## 4. Манифест доступности ассетов (`data/asset-manifest.json`)

Скрипт `scripts/data/build-asset-manifest.ts` (`npm run data:assets`) проверяет доступность файлов на основном CDN для всех операторов через реальные HTTP GET-запросы с ограничением параллелизма (10 потоков) и формирует манифест с полем `source: 'http' | 'tree'`:

```bash
npm run data:assets
```

Результаты проверки после аудита (12 октября 2026 г.):

- **Всего операторов:** 434
- **С подтверждёнными аватарами (`source: "http"`):** 434 (100.0%)
- **Без аватара:** 0

Все 434 оператора имеют подтверждённую прямую отдачу аватара по HTTP GET.

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

## 7. Авторские права и дисклеймер

Все игровые изображения, арты операторов, иконки предметов и логотипы являются интеллектуальной собственностью **Hypergryph Co., Ltd.** и **Yostar, Inc.**.

Данный проект является бесплатным, неофициальным и фанатским компаньоном. Все материалы используются исключительно в справочных и информационных целях (Fair Use). В футере приложения на всех страницах выводится обязательный дисклеймер об авторских правах.
