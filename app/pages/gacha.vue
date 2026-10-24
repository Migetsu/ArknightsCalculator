<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { GachaBanner, BannerType } from '~/../shared/schemas/banner'
import type { OperatorSummary } from '~/../shared/schemas/operator'
import { resolveI18nString } from '~/../shared/schemas/operator'
import rawOperatorsIndex from '~/../data/operators-index.json'
import { getEstimatedGlobalDate } from '~/../shared/utils/gacha'
import { forecastPulls, type ForecastMode } from '~/../shared/utils/gacha/forecast'
import { getModuleById } from '~/config/modules'
import { useDepotStore } from '~/stores/depot'
import AkContainer from '~/components/ui/AkContainer.vue'
import AkPageHeader from '~/components/ui/AkPageHeader.vue'
import AkEmptyState from '~/components/ui/AkEmptyState.vue'
import AkAlert from '~/components/ui/AkAlert.vue'
import AkButton from '~/components/ui/AkButton.vue'
import AkSegmented, { type SegmentOption } from '~/components/ui/AkSegmented.vue'
import GachaBannerCard from '~/components/gacha/GachaBannerCard.vue'
import GachaCalculator from '~/components/gacha/GachaCalculator.vue'
import GachaPityTooltip from '~/components/gacha/GachaPityTooltip.vue'

const { t, locale } = useI18n()
const localePath = useLocalePath()
const depotStore = useDepotStore()
const moduleConfig = getModuleById('gacha')

useHead({
  title: computed(() => `${t('gacha.title')} | RhodesLab`),
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

// The full banners dataset stays server-side; the API returns the current
// Global banner and the upcoming CN window this page renders.
const { data: gachaData, status, refresh } = await useGachaPageData()

const currentEnFullBanner = computed<GachaBanner | null>(() => gachaData.value.currentEnFullBanner)
const upcomingBanners = computed<readonly GachaBanner[]>(() => gachaData.value.upcomingBanners)
const globalLagDays = computed<number | null>(() => gachaData.value.globalLagDays)

const operatorsMap = computed(() => {
  const map = new Map<string, OperatorSummary>()
  for (const op of rawOperatorsIndex as OperatorSummary[]) {
    map.set(op.id, op)
  }
  return map
})

// Page State & Date Mode
type PageState = 'ready' | 'loading' | 'error'
const pageState = computed<PageState>(() => {
  if (status.value === 'pending') return 'loading'
  if (status.value === 'error') return 'error'
  return 'ready'
})

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

// Upcoming CN banners: released on CN, not yet on Global, with a known rate-up roster.
// The window and the Global lag are derived from the dataset only, never from the clock.
const filteredUpcomingBanners = computed<GachaBanner[]>(() => {
  if (selectedFilter.value === 'all') {
    return [...upcomingBanners.value]
  }
  return upcomingBanners.value.filter((banner) => banner.type === selectedFilter.value)
})

function estimateFor(banner: GachaBanner): string | null {
  return getEstimatedGlobalDate(banner, globalLagDays.value)
}

// Active banner selection for Calculator
const activeBannerId = ref<string | null>(null)

// Initialize active banner with current EN banner if available, otherwise first banner
watch(
  [currentEnFullBanner, upcomingBanners],
  () => {
    if (!activeBannerId.value) {
      if (currentEnFullBanner.value) {
        activeBannerId.value = currentEnFullBanner.value.id
      } else {
        activeBannerId.value = upcomingBanners.value[0]?.id ?? null
      }
    }
  },
  { immediate: true },
)

const activeBanner = computed<GachaBanner | null>(() => {
  if (activeBannerId.value) {
    const found = upcomingBanners.value.find((b) => b.id === activeBannerId.value)
    if (found) return found
    if (currentEnFullBanner.value?.id === activeBannerId.value) return currentEnFullBanner.value
  }
  return filteredUpcomingBanners.value[0] ?? upcomingBanners.value[0] ?? currentEnFullBanner.value
})

// Banner Forecast state
const forecastMode = ref<ForecastMode>('f2p')
const selectedForecastBannerId = ref<string | null>(null)

interface ForecastBannerOption {
  id: string
  name: string
  endDate: string
  formattedEndDate: string
}

function resolveBannerEndDate(banner: GachaBanner): string | null {
  if (banner.globalEndDate) {
    const d = new Date(banner.globalEndDate)
    if (!Number.isNaN(d.getTime())) return d.toISOString()
  }
  if (banner.server === 'en' || banner.isActive) {
    if (banner.endIso) return banner.endIso
    if (banner.endTime) return new Date(banner.endTime * 1000).toISOString()
  }
  const estStart = getEstimatedGlobalDate(banner, globalLagDays.value)
  if (estStart) {
    const startMs = new Date(estStart).getTime()
    const durationDays = banner.durationDays && banner.durationDays > 0 ? banner.durationDays : 14
    return new Date(startMs + durationDays * 86400000).toISOString()
  }
  if (banner.endIso) return banner.endIso
  if (banner.endTime) return new Date(banner.endTime * 1000).toISOString()
  if (banner.cnEndDate) {
    const d = new Date(banner.cnEndDate)
    if (!Number.isNaN(d.getTime())) return d.toISOString()
  }
  return null
}

const forecastBanners = computed<ForecastBannerOption[]>(() => {
  const candidates: GachaBanner[] = []
  if (currentEnFullBanner.value) {
    candidates.push(currentEnFullBanner.value)
  }
  for (const b of upcomingBanners.value) {
    if (!candidates.some((c) => c.id === b.id)) {
      candidates.push(b)
    }
  }

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

  const result: ForecastBannerOption[] = []
  for (const banner of candidates) {
    const endDate = resolveBannerEndDate(banner)
    if (!endDate) continue
    const endMs = new Date(endDate).getTime()
    if (Number.isNaN(endMs) || endMs < todayStart) continue

    const name =
      resolveI18nString(banner.name ?? banner.title, locale.value as 'en' | 'zh') ||
      banner.name?.en ||
      banner.title?.en ||
      banner.id

    result.push({
      id: banner.id,
      name,
      endDate,
      formattedEndDate: endDate.slice(0, 10),
    })
  }

  return result
})

watch(
  forecastBanners,
  (list) => {
    if (
      !selectedForecastBannerId.value ||
      !list.some((b) => b.id === selectedForecastBannerId.value)
    ) {
      selectedForecastBannerId.value = list[0]?.id ?? null
    }
  },
  { immediate: true },
)

const forecastResult = computed(() => {
  const selected = forecastBanners.value.find((b) => b.id === selectedForecastBannerId.value)
  const bannerEndDate = selected?.endDate ?? null

  const currentOrundum = depotStore.currencies.orundum || 0
  const currentOP = depotStore.currencies.originitePrime || 0
  const currentTicketsSingle = depotStore.items['7003'] || depotStore.items['7001'] || 0
  const currentTicketsTen = depotStore.items['7004'] || depotStore.items['7002'] || 0

  return forecastPulls({
    bannerEndDate,
    currentOrundum,
    currentOP,
    currentTicketsSingle,
    currentTicketsTen,
    mode: forecastMode.value,
  })
})

function selectBanner(id: string): void {
  activeBannerId.value = id
  if (forecastBanners.value.some((b) => b.id === id)) {
    selectedForecastBannerId.value = id
  }
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
          <GachaPityTooltip />
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
            <AkButton variant="secondary" size="sm" @click="refresh()">
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

            <!-- Forecast to banner end card -->
            <section class="gacha-forecast-card">
              <div class="gacha-forecast-card__header">
                <div class="gacha-forecast-card__title-wrap">
                  <h3 class="gacha-forecast-card__title">
                    {{ t('gacha.forecast.title') }}
                  </h3>
                  <span class="gacha-forecast-card__subtitle">
                    {{ t('gacha.forecast.subtitle') }}
                  </span>
                </div>
                <GachaPityTooltip />
              </div>

              <div v-if="forecastBanners.length === 0" class="gacha-forecast-card__empty">
                <p class="gacha-forecast-card__empty-text">
                  {{ t('gacha.forecast.noUpcoming') }}
                </p>
              </div>

              <div v-else class="gacha-forecast-card__body">
                <div class="gacha-forecast-card__controls">
                  <!-- Banner Select -->
                  <div class="gacha-forecast-card__control-group">
                    <label for="gacha-forecast-banner" class="gacha-forecast-card__label">
                      {{ t('gacha.forecast.bannerLabel') }}:
                    </label>
                    <select
                      id="gacha-forecast-banner"
                      v-model="selectedForecastBannerId"
                      class="gacha-forecast-card__select"
                      :aria-label="t('gacha.forecast.bannerLabel')"
                    >
                      <option v-for="b in forecastBanners" :key="b.id" :value="b.id">
                        {{ b.name }} ({{ b.formattedEndDate }})
                      </option>
                    </select>
                  </div>

                  <!-- Income Mode Radios -->
                  <div
                    class="gacha-forecast-card__control-group"
                    role="radiogroup"
                    :aria-label="t('gacha.forecast.modeLabel')"
                  >
                    <span class="gacha-forecast-card__label">
                      {{ t('gacha.forecast.modeLabel') }}:
                    </span>
                    <div class="gacha-forecast-card__radios">
                      <label
                        class="gacha-forecast-card__radio-label"
                        :class="{
                          'gacha-forecast-card__radio-label--active': forecastMode === 'f2p',
                        }"
                      >
                        <input
                          v-model="forecastMode"
                          type="radio"
                          name="forecast-income-mode"
                          value="f2p"
                          class="gacha-forecast-card__radio-input"
                        />
                        <span class="gacha-forecast-card__radio-text">{{
                          t('gacha.forecast.modeF2p')
                        }}</span>
                      </label>
                      <label
                        class="gacha-forecast-card__radio-label"
                        :class="{
                          'gacha-forecast-card__radio-label--active':
                            forecastMode === 'monthly_card',
                        }"
                      >
                        <input
                          v-model="forecastMode"
                          type="radio"
                          name="forecast-income-mode"
                          value="monthly_card"
                          class="gacha-forecast-card__radio-input"
                        />
                        <span class="gacha-forecast-card__radio-text">{{
                          t('gacha.forecast.modeMonthly')
                        }}</span>
                      </label>
                    </div>
                  </div>
                </div>

                <!-- Forecast Numerical Results -->
                <div class="gacha-forecast-card__results">
                  <div class="gacha-forecast-card__stat-primary">
                    <span class="gacha-forecast-card__stat-value">
                      {{
                        t('gacha.forecast.pullsTotal', { count: forecastResult.pullsWithIncome })
                      }}
                    </span>
                  </div>
                  <div class="gacha-forecast-card__breakdown">
                    <span class="gacha-forecast-card__breakdown-item">
                      {{ t('gacha.forecast.pullsNow', { count: forecastResult.pullsNow }) }}
                    </span>
                    <span class="gacha-forecast-card__breakdown-sep">/</span>
                    <span class="gacha-forecast-card__breakdown-item">
                      {{
                        t('gacha.forecast.pullsFromIncome', {
                          count: Math.max(
                            0,
                            forecastResult.pullsWithIncome - forecastResult.pullsNow,
                          ),
                        })
                      }}
                    </span>
                    <span
                      v-if="forecastResult.daysUntil > 0"
                      class="gacha-forecast-card__days-badge"
                    >
                      {{ t('gacha.forecast.daysRemaining', { count: forecastResult.daysUntil }) }}
                    </span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <!-- Section 1: Current Global Active Banner (same card as the list below) -->
          <section class="gacha-page__current-en">
            <div class="gacha-current-en">
              <div class="gacha-current-en__header">
                <span class="gacha-current-en__tag">{{ t('gacha.currentBanner.tag') }}</span>
                <span class="gacha-current-en__server">{{ t('gacha.currentBanner.server') }}</span>
              </div>

              <GachaBannerCard
                v-if="currentEnFullBanner"
                :banner="currentEnFullBanner"
                :operators-map="operatorsMap"
                :is-selected="activeBanner?.id === currentEnFullBanner.id"
                @select="selectBanner"
              />

              <p v-else class="gacha-current-en__empty-text">
                {{ t('gacha.currentBanner.noActive') }}
              </p>
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

          <!-- Section 2: Upcoming CN banners (oldest first, not yet on Global) -->
          <section class="gacha-page__upcoming">
            <div class="gacha-page__section-header">
              <div class="gacha-page__section-meta">
                <span class="gacha-page__section-tag">{{ t('gacha.upcoming.tag') }}</span>
                <span class="gacha-page__section-count">
                  ({{ filteredUpcomingBanners.length }})
                </span>
              </div>
              <h2 class="gacha-page__section-title">{{ t('gacha.upcoming.title') }}</h2>
              <p class="gacha-page__section-subtitle">{{ t('gacha.upcoming.subtitle') }}</p>
            </div>

            <!-- Upcoming Banner Cards Column (rendered immediately, no pagination) -->
            <div class="gacha-page__banners-list">
              <GachaBannerCard
                v-for="banner in filteredUpcomingBanners"
                :key="banner.id"
                :banner="banner"
                :date-mode="dateMode"
                :operators-map="operatorsMap"
                :is-selected="activeBanner?.id === banner.id"
                :global-estimate="estimateFor(banner)"
                :is-next="banner.id === upcomingBanners[0]?.id"
                @select="selectBanner"
              />

              <!-- Empty Filter State -->
              <div v-if="filteredUpcomingBanners.length === 0" class="gacha-page__empty-box">
                <AkEmptyState :title="t('gacha.empty')" />
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
  &__upcoming {
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

  /* Pagination removed: all upcoming cards render immediately */
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

/* Current Global Banner Section: a section header above the shared banner card */
.gacha-current-en {
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
  min-width: 0;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-sm);
    flex-wrap: wrap;
    padding-bottom: var(--space-xs);
    border-bottom: 1px solid var(--color-border-subtle);
  }

  &__tag {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-bold);
    letter-spacing: 0.18em;
    color: var(--color-accent-amber);
    text-transform: uppercase;
  }

  &__server {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    color: var(--color-text-muted);
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  &__empty-text {
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }
}

/* Forecast to Banner End Card */
.gacha-forecast-card {
  margin-top: var(--space-md);
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 0;

  @media (width <= 640px) {
    padding: var(--space-sm);
    gap: var(--space-sm);
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-md);
    flex-wrap: wrap;
    border-bottom: 1px solid var(--color-border-subtle);
    padding-bottom: var(--space-xs);
  }

  &__title-wrap {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  &__title {
    margin: 0;
    font-family: var(--font-heading);
    font-size: var(--font-size-base);
    font-weight: var(--font-weight-bold);
    color: var(--color-accent-amber);
    letter-spacing: 0.06em;
  }

  &__subtitle {
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }

  &__empty {
    padding: var(--space-md) 0;
  }

  &__empty-text {
    margin: 0;
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    color: var(--color-text-muted);
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  &__controls {
    display: flex;
    align-items: flex-end;
    gap: var(--space-lg);
    flex-wrap: wrap;

    @media (width <= 640px) {
      flex-direction: column;
      align-items: stretch;
      gap: var(--space-sm);
    }
  }

  &__control-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }

  &__label {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-secondary);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  &__select {
    padding: 8px 12px;
    background-color: var(--color-bg-deep);
    border: 1px solid var(--color-border-subtle);
    color: var(--color-text-primary);
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    min-width: 260px;
    max-width: 100%;
    cursor: pointer;
    transition: border-color var(--transition-fast);

    &:focus-visible {
      outline: 2px solid var(--color-accent-amber);
      outline-offset: 1px;
    }

    @media (width <= 640px) {
      min-width: 100%;
    }
  }

  &__radios {
    display: flex;
    gap: var(--space-sm);
    flex-wrap: wrap;
  }

  &__radio-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background-color: var(--color-bg-deep);
    border: 1px solid var(--color-border-subtle);
    color: var(--color-text-secondary);
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    cursor: pointer;
    user-select: none;
    transition:
      border-color var(--transition-fast),
      color var(--transition-fast),
      background-color var(--transition-fast);

    &:hover {
      border-color: var(--color-border-bold);
      color: var(--color-text-primary);
    }

    &--active {
      border-color: var(--color-accent-amber);
      color: var(--color-accent-amber);
      background-color: rgb(255 157 43 / 10%);
      font-weight: var(--font-weight-semibold);
    }
  }

  &__radio-input {
    accent-color: var(--color-accent-amber);
    margin: 0;
    cursor: pointer;
  }

  &__radio-text {
    line-height: 1.2;
  }

  &__results {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: var(--space-md);
    flex-wrap: wrap;
    padding: var(--space-sm) var(--space-md);
    background-color: var(--color-bg-deep);
    border: 1px solid var(--color-border-subtle);
    border-left: 3px solid var(--color-accent-amber);

    @media (width <= 640px) {
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
    }
  }

  &__stat-primary {
    min-width: 0;
  }

  &__stat-value {
    font-family: var(--font-mono);
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-accent-amber);
    letter-spacing: 0.04em;
  }

  &__breakdown {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    flex-wrap: wrap;
  }

  &__breakdown-item {
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }

  &__breakdown-sep {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-tertiary);
  }

  &__days-badge {
    padding: 2px 6px;
    background-color: rgb(255 157 43 / 12%);
    border: 1px solid var(--color-accent-amber);
    color: var(--color-accent-amber);
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-medium);
    letter-spacing: 0.04em;
  }
}

@keyframes gacha-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
