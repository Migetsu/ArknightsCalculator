<script setup lang="ts">
import { ref, computed, shallowRef, watch, onMounted } from 'vue'
import rawBannersData from '~/../data/banners.json'
import rawOperatorsIndex from '~/../data/operators-index.json'
import type { BannersDataset, GachaBanner, BannerType } from '~/../shared/schemas/banner'
import type { OperatorSummary } from '~/../shared/schemas/operator'
import { resolveI18nString } from '~/../shared/schemas/operator'
import { formatHumanDate } from '~/../shared/utils/gacha'
import { getModuleById } from '~/config/modules'
import { useDepotStore } from '~/stores/depot'
import AkContainer from '~/components/ui/AkContainer.vue'
import AkPageHeader from '~/components/ui/AkPageHeader.vue'
import AkEmptyState from '~/components/ui/AkEmptyState.vue'
import AkAlert from '~/components/ui/AkAlert.vue'
import AkButton from '~/components/ui/AkButton.vue'
import AkSegmented, { type SegmentOption } from '~/components/ui/AkSegmented.vue'
import AkTranslationBadge from '~/components/ui/AkTranslationBadge.vue'
import GachaBannerCard from '~/components/gacha/GachaBannerCard.vue'
import GachaCalculator from '~/components/gacha/GachaCalculator.vue'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const depotStore = useDepotStore()
const moduleConfig = getModuleById('gacha')

useHead({
  title: computed(() => `${t('gacha.title')} | ArkCalc`),
  meta: [
    {
      name: 'description',
      content: computed(() => t('gacha.metaDescription')),
    },
  ],
})

onMounted(async () => {
  if (depotStore.status === 'idle') {
    await depotStore.init()
  }
})

// Dataset parsing
const bannersDataset = rawBannersData as unknown as BannersDataset
const currentEnBanner = computed(() => bannersDataset.meta?.currentEnBanner ?? null)
const currentEnBannerTitle = computed(() => {
  if (!currentEnBanner.value) return ''
  return (
    resolveI18nString(currentEnBanner.value.name, locale.value as 'en' | 'zh') ||
    currentEnBanner.value.name?.en ||
    currentEnBanner.value.name?.zh ||
    ''
  )
})

// Raw CN banners (453 items, sorted ascending by openTime)
const rawCnBanners = Array.isArray(bannersDataset.cnBanners) ? bannersDataset.cnBanners : []
const cnBanners = shallowRef<readonly GachaBanner[]>(rawCnBanners)

// All combined banners for calculator lookup
const allBanners = computed<readonly GachaBanner[]>(() => {
  if (Array.isArray(bannersDataset.banners)) return bannersDataset.banners
  if (Array.isArray(rawBannersData)) return rawBannersData as unknown as GachaBanner[]
  return cnBanners.value
})

const operatorsMap = computed(() => {
  const map = new Map<string, OperatorSummary>()
  for (const op of rawOperatorsIndex as OperatorSummary[]) {
    map.set(op.id, op)
  }
  return map
})

// Page State & Date Mode
type PageState = 'ready' | 'loading' | 'error'
const pageState = ref<PageState>('ready')

type DateMode = 'cn' | 'global'
const dateMode = ref<DateMode>('global')

const dateModeOptions = computed<SegmentOption<DateMode>[]>(() => [
  { value: 'cn', label: t('gacha.dates.cn') },
  { value: 'global', label: t('gacha.dates.global') },
])

// Type Filters
type FilterChoice = 'all' | BannerType
const selectedFilter = ref<FilterChoice>('all')

const filterOptions = computed<{ value: FilterChoice; label: string }[]>(() => [
  { value: 'all', label: t('gacha.filter.all') },
  { value: 'standard', label: t('gacha.filter.standard') },
  { value: 'limited', label: t('gacha.filter.limited') },
  { value: 'joint_operation', label: t('gacha.filter.jointOperation') },
])

const isCalculatorVisible = ref(true)

// Filtered CN archive banners (chronologically sorted ascending by openTime)
const filteredCnBanners = computed<GachaBanner[]>(() => {
  if (selectedFilter.value === 'all') {
    return [...cnBanners.value]
  }
  return cnBanners.value.filter((b) => b.type === selectedFilter.value)
})

// Incremental / Chunked Rendering (prevents mounting 453 heavy cards simultaneously)
const PAGE_SIZE = 20
const visibleCount = ref(PAGE_SIZE)

watch(selectedFilter, () => {
  visibleCount.value = PAGE_SIZE
})

const displayedCnBanners = computed<GachaBanner[]>(() => {
  return filteredCnBanners.value.slice(0, visibleCount.value)
})

const hasMoreBanners = computed(() => visibleCount.value < filteredCnBanners.value.length)
const remainingBannersCount = computed(() => filteredCnBanners.value.length - visibleCount.value)

function loadMore(): void {
  visibleCount.value = Math.min(visibleCount.value + PAGE_SIZE, filteredCnBanners.value.length)
}

function loadAll(): void {
  visibleCount.value = filteredCnBanners.value.length
}

// Active banner selection for Calculator
const activeBannerId = ref<string | null>(null)

// Initialize active banner with current EN banner if available, otherwise first banner
watch(
  allBanners,
  (list) => {
    if (!activeBannerId.value && list.length > 0) {
      if (currentEnBanner.value) {
        activeBannerId.value = currentEnBanner.value.id
      } else {
        activeBannerId.value = list[0]?.id ?? null
      }
    }
  },
  { immediate: true },
)

const activeBanner = computed<GachaBanner | null>(() => {
  if (activeBannerId.value) {
    const found = allBanners.value.find((b) => b.id === activeBannerId.value)
    if (found) return found
  }
  if (currentEnBanner.value) {
    const enFound = allBanners.value.find((b) => b.id === currentEnBanner.value?.id)
    if (enFound) return enFound
  }
  return displayedCnBanners.value[0] ?? null
})

function selectBanner(id: string): void {
  activeBannerId.value = id
}
</script>

<template>
  <div class="gacha-page">
    <AkContainer size="lg" class="gacha-page__container">
      <AkPageHeader
        :code="moduleConfig?.code ?? 'GCH-02'"
        tag-label="GACHA // RADAR"
        :title="t('gacha.title')"
        :subtitle="moduleConfig ? t(moduleConfig.descriptionKey) : ''"
        watermark="GACHA"
        :badge="t('modules.status.ready')"
        badge-variant="amber"
      >
        <template #actions>
          <AkButton
            variant="ghost"
            size="sm"
            class="gacha-page__calc-toggle"
            @click="isCalculatorVisible = !isCalculatorVisible"
          >
            {{ isCalculatorVisible ? '− HIDE CALCULATOR' : '+ SHOW CALCULATOR' }}
          </AkButton>
          <AkButton variant="ghost" size="sm" :to="localePath('/')">
            {{ t('common.backToDashboard') }}
          </AkButton>
        </template>
      </AkPageHeader>

      <div class="gacha-page__content">
        <!-- Loading State -->
        <div v-if="pageState === 'loading'" class="gacha-page__state-box">
          <span class="gacha-page__spinner" aria-hidden="true" />
          <p class="gacha-page__state-text">{{ t('common.loading') }}</p>
        </div>

        <!-- Error State -->
        <AkAlert
          v-else-if="pageState === 'error'"
          variant="danger"
          :title="t('modules.error.title')"
        >
          <p>{{ t('modules.error.description') }}</p>
          <template #actions>
            <AkButton variant="secondary" size="sm" @click="pageState = 'ready'">
              {{ t('common.retry') }}
            </AkButton>
          </template>
        </AkAlert>

        <!-- Ready State -->
        <div v-else class="gacha-page__body">
          <!-- Treasury and Spark Calculator -->
          <div v-if="isCalculatorVisible" class="gacha-page__calculator-section">
            <GachaCalculator
              :banner="activeBanner"
              :active-banner-type="activeBanner?.type ?? 'standard'"
              :operators-map="operatorsMap"
            />
          </div>

          <!-- Section 1: Current Global Active Banner (Top of page) -->
          <section class="gacha-page__current-en">
            <div
              v-if="currentEnBanner"
              class="gacha-current-en"
              :class="{ 'gacha-current-en--selected': activeBanner?.id === currentEnBanner.id }"
              role="button"
              tabindex="0"
              :aria-pressed="activeBanner?.id === currentEnBanner.id"
              @click="selectBanner(currentEnBanner.id)"
              @keydown.enter.space.prevent="selectBanner(currentEnBanner.id)"
            >
              <div class="gacha-current-en__header">
                <span class="gacha-current-en__tag">{{ t('gacha.currentBanner.tag') }}</span>
                <span class="gacha-current-en__status-badge">{{
                  t('gacha.banner.activeNow')
                }}</span>
              </div>

              <div class="gacha-current-en__body">
                <div class="gacha-current-en__main">
                  <div class="gacha-current-en__meta-bar">
                    <span class="gacha-current-en__rule-tag">{{ currentEnBanner.ruleType }}</span>
                    <span class="gacha-current-en__server-badge">GLOBAL // EN</span>
                  </div>
                  <h2 class="gacha-current-en__title">
                    <span>{{ currentEnBannerTitle }}</span>
                    <AkTranslationBadge
                      v-if="currentEnBanner.name?.source"
                      :source="currentEnBanner.name.source"
                      :stale="currentEnBanner.name.stale"
                    />
                  </h2>
                </div>

                <div class="gacha-current-en__end-wrap">
                  <span class="gacha-current-en__end-label">
                    {{
                      t('gacha.currentBanner.endsOn', {
                        date: formatHumanDate(currentEnBanner.endIso),
                      })
                    }}
                  </span>
                  <span class="gacha-current-en__end-iso">
                    {{ currentEnBanner.endIso.split('T')[0] }}
                  </span>
                </div>
              </div>
            </div>

            <div v-else class="gacha-current-en gacha-current-en--empty">
              <p class="gacha-current-en__empty-text">{{ t('gacha.currentBanner.noActive') }}</p>
            </div>
          </section>

          <!-- Controls Bar: Date Switcher & Type Filters -->
          <div class="gacha-page__controls-bar">
            <!-- Date Mode Switcher -->
            <div class="gacha-page__date-switcher">
              <AkSegmented
                v-model="dateMode"
                :options="dateModeOptions"
                aria-label="Date Display Mode"
              />
            </div>

            <!-- Type Filter Buttons -->
            <div class="gacha-page__filter-group">
              <button
                v-for="opt in filterOptions"
                :key="opt.value"
                type="button"
                class="gacha-page__filter-btn"
                :class="{ 'gacha-page__filter-btn--active': selectedFilter === opt.value }"
                @click="selectedFilter = opt.value"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <!-- Section 2: CN Timeline Archive (Sorted ascending by openTime) -->
          <section class="gacha-page__cn-archive">
            <div class="gacha-page__section-header">
              <div class="gacha-page__section-meta">
                <span class="gacha-page__section-tag">{{ t('gacha.cnArchive.tag') }}</span>
                <span class="gacha-page__section-count">({{ filteredCnBanners.length }})</span>
              </div>
              <h2 class="gacha-page__section-title">{{ t('gacha.cnArchive.title') }}</h2>
              <p class="gacha-page__section-subtitle">{{ t('gacha.cnArchive.subtitle') }}</p>
            </div>

            <!-- Chunked Banner Cards Column -->
            <div class="gacha-page__banners-list">
              <GachaBannerCard
                v-for="banner in displayedCnBanners"
                :key="banner.id"
                :banner="banner"
                :date-mode="dateMode"
                :operators-map="operatorsMap"
                :is-selected="activeBanner?.id === banner.id"
                @select="selectBanner"
              />

              <!-- Empty Filter State -->
              <div v-if="filteredCnBanners.length === 0" class="gacha-page__empty-box">
                <AkEmptyState :title="t('gacha.empty')" />
              </div>
            </div>

            <!-- Pagination / Incremental Loading Controls -->
            <div v-if="filteredCnBanners.length > 0" class="gacha-page__pagination">
              <span class="gacha-page__pagination-summary">
                {{
                  t('gacha.cnArchive.showingCount', {
                    shown: displayedCnBanners.length,
                    total: filteredCnBanners.length,
                  })
                }}
              </span>
              <div v-if="hasMoreBanners" class="gacha-page__pagination-actions">
                <AkButton variant="secondary" size="sm" @click="loadMore">
                  {{
                    t('gacha.cnArchive.showMore', {
                      count: Math.min(PAGE_SIZE, remainingBannersCount),
                    })
                  }}
                </AkButton>
                <AkButton variant="ghost" size="sm" @click="loadAll">
                  {{ t('gacha.cnArchive.showAll', { total: filteredCnBanners.length }) }}
                </AkButton>
              </div>
            </div>
          </section>

          <!-- Disclaimer Note -->
          <p class="gacha-page__disclaimer">
            {{ t('gacha.dates.disclaimer') }}
          </p>
        </div>
      </div>
    </AkContainer>
  </div>
</template>

<style lang="scss" scoped>
.gacha-page {
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

  &__body {
    display: flex;
    flex-direction: column;
    gap: var(--space-xl);
    min-width: 0;
  }

  &__calculator-section {
    min-width: 0;
  }

  /* Current EN Hero Section */
  &__current-en {
    min-width: 0;
  }

  /* Controls Bar */
  &__controls-bar {
    display: flex;
    align-items: center;
    gap: var(--space-md, 20px);
    flex-wrap: wrap;
    background-color: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    padding: var(--space-sm) var(--space-md);
    min-width: 0;

    @media (width <= 480px) {
      padding: var(--space-xs) var(--space-sm);
      gap: var(--space-xs);
    }
  }

  &__date-switcher {
    display: flex;
    align-items: center;
    min-width: 0;
    max-width: 100%;
  }

  &__filter-group {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    min-width: 0;
  }

  &__filter-btn {
    padding: 8px 14px;
    background-color: var(--color-bg-deep);
    border: 1px solid var(--color-border-subtle);
    color: var(--color-text-secondary);
    font-family: var(--font-body);
    font-size: var(--font-size-xs, 12px);
    font-weight: var(--font-weight-medium);
    cursor: pointer;
    transition:
      border-color var(--transition-fast),
      color var(--transition-fast),
      background-color var(--transition-fast);

    &:hover {
      border-color: var(--color-border-bold);
      color: var(--color-text-primary);
    }

    &--active {
      background-color: rgb(255 157 43 / 12%);
      border-color: var(--color-accent-amber);
      color: var(--color-accent-amber);
      font-weight: var(--font-weight-bold);
    }
  }

  /* Section Header */
  &__cn-archive {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
    min-width: 0;
  }

  &__section-header {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
    padding-bottom: var(--space-sm);
    border-bottom: 1px solid var(--color-border-subtle);
    min-width: 0;
  }

  &__section-meta {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    color: var(--color-accent-amber);
    letter-spacing: 0.15em;
    text-transform: uppercase;
  }

  &__section-count {
    color: var(--color-text-muted);
  }

  &__section-title {
    margin: 0;
    font-family: var(--font-heading);
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    letter-spacing: 0.02em;
  }

  &__section-subtitle {
    margin: 0;
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    line-height: 1.5;
  }

  &__banners-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg, 24px);
    min-width: 0;
  }

  &__empty-box {
    padding: var(--space-2xl) 0;
  }

  /* Pagination */
  &__pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--space-md);
    padding: var(--space-md);
    background-color: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    min-width: 0;
  }

  &__pagination-summary {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }

  &__pagination-actions {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    flex-wrap: wrap;
  }

  &__disclaimer {
    margin: 0;
    font-family: var(--font-body);
    font-size: var(--font-size-xs, 12px);
    color: var(--color-text-muted);
    font-style: italic;
    text-align: center;
  }

  &__state-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-3xl) var(--space-xl);
    gap: var(--space-md);
    background-color: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
  }

  &__spinner {
    display: inline-block;
    width: 36px;
    height: 36px;
    border: 3px solid var(--color-border-subtle);
    border-top-color: var(--color-accent-amber);
    border-radius: 50%;
    animation: gacha-spin 0.8s linear infinite;
  }

  &__state-text {
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
}

/* Current Global Banner Component Styles */
.gacha-current-en {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  padding: var(--space-lg);
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
  border-left: 4px solid var(--color-accent-primary, #ff6a3d);
  cursor: pointer;
  min-width: 0;
  transition:
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);

  &:hover {
    border-color: var(--color-border-bold);
  }

  &:focus-visible {
    @include focus-ring;
  }

  &--selected {
    box-shadow:
      0 0 0 1px var(--color-accent-amber),
      0 4px 16px rgb(255 157 43 / 15%);
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-sm);
    flex-wrap: wrap;
  }

  &__tag {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-bold);
    letter-spacing: 0.18em;
    color: var(--color-accent-amber);
    text-transform: uppercase;
  }

  &__status-badge {
    display: inline-block;
    padding: 3px 10px;
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-bold);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-status-success);
    background-color: rgb(34 197 94 / 10%);
    border: 1px solid var(--color-status-success);
  }

  &__body {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-md);
    flex-wrap: wrap;
    min-width: 0;

    @media (width <= 640px) {
      flex-direction: column;
      align-items: flex-start;
    }
  }

  &__main {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  &__meta-bar {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__rule-tag {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-bold);
    letter-spacing: 0.1em;
    color: var(--color-accent-primary, #ff6a3d);
  }

  &__server-badge {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    color: var(--color-text-muted);
    letter-spacing: 0.1em;
  }

  &__title {
    margin: 0;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-xs, 8px);
    font-family: var(--font-heading);
    font-size: var(--font-size-xl, 22px);
    font-weight: var(--font-weight-extrabold);
    color: var(--color-text-primary);
    letter-spacing: 0.02em;
    overflow-wrap: break-word;
    min-width: 0;
  }

  &__end-wrap {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
    font-family: var(--font-mono);

    @media (width <= 640px) {
      align-items: flex-start;
    }
  }

  &__end-label {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    color: var(--color-accent-amber);
  }

  &__end-iso {
    font-size: var(--font-size-2xs);
    color: var(--color-text-muted);
  }

  &--empty {
    padding: var(--space-md);
    border-left: 1px solid var(--color-border-subtle);
    cursor: default;
  }

  &__empty-text {
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }
}

@keyframes gacha-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
