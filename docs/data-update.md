# Регламент обновления игровых данных и ассетов (Data & Assets Update Guide)

Документ описывает процедуру регулярного обновления игровых данных (операторы, предметы, навыки, модули, шансы выпадения) и синхронизации оптимизированных WebP-ассетов при выходе новых игровых событий и персонажей.

---

## 1. Обзор конвейера данных

Данные игры не парсятся в рантайме браузера. Типизированные JSON-файлы генерируются скриптами в директории `scripts/data/` и сохраняются в `data/`:

| Команда                  | Скрипт                                 | Описание                                                                                             |
| :----------------------- | :------------------------------------- | :--------------------------------------------------------------------------------------------------- |
| `npm run data:sync`      | `scripts/data/sync.ts`                 | Загрузка сырых данных Hypergryph/Kael's (CN) и YoStar (EN), генерация `operators.json`, `items.json` |
| `npm run data:benchmark` | `scripts/data/sync-penguin.ts`         | Загрузка матриц шансов выпадения предметов Penguin Stats (CN и Global)                               |
| `npm run data:assets`    | `scripts/data/build-asset-manifest.ts` | Проверка целостности и покрытие ассетов по деревьям Git-репозиториев (`asset-manifest.json`)         |
| `npm run data:thumbs`    | `scripts/data/build-art-thumbs.ts`     | Генерация WebP миниатюр (480px) и Hero-копий (1280px) через Sharp                                    |
| `npm run data:validate`  | `scripts/data/validate.ts`             | Валидация всех сгенерированных JSON-файлов по Zod-схемам                                             |

---

## 2. Обновление оптимизированных WebP-ассетов (`Migetsu/arkcalc-assets`)

Для быстрой загрузки каталога и первого экрана страницы оператора в продакшене используется репозиторий оптимизированных ассетов [`Migetsu/arkcalc-assets`](https://github.com/Migetsu/arkcalc-assets) с раздачей через jsDelivr CDN.

### Порядок действий при добавлении новых операторов:

1. **Генерация новых WebP-изображений:**
   Запустите скрипт генерации миниатюр:

   ```bash
   npm run data:thumbs
   ```

   Скрипт загружает оригинальные арты из апстрим-репозитория `yuanyan3060/ArknightsGameResource`, масштабирует их и конвертирует в WebP:
   - `public/art/thumbs/{id}.webp` — 480px по ширине, сжатие `quality: 80` (средний вес ~66 КБ).
   - `public/art/hero/{id}.webp` — 1280px по ширине, сжатие `quality: 82` (средний вес ~180 КБ, диапазон 150–250 КБ).
   - Для роботов и 1★–2★ операторов без скинов `_1b.png` скрипт автоматически использует fallback на `portrait/*_1.png`.

2. **Синхронизация с репозиторием ассетов:**
   Перенесите сгенерированные файлы из `public/art/thumbs/` и `public/art/hero/` в локальный клон репозитория `Migetsu/arkcalc-assets`:

   ```bash
   git add art/thumbs/ art/hero/
   git commit -m "feat(assets): add webp thumbnails and hero copies for new operators"
   git push origin main
   ```

3. **Фиксация нового commit SHA:**
   Скопируйте полученный полный SHA коммита (40 символов) и обновите константу `OPTIMIZED_ASSETS_COMMIT` в файле [`shared/utils/resolveAsset.ts`](file:///c:/Projects/ArknightsCalculator/shared/utils/resolveAsset.ts):

   ```typescript
   export const OPTIMIZED_ASSETS_COMMIT = '<НОВЫЙ_COMMIT_SHA>'
   ```

4. **Проверка отдачи через jsDelivr CDN:**
   Проверьте реальным HTTP GET-запросом, что jsDelivr отдаёт новые файлы с кодом `200 OK` и типом `image/webp`:

   ```bash
   curl -I https://cdn.jsdelivr.net/gh/Migetsu/arkcalc-assets@<НОВЫЙ_COMMIT_SHA>/art/hero/char_172_svrash.webp
   ```

   Убедитесь в наличии заголовков:
   - `HTTP/2 200`
   - `content-type: image/webp`
   - `cache-control: public, max-age=31536000, immutable`

5. **Тестирование и валидация:**
   ```bash
   npm run test
   npm run test:e2e
   ```

---

## 3. Политика оформления обновлений данных в Git

В соответствии с правилом `AGENTS.md` (раздел 3):

- Обновления данных игры **не коммитятся напрямую в main**.
- Каждое обновление оформляется отдельной веткой (например, `chore/data-update-2026-11`) и Pull Request с подробным отчетом о различиях (`git diff --stat data/`).
- Все тесты, валидация схем (`npm run data:validate`) и E2E тесты должны быть зелеными перед слиянием.
