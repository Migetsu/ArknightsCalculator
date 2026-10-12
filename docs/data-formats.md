# Спецификация форматов данных (Data Formats)

Документ описывает структуры сгенерированных JSON-файлов в каталоге `data/`, используемых расчётным ядром, планировщиком, калькулятором прокачки и складом.

---

## 1. Константы игры (`data/constants.json`)

Файл формируется скриптом `scripts/data/build-constants.ts` (`npm run data:constants`) на основе таблиц `gamedata_const.json` и `item_table.json`.

Схема Zod: [`shared/schemas/gameConstants.ts`](file:///c:/Projects/ArknightsCalculator/shared/schemas/gameConstants.ts) (`GameConstantsSchema`).

```typescript
interface GameConstants {
  /** Максимальный уровень оператора по редкости (1–6★) и ступени элиты (E0, E1, E2) */
  maxLevel: Record<string, number[]>

  /** Опыт до следующего уровня по ступеням элиты ('0', '1', '2') */
  characterExpMap: Record<string, number[]>

  /** Стоимость повышения уровня в LMD по ступеням элиты ('0', '1', '2') */
  characterUpgradeCostMap: Record<string, number[]>

  /** Затраты LMD на повышение элиты по редкостям ('1'–'6') -> [E1 LMD, E2 LMD] */
  evolveGoldCost: Record<string, number[]>

  /** Затраты на мастерство из констант (null, берутся из навыков) */
  masteryCost?: Record<string, unknown> | null

  /** Идентификатор валюты LMD ('4001') */
  lmdItemId: string

  /** Карты опыта с базовым значением получаемого EXP */
  expItems: Array<{
    id: string
    gainExp: number
  }>

  /** Словарь терминов и статусов с локализацией (en, zh) */
  terms: Record<
    string,
    {
      id: string
      name: I18nString
      description: I18nString
    }
  >
}
```

---

## 2. Предметы и материалы (`data/items.json`)

Файл формируется скриптом `scripts/data/build-items.ts` (`npm run data:items`) на основе таблицы `item_table.json` с классификацией по полям таблицы (`classifyType`, `itemType`, `iconId`).

Схема Zod: [`shared/schemas/item.ts`](file:///c:/Projects/ArknightsCalculator/shared/schemas/item.ts) (`GameItemSchema`).

```typescript
type ItemType =
  | 'material' // Материалы прокачки, книги навыков, блоки модулей
  | 'chip' // Базовые чипы классов и дуал-чипы
  | 'chip_pack' // Пакеты чипов классов
  | 'catalyst' // Катализатор чипов (Chip Catalyst)
  | 'exp_card' // Карты опыта (Battle Records)
  | 'currency' // Валюта (LMD, Orundum, Originite Prime, сертификаты)
  | 'other' // Прочие предметы

interface GameItem {
  id: string
  name: I18nString
  rarity: number // 1..6
  type: ItemType
  sortId: number
  iconId: string
  flags: {
    canDrop: boolean // Падает на обычных этапах
    canCraft: boolean // Производится в Мастерской или на Фабрике
    isModuleToken?: boolean // Токен улучшения модуля (mod_*)
  }
}
```

---

## 3. Рецепты крафта (`data/recipes.json`)

Файл формируется скриптом `scripts/data/build-recipes.ts` (`npm run data:recipes`) на основе `workshopFormulas` (Мастерская) и `manufactFormulas` (Фабрика, дуал-чипы) из таблицы `building_data.json`.

Схема Zod: [`shared/schemas/recipe.ts`](file:///c:/Projects/ArknightsCalculator/shared/schemas/recipe.ts) (`CraftRecipeSchema`).

```typescript
type RecipeFormulaType = 'F_EVOLVE' | 'F_SKILL' | 'F_BUILDING' | 'F_ASC'

interface CraftRecipe {
  id: string // Префикс wf_ для мастерской, mf_ для фабрики
  resultId: string // ID получаемого предмета
  resultCount: number // Количество результата
  ingredients: Array<{
    // Список затрачиваемых ингредиентов
    id: string
    count: number
  }>
  goldCost: number // Затраты LMD на операцию крафта
  formulaType: RecipeFormulaType
  roomType: 'WORKSHOP' | 'MANUFACTURE'
  extraOutcomeRate?: number // Базовый шанс побочного продукта (0.1 = 10%)
  extraOutcomes?: Array<{
    // Список возможных побочных продуктов
    id: string
    count: number
    weight: number
    probability: number // Точная вероятность получения
  }>
}
```

### Граф зависимостей и циклы:

- **Дерево синтеза (Synthesis DAG):** формулы материалов (`F_EVOLVE`), книг навыков (`F_SKILL`), стройматериалов (`F_BUILDING`) и дуал-чипов (`F_ASC` на Фабрике) формируют строго ориентированный ациклический граф (DAG) с **0 циклов**.
- **Конверсия чипов в Мастерской:** формулы `F_ASC` в Мастерской реализуют игровую механику взаимного обмена чипов между парными классами (3 чипа класса A -> 2 чипа класса B) и содержат ровно **8 двунаправленных парных циклов** (`A <-> B`).

---

## 4. Модули операторов (`data/operators/{id}.json`)

Схема модуля оператора [`shared/schemas/operator.ts`](file:///c:/Projects/ArknightsCalculator/shared/schemas/operator.ts) дополнена боевыми данными каждой ступени из `battle_equip_table.json`:

```typescript
interface OperatorModuleStage {
  stage: number // 1, 2, 3
  stats: Record<string, number> // Прирост характеристик (max_hp, atk, def, etc.)
  parts?: Array<{
    target: string // 'TRAIT' | 'TALENT' | 'TALENT_DATA_ONLY'
    candidates?: Array<{
      additionalDescription?: I18nString
      upgradeDescription?: I18nString
      overrideDescription?: I18nString
      blackboard?: Record<string, number>
      requiredPotentialRank?: number
    }>
  }>
  cost?: Array<{
    // Материалы разблокировки ступени
    id: string
    count: number
  }>
}

interface OperatorModule {
  id: string
  name: I18nString
  type: string // 'INITIAL' | 'ADVANCED'
  typeName2: string // e.g. 'CHG-X'
  icon: string
  description?: I18nString
  itemCost?: Record<string, Array<{ id: string; count: number }>>
  stages?: OperatorModuleStage[] // Боевые характеристики и улучшения по ступеням
}
```

---

## 5. Валидация целостности связей

Скрипт `scripts/data/validate-data.ts` (`npm run data:validate`) выполняет кросс-проверку всех ссылок:

- Все предметы в затратах элиты, навыков, мастерства и модулей операторов обязаны существовать в `data/items.json`.
- Все ингредиенты и результаты рецептов крафта обязаны существовать в `data/items.json`.
- Все предметы валют и карт опыта в константах обязаны существовать в `data/items.json`.
- Скрипт выполняется в CI перед unit-тестами.
