import type { ContentLocale, OperatorClass, OperatorSummary } from '../schemas/operator'
import { OperatorClassSchema, resolveI18nString } from '../schemas/operator'

export type OperatorSortOption = 'rarity_desc' | 'rarity_asc' | 'name_asc' | 'name_desc'

export interface OperatorFilterState {
  search: string
  classes: OperatorClass[]
  subclass?: string
  rarities: number[]
  faction?: string
  sort: OperatorSortOption
}

export const DEFAULT_OPERATOR_FILTERS: Readonly<OperatorFilterState> = Object.freeze({
  search: '',
  classes: [],
  subclass: undefined,
  rarities: [],
  faction: undefined,
  sort: 'rarity_desc',
})

const VALID_CLASSES = new Set<string>(OperatorClassSchema.options)
const VALID_SORTS = new Set<OperatorSortOption>([
  'rarity_desc',
  'rarity_asc',
  'name_asc',
  'name_desc',
])

/**
 * Parses query params from URL into a typed OperatorFilterState.
 * Note: server query parameter is intentionally ignored per server model spec.
 */
export function parseOperatorFilterQuery(
  query: Record<string, unknown> | null | undefined,
): OperatorFilterState {
  if (!query) {
    return { ...DEFAULT_OPERATOR_FILTERS }
  }

  // Search string
  const rawQ = typeof query.q === 'string' ? query.q.trim() : ''

  // Classes (supports comma-separated list or single value)
  const rawClass = typeof query.class === 'string' ? query.class : ''
  const classes: OperatorClass[] = rawClass
    ? (rawClass
        .split(',')
        .map((c) => c.trim().toUpperCase())
        .filter((c): c is OperatorClass => VALID_CLASSES.has(c)) as OperatorClass[])
    : []

  // Subclass
  const rawSubclass =
    typeof query.subclass === 'string' && query.subclass.trim().length > 0
      ? query.subclass.trim().toLowerCase()
      : undefined

  // Rarities (comma-separated integers 1..6)
  const rawRarity = typeof query.rarity === 'string' ? query.rarity : ''
  const rarities: number[] = rawRarity
    ? rawRarity
        .split(',')
        .map((r) => Number.parseInt(r.trim(), 10))
        .filter((n) => !Number.isNaN(n) && n >= 1 && n <= 6)
    : []

  // Faction
  const rawFaction =
    typeof query.faction === 'string' && query.faction.trim().length > 0
      ? query.faction.trim().toLowerCase()
      : undefined

  // Sort
  const rawSort = typeof query.sort === 'string' ? query.sort.trim() : ''
  const sort: OperatorSortOption =
    rawSort && VALID_SORTS.has(rawSort as OperatorSortOption)
      ? (rawSort as OperatorSortOption)
      : 'rarity_desc'

  return {
    search: rawQ,
    classes,
    subclass: rawSubclass,
    rarities,
    faction: rawFaction,
    sort,
  }
}

/**
 * Serializes OperatorFilterState into clean URL query params.
 * Omit default or empty values so the URL remains concise.
 */
export function serializeOperatorFilterQuery(state: OperatorFilterState): Record<string, string> {
  const query: Record<string, string> = {}

  if (state.search.trim()) {
    query.q = state.search.trim()
  }

  if (state.classes.length > 0) {
    query.class = state.classes.join(',')
  }

  if (state.subclass) {
    query.subclass = state.subclass
  }

  if (state.rarities.length > 0) {
    query.rarity = [...state.rarities].sort((a, b) => b - a).join(',')
  }

  if (state.faction) {
    query.faction = state.faction
  }

  if (state.sort !== 'rarity_desc') {
    query.sort = state.sort
  }

  return query
}

/**
 * Pure filter function matching operators against filter criteria.
 * Note: Displays all operators from the database without server filtering per spec.
 */
export function filterOperators(
  operators: readonly OperatorSummary[],
  filters: OperatorFilterState,
  _locale: ContentLocale = 'en',
): OperatorSummary[] {
  const searchNormalized = filters.search.trim().toLowerCase()
  const hasClasses = filters.classes.length > 0
  const classSet = new Set(filters.classes)
  const hasRarities = filters.rarities.length > 0
  const raritySet = new Set(filters.rarities)
  const requiredSubclass = filters.subclass?.toLowerCase()
  const requiredFaction = filters.faction?.toLowerCase()

  return operators.filter((op) => {
    // 1. Class filter
    if (hasClasses && !classSet.has(op.class)) {
      return false
    }

    // 3. Subclass filter
    if (requiredSubclass && op.subclass.toLowerCase() !== requiredSubclass) {
      return false
    }

    // 4. Rarity filter
    if (hasRarities && !raritySet.has(op.rarity)) {
      return false
    }

    // 5. Faction filter
    if (requiredFaction && (op.faction ?? '').toLowerCase() !== requiredFaction) {
      return false
    }

    // 6. Name / text search
    if (searchNormalized) {
      const searchClean = searchNormalized.replace(/['’`\s-]/g, '')
      const cleanEn = op.name.en.toLowerCase().replace(/['’`\s-]/g, '')
      const cleanRu = op.name.ru ? op.name.ru.toLowerCase().replace(/['’`\s-]/g, '') : ''
      const cleanApp = op.appellation ? op.appellation.toLowerCase().replace(/['’`\s-]/g, '') : ''

      const matchEn =
        op.name.en.toLowerCase().includes(searchNormalized) ||
        (searchClean.length > 0 && cleanEn.includes(searchClean))
      const matchZh = op.name.zh.toLowerCase().includes(searchNormalized)
      const matchRu =
        (op.name.ru?.toLowerCase().includes(searchNormalized) ?? false) ||
        (searchClean.length > 0 && cleanRu.includes(searchClean))
      const matchAppellation =
        (op.appellation?.toLowerCase().includes(searchNormalized) ?? false) ||
        (searchClean.length > 0 && cleanApp.includes(searchClean))
      const matchCode = op.displayNumber?.toLowerCase().includes(searchNormalized) ?? false
      const matchSubclass = op.subclass.toLowerCase().includes(searchNormalized)
      const matchFaction = op.faction?.toLowerCase().includes(searchNormalized) ?? false

      if (
        !matchEn &&
        !matchZh &&
        !matchRu &&
        !matchAppellation &&
        !matchCode &&
        !matchSubclass &&
        !matchFaction
      ) {
        return false
      }
    }

    return true
  })
}

/**
 * Pure sort function for operators.
 */
export function sortOperators(
  operators: readonly OperatorSummary[],
  sort: OperatorSortOption = 'rarity_desc',
  locale: ContentLocale = 'en',
): OperatorSummary[] {
  const result = [...operators]
  const collatorLocale = locale === 'ru' ? 'ru' : locale === 'zh' ? 'zh' : 'en'

  result.sort((a, b) => {
    const nameA = resolveI18nString(a.name, locale) || a.name.en
    const nameB = resolveI18nString(b.name, locale) || b.name.en

    switch (sort) {
      case 'rarity_asc': {
        const rarityDiff = a.rarity - b.rarity
        if (rarityDiff !== 0) return rarityDiff
        const nameDiff = nameA.localeCompare(nameB, collatorLocale)
        return nameDiff !== 0 ? nameDiff : a.id.localeCompare(b.id, 'en')
      }
      case 'name_asc': {
        const nameDiff = nameA.localeCompare(nameB, collatorLocale)
        return nameDiff !== 0 ? nameDiff : a.id.localeCompare(b.id, 'en')
      }
      case 'name_desc': {
        const nameDiff = nameB.localeCompare(nameA, collatorLocale)
        return nameDiff !== 0 ? nameDiff : b.id.localeCompare(a.id, 'en')
      }
      case 'rarity_desc':
      default: {
        const rarityDiff = b.rarity - a.rarity
        if (rarityDiff !== 0) return rarityDiff
        const nameDiff = nameA.localeCompare(nameB, collatorLocale)
        return nameDiff !== 0 ? nameDiff : a.id.localeCompare(b.id, 'en')
      }
    }
  })

  return result
}

/**
 * Combined filtering and sorting pipeline.
 */
export function applyOperatorFiltersAndSort(
  operators: readonly OperatorSummary[],
  state: OperatorFilterState,
  locale: ContentLocale = 'en',
): OperatorSummary[] {
  const filtered = filterOperators(operators, state, locale)
  return sortOperators(filtered, state.sort, locale)
}
