# Передача проекта ArknightsCalculator

Документ для следующего агента, который продолжит разработку.

Состояние зафиксировано **2026-10-20** на `main` = `8c96900`. Все числа ниже проверены командами на
этом состоянии, а не переписаны из отчётов. Перед началом работы стоит прогнать пару команд из §6
и убедиться, что состояние не уехало вперёд.

---

## 1. Что за проект

**ArknightsCalculator** — Nuxt 4 + TypeScript strict + Pinia + SCSS + Zod, компаньон-приложение
по Arknights: операторы, баннеры, гача, планировщик, склад, фарм, рекрут, дашборд.

|                    |                                                                |
| ------------------ | -------------------------------------------------------------- |
| GitHub             | `Migetsu/ArknightsCalculator` (владелец — пользователь)        |
| Локально           | `C:\Projects\ArknightsCalculator`                              |
| Скрипты данных     | `jiti` (не `tsx`), данные в `data/`, схемы в `shared/schemas/` |
| Оболочка на машине | bash (git-bash / MSYS), **не** PowerShell                      |
| `gh` CLI           | **отсутствует** (токен — см. §6)                               |

## 2. Модель работы — прочитай до первой задачи

Работа идёт **нумерованными задачами**, цикл такой:

```
ассистент пишет бриф (один копируемый блок) → агент кодит в ветке → PR → отчёт
→ приёмка по артефактам → следующий номер
```

Ключевое: **приёмка никогда не делается по тексту отчёта.** Отчёт проверяется командами:
`git log`, CI через GitHub API, пересчёт счётчиков из самих JSON, `grep` на удалённое,
HTTP-коды для внешних ссылок. За историю проекта было три отклонения именно за выдуманные
числа и несуществующие примеры.

### 2.1. Формат выдачи задачи (решение владельца 2026-10-20)

Брифы длинные, владелец их не читает целиком. Каждая задача выдаётся двумя частями:

1. **Выжимка для владельца** — 5–8 строк простым языком: что делаем, что изменится
   для пользователя, как проверим, чего не трогаем, главный риск и примерная сложность.
2. **Промпт агенту** — полный текст одним копируемым блоком.

Отчёт агента тоже принимается коротким вердиктом: принято / не принято, 3–5 пунктов
с причинами и ссылками на проверки, без пересказа всего отчёта.

Формат мерж-коммита: `NN: <заголовок>`, squash, ветка на задачу, ветка удаляется после мержа.

## 3. Текущее состояние (проверено)

| Что                     | Значение                                                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `main`                  | **`f0f88b9`** — `32: домен rhodeslab.vercel.app`                                                                  |
| Открытые PR             | **0**                                                                                                             |
| Тесты                   | **911 в 109 файлах** (стабильно, задачи 22–31)                                                                    |
| i18n                    | **715 ключей**, `npm run i18n:check` зелёный                                                                      |
| `npm run data:validate` | **0 issues**                                                                                                      |
| `data/`                 | **40.96 MB** (operators 22.37, handbook 10.62, i18n 0.63)                                                         |
| `data/skins.json`       | 1.58 MB, **1359** скинов (official 1319 / machine 40)                                                             |
| `data/banners.json`     | 2.07 MB, **861** баннер (454 с артом, 590 с составом)                                                             |
| Досье                   | **432** файла в `data/handbook/`                                                                                  |
| Ренжи                   | **73** (объект по ключам `0-1`, `0-2`, …)                                                                         |
| Бандл build             | public `_nuxt` **3.54 MB / 79**; JS **2.85 MB / 50**; server chunks **156**; PWA `sw.js` + `manifest.webmanifest` |

Модули приложения: `dashboard`, `operators`, `planner`, `depot`, `farming`, `recruit`, `gacha`,
`settings` — все рабочие.

## 4. Правила, которые нельзя нарушать

1. **`AGENTS.md` авторитетнее любого брифа.** Читается первым, при конфликте побеждает он.
2. **Порт 3000 — dev-сервер владельца. Не трогать вообще.**
   - сборка: `NUXT_BUILD_DIR=.nuxt-agent` (обычный `npm run build` падает с Nuxt-lock,
     пока сервер владельца жив);
   - агентский dev — порт 3001; занятый 3001 переиспользовать, не перезапускать.
3. **Мерж-политика §14.** Мержить самому можно **только при полностью зелёном CI на PR**.
   Ручное одобрение владельца требуется для: секретов/`.env.example`, миграций Supabase/RLS,
   интеграции Yostar-логина, ослабления тестов, роста `data/` или бандла больше **25%**.
4. **Не выдумывать данные.** Все числа в отчёте — из фактического вывода команд.
   «Расхождение в отчёте хуже, чем невыполненный пункт».
5. **Ответы владельцу — по-русски.** Код, комментарии, коммиты — по-английски.
6. **Брифы — одним копируемым блоком**, без комментариев внутри.
7. **Скрипты данных на `jiti`.** `tsx` из проекта удалён.
8. **В основном репозитории не должно быть изображений.** `public/art/` и `temp-assets-repo/`
   в `.gitignore`. Исключение — 4 старых дизайн-референса в `docs/design-refs/`, их не трогать.
9. **CI:** на PR — три проверки (Code Quality & Unit Tests, E2E Smoke Tests, Vercel).
   **На `main` E2E всегда `skipped` — это by design** (`if: github.event_name == 'pull_request'`
   в `.github/workflows/ci.yml`). Не считать падением и не «починять».

## 5. Что уже сделано по контенту

| Задача | Результат                                                                                                                                     |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **17** | CI починен: `buildBannersFromTables` отделена от диска (тест не зависит от `.cache`); heap 4096 и `sourcemap: false` — лечение симптома OOM   |
| **18** | Перевод скинов и баннеров через существующий пайплайн: `data/i18n/machine/skins.json` (203), `banners.json` (453)                             |
| **19** | Арты баннеров: 304 файла → 480px WebP (~39 КБ) в `Migetsu/arkcalc-assets`, пин `fb1b4d1f`, поля `hasArt`/`artId`, ленивая загрузка + заглушка |
| **20** | Состав баннеров и **реальные даты Global** из вики (417 блоков), 187 пар CN↔EN, `calculateEstimatedGlobalDate` удалена                        |
| **21** | Официальные названия вместо машинного перевода: слои `manual → official → wiki → machine → zh` в `scripts/data/i18n-layers.ts`                |

**Главный разведанный источник:** `arknights.wiki.gg`, страницы `Headhunting/Banners/<год>` —
шаблоны `{{Banners cell}}` с полями `name`, `cnstart/cnend`, `globalstart/globalend`,
`operators`, `limited`. Доступ: `api.php?action=parse&prop=wikitext`, UA
`ArknightsCalculator-Build/1.0`, кэш в `.cache/`, лицензия **CC-BY-SA 4.0**.

## 6. Как проверять (рабочий ритуал)

`gh` CLI на машине **нет**. Токен достаётся так (и **никогда не печатается** в выводе):

```bash
TOKEN=$(printf 'protocol=https\nhost=github.com\n\n' | git credential fill 2>/dev/null \
        | sed -n 's/^password=//p')

# head PR → sha
curl -s -H "Authorization: Bearer ***" \
  "https://api.github.com/repos/Migetsu/ArknightsCalculator/pulls/<N>" \
  | python -c "import json,sys;print(json.load(sys.stdin)['head']['sha'])"

# проверки на sha
curl -s -H "Authorization: Bearer ***" \
  "https://api.github.com/repos/Migetsu/ArknightsCalculator/commits/<sha>/check-runs" \
  | python -c "
import json,sys
for r in json.load(sys.stdin).get('check_runs',[]):
    print('  -',r['name'],'|',r['status'],'|',r['conclusion'])"
```

Порядок приёмки:

1. `git log --oneline -3` и `git status --short` — что реально смержено и чисто ли дерево;
2. CI на head PR (все три) и отдельно на `main` (Code Quality; E2E skipped — норма);
3. **пересчитать счётчики из самих JSON**, а не читать таблицу отчёта;
4. `grep`/`rg` на удалённое и добавленное;
5. внешние ссылки (CDN, вики) — HTTP-кодами через `curl -I`.

Оболочка — **bash**. Пути к нативным программам давать как `C:/...`, не `/c/...`
(MSYS-конвертация путей отключена).

## 7. Открытые проблемы и долг

### 7.1. Нестабильный полный прогон — закрыт (Задача 22, `8b21b84`)

Полный `vitest run` флейкал под нагрузкой: 50 Nuxt-файлов поднимали приложение в `beforeAll`
и не укладывались в 10 s hook-таймаут. В PR #82 воркеры ограничены
`min(12, availableParallelism() - 1)`, для проекта `nuxt` задан `hookTimeout: 30_000`;
пять прогонов зелёные, медиана 18.19 s против 24.20 s до. Подробности — `docs/progress.md`
и `docs/known-issues.md`. `isolate: false` по-прежнему не использовать (флейк
в `tests/unit/shared/farming/optimize.test.ts`).

Остаточный флейк: `tests/unit/scripts/patch-vue.test.ts` на холодном Vite-кеше иногда
не укладывается в дефолтные 5 s (прогон 2026-10-21: 1 падение из 789, повтор зелёный).
CI зелёный; кандидат на отдельный прогрев/таймаут, не блокирует задачи 24–25.

### 7.2. OOM/серверные чанки — закрыто (Задача 27, `3554aef`)

Причина: `useOperatorDetail`/`useOperatorHandbook` динамически импортировали 432+432 JSON,
Vite/Nitro создавал чанк на файл (`.output/server/chunks` = 1005). Голый `serverAssets`
в Nitro 2.13.4 тоже делает `import('raw:'+path)` на ассет, поэтому сделана build-time
агрегация: `modules/server-data-assets/` группирует 434 operator + 432 handbook файла
в **8 + 4 бакета** в `.cache/server-data-assets`, отдаёт их как `assets:operators`/
`assets:handbook`; API-роуты `/api/operators/[id]`, `/api/handbook/[id]` читают бакеты,
id валидируется, 404/400, cache-control 1h. SSR через `useRequestFetch`, клиент через `$fetch`,
контракт композаблов сохранён.

Метрики: chunks **1005 → 153** (12 бакетов), `.output/server` 50.68 → 38.65 MB,
`.output/public/_nuxt` 28.96 MB / 920 JS → **6.07 MB / 51 JS**, `.output` 80.5 → 45.56 MB (−43%),
peak process-tree 4.1 → 2.6 GB, сборка 1m20 → 1m14 cold. Тесты 789 → **802/99**, 0 skip.
CI и Vercel preview зелёные. Локальный Windows prod preview даёт 500 на страницах со сторами
(`getActivePinia`) — воспроизведено на чистом `main`, pre-existing/environment-specific,
записано в `known-issues.md`. После `npm run data:*` dev-сервер надо перезапустить
(бакеты строятся на старте).

### 7.3. Апстрим запинован по SHA

`scripts/data/sources.config.ts` держит `commit: 'b5ff1ff3…'`. Любой крон бесполезен, пока
воркфлоу не умеет двигать пин.

### 7.4. Цены скинов неизвестны

`price: null`; `priceStatus`: default 833 / free 123 / **unknown 403**. Выдуманную эвристику
удалили; источника до сих пор нет.

### 7.5. Машинные названия там, где официальных нет

40 CN-only скинов и 255 CN-баннеров (ротации NORM/CLASSIC — вики их не перечисляет).

### 7.6. 149 CN-баннеров без арта

Файлов нет в апстриме `fexli/ArknightsResource/gacha/`.

### 7.7. Yostar-синк — закрыто (Задача 26, `dfcf1ee`)

Stateless Nitro-прокси: `send-code` → `get-auth` → `user/login` → u8 → `account/login` →
`syncData`; токен на устройстве в `localStorage['arkcalc_yostar_session']` (решение
владельца, TTL 30 дней), повторный sync без кода, 401/expiry/Disconnect очищают. Live
2026-10-21: login 200, **132 оператора, 78 предметов, доктор 72**; sync по сессии те же
числа. Malformed token дал 502 `unavailable`, не 401 — записано в known-issues; UI
reload/Disconnect и 401-путь покрыты моками, не live. JP/KR отключены; 7 upstream-вызовов
против 10s Vercel Hobby — риск.

### 7.8. Supabase — только фундамент

Профиль, RLS, миграция `0001`, `useProfile`. Синхронизации данных игры нет.

### 7.9. Мусор в origin

24+ старых веток. Стоит почистить одной задачей.

### 7.10. Сделано, не переделывать

`scripts/patch-vue.mjs` уже самопроверяющийся: PR #68 (`3a9082a`), `process.exit(1)`
при несовпадении паттернов, тест проверяет реальные dist-файлы.

### 7.11. Окно upcoming CN-баннеров — закрыто (Задача 23, `13c868c`)

На `/gacha` текущий EN-баннер и **11 upcoming CN-баннеров** (2026-05-15 … 2026-10-09) вместо
453-архива; окно data-driven, без `Date.now()`, прогноз EST от CN-локальной даты. CN-даты
исправлены на UTC+8. Тесты: 785/96, 0 skip. Полный архив и пагинация удалены. Бейджи
`ENDED`/`ACTIVE NOW` у upcoming-карточек оставлены как есть (отдельное UX-решение,
`known-issues.md`).

### 7.12. Арты баннеров — закрыто (Задача 24, `17037d7`)

12 видимых баннеров (текущий EN + 11 upcoming) получили арт с вики: 480px WebP опубликованы
в `Migetsu/arkcalc-assets` (commit `e5e06ce`), пин `OPTIMIZED_ASSETS_COMMIT` обновлён,
`data/banner-arts.json` 307. EN-маппинг теперь pair-first (`pairedBannerId` → raw EN),
9 чужих артов исправлены, 2 пары без арта честно `hasArt:false`. `hasArt` 335 → 454.
Остались 147 CN и 260 EN без арта, 22 legacy non-pair группы — в `known-issues.md`.
Тесты 788/96, 0 skip.

### 7.13. Активный EN-баннер — закрыто (Задача 25, `053a511`)

Hero заменён на `GachaBannerCard`: арт, 6 операторов, EN-даты, `ACTIVE NOW`, limited-класс,
клик выбирает баннер; 11 upcoming не задеты. Тесты 789/96. Попутно исправлен приоритет
арта: опубликованный `${artId}.webp` идёт первым (legacy stripped `_EN` давал 404).
Отложено: вложенные `NuxtLink` аватаров внутри `role="button"` и имя `orient #7`
(слой i18n) — в `known-issues.md`.

### 7.14. Slow 4G — частично закрыто (Задача 28, `a547adf`)

`data/skins.json` → `assets:skins` + `/api/skins/[id]` (SilverAsh 1.8 MB → 5.7 KB),
`data/banners.json` → `/api/gacha/banners` с проекцией 10.2 KB. Public JS 5.38 → **2.85 MB**,
`_nuxt` 6.07 → 3.53 MB, gacha scriptKb 2572 → **1072 (−58%)**, detail transfer 3674 → 2207 KB.
E2E-бюджеты Slow 4G добавлены; попутно `nitro.externals.inline: ['pinia']` убрал pre-existing
500 в prod preview. **LCP −20% не достигнут**: FCP = LCP и наступает до гидратации, страница
ограничена 331 KB SSR HTML + render-blocking CSS. TBT после правок выше/шумный и не входит
в бюджеты — это отдельный follow-up.

### 7.15. LCP / critical CSS / TBT (Задача 28b)

Нужно: paired baseline и after одной методикой, включая TBT; бюджет TBT в E2E; уменьшить
SSR HTML и critical CSS (или осознанно сделать тяжёлые страницы client-only, если это не
ломает SEO); `/farming` всё ещё грузит 1.37 MB penguin+stages, `items.json` 207 KB через
`AkItemIcon` — в `known-issues.md`. Без этого «производительность на Slow 4G» закрыта лишь
по размеру JS, но не по LCP/TBT.

### 7.16. Лицензии и атрибуция — закрыто (Задача 29, `0882d37`)

Добавлены `NOTICE` и `docs/licenses.md`: код MIT; данные вики CC-BY-SA 4.0; игровые
данные/арты Hypergryph/Yostar не перелицензируются; fexli — атрибуция без лицензии;
Penguin Statistics — CC BY-NC 4.0; оптимизированные WebP — производные. README, футер
и `docs/assets.md` обновлены, `NOTICE` добавлен в `.prettierignore`. Код/данные не менялись.

### 7.17. Крон обновления данных — закрыто (Задача 30, `959757b`)

`scripts/data/update-sources.ts` (`data:pins`) двигает пины `SanityGoneAK/arknights-gamedata`
для cn/en; `.github/workflows/update-data.yml` — weekly + dispatch, пайплайн, retry wiki,
Gemini-перевод, `data:validate`, guard роста `data/` >25%, PR через `secrets.CRON_PAT`
(чтобы запускался CI). `update-penguin.yml` тоже переведён на `CRON_PAT`.

Живой `workflow_dispatch` **39587906933 — success**: wiki-banners на runner'е отдал 502,
fallback восстановил снапшот, пустой перевод стал no-op, validate/guard прошли, PR создан.
PR #92 оказался timestamp-only (`generatedAt` в banners/meta/i18n-report, размер data/
не изменился) — закрыт без мержа; отдельный follow-up: подавлять timestamp-only PR.
Первые два live-запуска нашли два реальных бага: wiki-fallback (#90) и пустой импорт
перевода (#91), оба исправлены.

### 7.18. Ребрендинг и PWA — закрыто (Задача 31, `6936f83`)

Бренд **RhodesLab**, новый cut-corner R-mark (`public/logo.svg`, `logo-mark.svg`), иконки
192/512/maskable/Apple touch. `@vite-pwa/nuxt`: manifest, auto-update SW, installability
head-tags, footer **Install app** + iOS hint. Chrome CDP `Page.getInstallabilityErrors` —
пусто; SW activated; 360/1280/1920 без overflow/console errors. Домен пока
`arkcalc.vercel.app`; чек-лист смены — `docs/rebrand.md`. Storage keys `arkcalc_*` и
`arkcalcVersion` сохранены для совместимости. Ручной headed-клик install — known-issue.

### 7.19. Supabase auth «failed to fetch» — исправлено (2026-10-21)

У Vercel-проекта `arknights-calculator` не было ни одной env-переменной: клиент падал на
`http://localhost:54321`/dummy key. Добавлены `SUPABASE_URL`, `SUPABASE_KEY`,
`NUXT_PUBLIC_SUPABASE_URL`, `NUXT_PUBLIC_SUPABASE_KEY` для production/preview/development
и сделан новый production deployment (`dpl_HJ7Brq8ratHneCRJmsJfhpiFPBEx`). Прод-HTML
содержит `https://onzlbzvcuypafqrjaiez.supabase.co`; Supabase `/auth/v1/settings` 200.
Если установленный PWA держит старый бандл — update/unregister service worker или clear
site data. Supabase Auth `mailer_autoconfirm=true`; `site_url` и `uri_allow_list` обновлены
на `https://rhodeslab.vercel.app`.

### 7.20. Домен — переехали (Задача 32, `f0f88b9`)

`https://rhodeslab.vercel.app` — primary; `https://arkcalc.vercel.app` отдаёт **308** на него.
Обновлены `site.url`, `i18n.baseUrl`, schema.org URL и E2E allow-list. Supabase Auth Site URL
и allow-list — новый домен. Осталось вручную: Google Search Console change-of-address/sitemap
и финальный PWA-installability check после деплоя (Chrome CDP ранее был чистым).

### 7.21. PWA precache 179 MB — закрыто (Задача 33a.1)

PWA precache 179 MB (весь public/art/) — закрыто в 33a.1; workbox globIgnores + runtimeCaching StaleWhileRevalidate, maxEntries 120.
Офлайн art изменён: раньше весь public/art был в precache (полный офлайн), теперь — только 120 последних открытых артов в runtime-кэше arkcalc-art-v1. Приемлемый трейд-офф из-за iOS Cache Storage ~50 MB; см. 33a.2 про PNG-иконки.

## 8. Очередь задач

| №       | Задача                                  | Зачем                                                                     |
| ------- | --------------------------------------- | ------------------------------------------------------------------------- |
| **28b** | LCP, critical CSS и TBT на Slow 4G      | Follow-up задачи 28; можно отложить, не блокирует фичи                    |
| **—**   | Ручная проверка Install app / Yostar UI | `beforeinstallprompt` и Yostar SAVED SESSION/DISCONNECT в headed-браузере |

## 9. Ловушки, на которые уже наступали

- **Тест, зависящий от `.cache`** — падает только в CI. Любой тест данных обязан работать
  на in-memory фикстурах.
- **Отчёт с красивыми примерами, которых нет в данных** (`LIMITED_0_2_1`, «So Long, Adele») —
  счётчики могут быть верны, а иллюстрации выдуманы. Проверять примеры точечно.
- **`patch-vue.mjs`-класс ошибок:** скрипт печатает «all up to date» и при «паттерны не найдены».
  Если пишешь postinstall-патч — падай с ненулевым кодом.
- **Экранирование `#` в именах ассетов** — `%23`, а не `_`. Иначе получишь ложные 404.
- **Ложное «прошёл все таблицы»** — проверять, что реально лежит в `.cache`,
  а не верить формулировке отчёта.
- **Мерж в одной команде с проверкой CI** — так PR #77 уехал в красный `main`.
  Сначала дождаться зелёного CI, потом мерж.

## 10. Что важно владельцу

- Выполнять работу **самому на машине**, не выдавать владельцу команды для запуска.
- Работать **по одной задаче**: сделал → отчитался (что изменено, чем проверено) → одобрение →
  следующая.
- Хочет **бесплатную автоматизацию, не зависящую от его ПК** — то есть scheduled CI,
  а не локальные задания. Боится раздувания `data/` и репозитория.
- Ключи: Hermes-уровень в `%LOCALAPPDATA%\hermes\.env`, проектные — в `.env` репозитория
  (`GEMINI_API_KEY` для переводов). В секретах GitHub ключей **0**, для крона его надо добавить.
- Модель перевода по умолчанию — `gemini-3.8-flash` (1 расхождение тегов из 60 против 19–20
  у `gemini-3.5-flash-lite`; `gemini-4-argon` даёт 429 на free-tier).

## 11. Карта важных файлов

| Файл                                                           | Зачем                                                           |
| -------------------------------------------------------------- | --------------------------------------------------------------- |
| `AGENTS.md`                                                    | Правила проекта, читать первым                                  |
| `scripts/data/sources.config.ts`                               | 13 таблиц игры + SHA-пин апстрима                               |
| `scripts/data/i18n-layers.ts`                                  | Слои локализации `manual → official → wiki → machine → zh`      |
| `scripts/data/build-banners.ts`                                | `buildBannersFromTables` (чистая) и `buildBannersDataset` (I/O) |
| `scripts/data/build-skins.ts`, `shared/utils/skin.ts`          | Пайплайн скинов, `priceStatus`                                  |
| `scripts/data/fetch-wiki-banners.ts`, `data/wiki-banners.json` | Данные вики по баннерам                                         |
| `scripts/data/translate-missing.ts`                            | Коллектор непереведённых строк                                  |
| `shared/utils/resolveAsset.ts`                                 | `OPTIMIZED_ASSETS_COMMIT`, типы ассетов, экранирование          |
| `shared/utils/gacha/index.ts`                                  | Даты, статусы, `getBannerArtCandidates`                         |
| `scripts/data/validate-data.ts`                                | Секции валидации датасетов                                      |
| `docs/known-issues.md`                                         | Открытые и закрытые проблемы, включая одобренные исключения §14 |
| `docs/progress.md`                                             | История задач и метрик                                          |

## 12. Инструменты агента (2026-10-21)

- MCP в профиле `desktop`: `github`, `vercel`, `supabase`, `playwright`, `context7`.
  Конфиг — `~/.dsh/profiles/desktop/cordis.patch.yml`; там секреты, коммитить нельзя.
- Playwright MCP: только `http://localhost:3001`. Внешний DNS в браузере может не работать —
  для веба использовать Context7/Tavily. Проверено: 11 карточек, 6 операторов в hero,
  360 и 1280 без горизонтального скролла.
- Skills: `frontend-design` (визуальный процесс) и `arknights-frontend` (правила этого репо);
  глобальные правила — `~/.agents/AGENTS.md`.
- Тул-лист MCP большой (~200 инструментов). Если начнёт мешать контексту — сократить
  GitHub toolsets или добавить Chrome DevTools только под задачу производительности.

---

Задачи 22–32 приняты и в `main` (`8b21b84`, `13c868c`, `17037d7`, `053a511`, `3554aef`,
`a547adf`, `0882d37`, `e26a6e5`, `959757b`, `6936f83`, `dfcf1ee`, `f0f88b9`); main CI
зелёный. Остался follow-up **28b** (LCP/TBT) и ручная проверка PWA-install/Yostar UI.
Задачи 26, 31, 32 закрыты; домен — `rhodeslab.vercel.app`, старый 308.
