<script setup lang="ts">
import { ref, computed, shallowRef, watch, onMounted, useTemplateRef } from 'vue'
import { useIntersectionObserver } from '@vueuse/core'
import type { OperatorSummary } from '~/../shared/schemas/operator'
import { resolveI18nString } from '~/../shared/schemas/operator'
import type { OperatorFilterState } from '~/../shared/utils/operatorFilters'
import {
  DEFAULT_OPERATOR_FILTERS,
  parseOperatorFilterQuery,
  serializeOperatorFilterQuery,
  applyOperatorFiltersAndSort,
} from '~/../shared/utils/operatorFilters'
import rawOperatorsData from '~/../data/operators-index.json'
import AkContainer from '~/components/ui/AkContainer.vue'
import AkPageHeader from '~/components/ui/AkPageHeader.vue'
import AkGrid from '~/components/ui/AkGrid.vue'
import AkButton from '~/components/ui/AkButton.vue'
import AkAlert from '~/components/ui/AkAlert.vue'
import AkEmptyState from '~/components/ui/AkEmptyState.vue'
import AkOperatorCard from '~/components/operators/AkOperatorCard.vue'
import AkOperatorCardSkeleton from '~/components/operators/AkOperatorCardSkeleton.vue'
import AkOperatorFilters from '~/components/operators/AkOperatorFilters.vue'
import { getModuleById } from '~/config/modules'

import { useSettingsStore } from '~/stores/settings'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const router = useRouter()
const moduleConfig = getModuleById('operators')
const settingsStore = useSettingsStore()

// Dataset reference
const allOperators = shallowRef<readonly OperatorSummary[]>(
  rawOperatorsData as unknown as readonly OperatorSummary[],
)

// Page lifecycle states: 'ready' | 'loading' | 'error'
type PageState = 'ready' | 'loading' | 'error'
const pageState = ref<PageState>('ready')

// Filter state initialized from URL query (with fallback to default server from settings store)
const initialFilters = parseOperatorFilterQuery(route.query)
if (!route.query.server && settingsStore.defaultServer) {
  initialFilters.server = settingsStore.defaultServer
}
const filters = ref<OperatorFilterState>(initialFilters)

// Extract available unique subclasses and factions for filter dropdowns
const availableSubclasses = computed<string[]>(() => {
  const set = new Set<string>()
  for (const op of allOperators.value) {
    if (filters.value.classes.length === 0 || filters.value.classes.includes(op.class)) {
      if (op.subclass) set.add(op.subclass)
    }
  }
  return Array.from(set).sort()
})

const availableFactions = computed<string[]>(() => {
  const set = new Set<string>()
  for (const op of allOperators.value) {
    if (op.faction) set.add(op.faction)
  }
  return Array.from(set).sort()
})

// Filtered and sorted dataset
const filteredOperators = computed<OperatorSummary[]>(() => {
  return applyOperatorFiltersAndSort(
    allOperators.value,
    filters.value,
    locale.value as 'en' | 'ru' | 'zh',
  )
})

// Pagination / chunking parameters for non-blocking rendering
const CHUNK_SIZE = 36
const renderLimit = ref<number>(CHUNK_SIZE)

// Reset render limit when filters change
watch(
  () => [
    filters.value.search,
    filters.value.classes.join(','),
    filters.value.subclass,
    filters.value.rarities.join(','),
    filters.value.faction,
    filters.value.server,
    filters.value.sort,
  ],
  () => {
    renderLimit.value = CHUNK_SIZE
  },
)

const displayedOperators = computed<OperatorSummary[]>(() => {
  return filteredOperators.value.slice(0, renderLimit.value)
})

const hasMore = computed<boolean>(() => {
  return renderLimit.value < filteredOperators.value.length
})

const remainingCount = computed<number>(() => {
  return Math.max(0, filteredOperators.value.length - renderLimit.value)
})

function loadMore(): void {
  renderLimit.value += CHUNK_SIZE
}

// Sentinel observer for infinite scrolling
const sentinelRef = useTemplateRef<HTMLDivElement>('sentinel')
useIntersectionObserver(
  sentinelRef,
  (entries) => {
    const entry = entries[0]
    if (entry?.isIntersecting && hasMore.value) {
      loadMore()
    }
  },
  { rootMargin: '300px' },
)

// URL Query synchronization
watch(
  filters,
  (newVal) => {
    const query = serializeOperatorFilterQuery(newVal)
    router.replace({ query })
  },
  { deep: true },
)

watch(
  () => route.query,
  (newQuery) => {
    const parsed = parseOperatorFilterQuery(newQuery)
    if (JSON.stringify(parsed) !== JSON.stringify(filters.value)) {
      filters.value = parsed
    }
  },
)

function resetAllFilters(): void {
  filters.value = { ...DEFAULT_OPERATOR_FILTERS }
}

// SEO & Schema.org Metadata
useSeoMeta({
  title: () => `${t('operators.title')} | ${t('common.appName')}`,
  description: () => t('operators.subtitle'),
  ogTitle: () => `${t('operators.title')} | ${t('common.appName')}`,
  ogDescription: () => t('operators.subtitle'),
})

useSchemaOrg([
  defineItemList({
    name: t('operators.title'),
    description: t('operators.subtitle'),
    numberOfItems: filteredOperators.value.length,
    itemListElement: displayedOperators.value.map((op, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: resolveI18nString(op.name, locale.value as 'en' | 'ru' | 'zh') || op.name.en,
      url: `https://arkcalc.vercel.app/operators/${op.id}`,
    })),
  }),
])

onMounted(() => {
  // Catch any potential dataset loading anomaly gracefully
  if (!allOperators.value || allOperators.value.length === 0) {
    pageState.value = 'error'
  }
})
</script>

<template>
  <div class="operators-page">
    <AkContainer size="lg" class="operators-page__container">
      <!-- Standard Rhodes Island Tactical Header -->
      <AkPageHeader
        :code="moduleConfig?.code ?? 'OPS-04'"
        :tag-label="t('modules.tag')"
        :title="t('operators.title')"
        :subtitle="t('operators.subtitle')"
        watermark="OPERATORS"
        :badge="t('modules.status.ready')"
        badge-variant="cyan"
      >
        <template #actions>
          <AkButton variant="ghost" size="sm" :to="localePath('/')">
            {{ t('common.backToDashboard') }}
          </AkButton>
        </template>
      </AkPageHeader>

      <div class="operators-page__content">
        <!-- Error State -->
        <AkAlert v-if="pageState === 'error'" variant="danger" :title="t('operators.error.title')">
          <p>{{ t('operators.error.description') }}</p>
          <template #actions>
            <AkButton variant="secondary" size="sm" @click="pageState = 'ready'">
              {{ t('operators.error.retry') }}
            </AkButton>
          </template>
        </AkAlert>

        <!-- Main Operator Catalog -->
        <template v-else>
          <!-- Tactical Filter Panel -->
          <AkOperatorFilters
            v-model="filters"
            :subclasses="availableSubclasses"
            :factions="availableFactions"
            @reset="resetAllFilters"
          />

          <!-- Live Results Counter for Accessibility -->
          <div class="operators-page__counter-row" role="status" aria-live="polite">
            <span class="operators-page__counter-badge">
              {{
                t('operators.results.counter', {
                  shown: displayedOperators.length,
                  total: filteredOperators.length,
                })
              }}
            </span>
          </div>

          <!-- Loading State (Skeletons) -->
          <AkGrid v-if="pageState === 'loading'" preset="operators" class="operators-page__grid">
            <AkOperatorCardSkeleton v-for="i in 12" :key="i" />
          </AkGrid>

          <!-- Empty State (No operators matched filter) -->
          <div v-else-if="filteredOperators.length === 0" class="operators-page__empty-state">
            <AkEmptyState
              :title="t('operators.empty.title')"
              :description="t('operators.empty.description')"
            >
              <template #action>
                <AkButton variant="secondary" size="md" @click="resetAllFilters">
                  {{ t('operators.empty.reset') }}
                </AkButton>
              </template>
            </AkEmptyState>
          </div>

          <!-- Operator Cards Grid -->
          <template v-else>
            <AkGrid preset="operators" class="operators-page__grid">
              <AkOperatorCard v-for="op in displayedOperators" :key="op.id" :operator="op" />

              <!-- Mockup-spec Dashed Load More Tile in Grid -->
              <div v-if="hasMore" ref="sentinel" class="operators-page__load-more-tile">
                <AkButton
                  variant="outline"
                  size="md"
                  class="operators-page__load-more-btn"
                  @click="loadMore"
                >
                  {{ t('operators.results.loadMore', { remaining: remainingCount }) }}
                </AkButton>
              </div>
            </AkGrid>
          </template>
        </template>
      </div>
    </AkContainer>
  </div>
</template>

<style lang="scss" scoped>
.operators-page {
  padding-top: var(--space-md);
  padding-bottom: var(--space-2xl);
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;

  @include mq(md) {
    padding-top: var(--space-xl);
  }

  &__container {
    display: flex;
    flex-direction: column;
    gap: var(--space-xl);
    min-width: 0;
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
    min-width: 0;
  }

  &__counter-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-width: 0;
  }

  &__counter-badge {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    letter-spacing: var(--letter-spacing-mono);
    color: var(--color-accent-primary);
    text-transform: uppercase;
  }

  &__grid {
    min-width: 0;
  }

  &__empty-state {
    padding: var(--space-xl) 0;
  }

  &__load-more-tile {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 310px;
    padding: var(--space-lg);
    background: transparent;
    border: 1px dashed var(--color-border-bold);
    box-sizing: border-box;
  }

  &__load-more-btn {
    width: 100%;
    max-width: 220px;
    color: var(--color-accent-amber);
    border-color: rgb(255 217 168 / 40%);

    &:hover {
      background: rgb(255 217 168 / 10%);
      border-color: var(--color-accent-amber);
    }
  }
}
</style>
