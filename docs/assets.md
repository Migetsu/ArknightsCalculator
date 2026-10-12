# Архитектура и выдача ассетов (Assets Architecture)

Документ описывает стратегию доставки изображений и ассетов для Arknights Companion: источники, CDN-инфраструктуру, защиту от лимитов Vercel, добавление новых видов ассетов и правовые ограничения.

---

## 1. Источники и CDN-инфраструктура

Прямые запросы (хотлинк) к ресурсам вроде `prts.wiki`, `fandom.com` или `raw.githubusercontent.com` из рантайма браузера пользователей **строго запрещены**. Прямой хотлинк нарушает правила вежливости к фанатским вики, а GitHub Raw имеет жесткие ограничения по rate-limit и Content-Type.

Все ассеты поставляются через единую чистую функцию [`resolveAsset()`](file:///c:/Projects/ArknightsCalculator/shared/utils/resolveAsset.ts), возвращающую упорядоченный список URL-кандидатов.

### Приоритет источников:

1. **Основной CDN (Primary):**
   - **Провайдер:** jsDelivr (`https://cdn.jsdelivr.net/gh/`)
   - **Репозиторий:** `yuanyan3060/ArknightsGameResource`
   - **Зафиксированный коммит:** `9bf239661e37766fba585806fb9fa67e79bb679e`
   - **Шаблон URL:**
     ```
     https://cdn.jsdelivr.net/gh/yuanyan3060/ArknightsGameResource@9bf239661e37766fba585806fb9fa67e79bb679e/{kind}/{id}.png
     ```
   - **Характеристики:** Глобальный Anycast CDN, HTTP/2 и HTTP/3, автоматическое сжатие, высокая надежность, отсутствие авторизации.

2. **Запасное зеркало (Secondary Mirror):**
   - **Провайдер:** Statically CDN (`https://cdn.statically.io/gh/`)
   - **Шаблон URL:**
     ```
     https://cdn.statically.io/gh/yuanyan3060/ArknightsGameResource/9bf239661e37766fba585806fb9fa67e79bb679e/{kind}/{id}.png
     ```
   - **Характеристики:** Автоматический fallback на клиенте, если основной CDN заблокирован или недоступен.

3. **Локальный плейсхолдер (Fallback):**
   - Если все внешние кандидаты вернули ошибку сети или 404, компонент (например, `AkAvatar`) не ломает верстку, а рендерит стилизованный плейсхолдер: моноширинные инициалы оператора на тёмном фоне с цветной полосой редкости (1★–6★).

---

## 2. Поддерживаемые типы ассетов (`AssetKind`)

| Тип (`kind`) | Директория  | Описание                      | Пример ID             | Пример URL                          |
| :----------- | :---------- | :---------------------------- | :-------------------- | :---------------------------------- |
| `avatar`     | `avatar/`   | Квадратные иконки операторов  | `char_102_texas`      | `.../avatar/char_102_texas.png`     |
| `portrait`   | `portrait/` | Вертикальные арты и портреты  | `char_102_texas`      | `.../portrait/char_102_texas.png`   |
| `item`       | `item/`     | Иконки материалов и предметов | `30012`               | `.../item/30012.png`                |
| `skill`      | `skill/`    | Иконки навыков                | `skcom_charge_cost_2` | `.../skill/skcom_charge_cost_2.png` |
| `equip`      | `equip/`    | Иконки модулей (Uniequip)     | `uniequip_002_texas`  | `.../equip/uniequip_002_texas.png`  |

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

Скрипт `scripts/data/build-asset-manifest.ts` (`npm run data:assets`) проверяет наличие файлов на основном CDN для всех операторов и формирует отчет:

```bash
npm run data:assets
```

Результаты проверки (октябрь 2026 г.):

- **Всего операторов:** 434
- **С доступными аватарами:** 431 (99.3%)
- **Без аватара:** 3 (`char_1037_amiya3`, `char_394_hadiya`, `char_366_acdrop` — новые/нерелизные CN-варианты)

Для операторов без аватара компонент `AkAvatar` гарантированно отображает резервный UI без битых картинок.

---

## 5. Как добавить новый тип ассета

1. Добавить тип в `AssetKind` в [`shared/utils/resolveAsset.ts`](file:///c:/Projects/ArknightsCalculator/shared/utils/resolveAsset.ts):
   ```typescript
   export type AssetKind = 'avatar' | 'portrait' | 'item' | 'skill' | 'equip' | 'enemy'
   ```
2. Зарегистрировать поддиректорию в `KIND_DIR_MAP`:
   ```typescript
   const KIND_DIR_MAP: Record<AssetKind, string> = {
     // ...
     enemy: 'enemy',
   }
   ```
3. Покрыть новый тип unit-тестом в `tests/unit/shared/resolveAsset.test.ts`.

---

## 6. Авторские права и дисклеймер

Все игровые изображения, арты операторов, иконки предметов и логотипы являются интеллектуальной собственностью **Hypergryph Co., Ltd.** и **Yostar, Inc.**.

Данный проект является бесплатным, неофициальным и фанатским компаньоном. Все материалы используются исключительно в справочных и информационных целях (Fair Use). В футере приложения на всех страницах выводится обязательный дисклеймер об авторских правах.
