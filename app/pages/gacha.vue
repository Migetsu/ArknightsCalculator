<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { GachaBanner } from '~/../shared/schemas/banner'
import type { OperatorSummary } from '~/../shared/schemas/operator'
import { resolveI18nString } from '~/../shared/schemas/operator'
import { getEffectiveGlobalWindow, getEstimatedGlobalDate } from '~/../shared/utils/gacha'
import { getModuleById } from '~/config/modules'
import { useDepotStore } from '~/stores/depot'
import { useGachaPageData, fetchBannerDetail } from '~/composables/useGachaPageData'
import AkContainer from '~/components/ui/AkContainer.vue'
import AkPageHeader from '~/components/ui/AkPageHeader.vue'
import AkEmptyState from '~/components/ui/AkEmptyState.vue'
import AkAlert from '~/components/ui/AkAlert.vue'
import AkButton from '~/components/ui/AkButton.vue'
import AkSegmented, { type SegmentOption } from '~/components/ui/AkSegmented.vue'
import GachaBannerCard from '~/components/gacha/GachaBannerCard.vue'
import GachaCalculator, { type ForecastBannerOption } from '~/components/gacha/GachaCalculator.vue'
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

/**
 * A CN banner whose *estimated* Global window has already opened is the pool
 * players currently see on Global, even before the dataset has confirmed Global
 * dates for it. Without this the page kept an older placeholder pool as current
 * and left the live banner in "upcoming" forever.
 */
const estimatedLiveBanner = computed<GachaBanner | null>(() => {
  const now = Date.now()
  for (const banner of upcomingBanners.value) {
    const window = getEffectiveGlobalWindow(banner, globalLagDays.value)
    if (!window?.estimated) continue
    if (window.startMs <= now && now < window.endMs) return banner
  }
  return null
})

/**
 * Confirmed Global banner wins when it actually has content (rate-ups or art);
 * otherwise the estimated-live pool is the banner players see in game.
 */
const heroBanner = computed<GachaBanner | null>(() => {
  const confirmed = currentEnFullBanner.value
  const live = estimatedLiveBanner.value
  if (!live) return confirmed
  const confirmedHasContent = Boolean(
    confirmed &&
    ((confirmed.rateUp6?.length ?? 0) > 0 ||
      (confirmed.rateUp5?.length ?? 0) > 0 ||
      confirmed.hasArt),
  )
  return confirmed && confirmedHasContent ? confirmed : live
})

const heroWindow = computed(() =>
  heroBanner.value ? getEffectiveGlobalWindow(heroBanner.value, globalLagDays.value) : null,
)

const heroEstimate = computed(() => {
  const banner = heroBanner.value
  if (!banner || banner.server === 'en') return null
  return getEstimatedGlobalDate(banner, globalLagDays.value)
})

const operatorsMap = computed(() => {
  const map = new Map<string, OperatorSummary>()
  if (gachaData.value?.operators) {
    for (const [id, op] of Object.entries(gachaData.value.operators)) {
      map.set(id, {
        id: op.id,
        name: op.name,
        rarity: op.rarity,
        displayNumber: '',
        class: 'WARRIOR',
        subclass: '',
        faction: '',
        position: 'MELEE',
        tagList: [],
        servers: ['cn', 'global'],
        hasIcon: true,
        isClassChange: false,
      })
    }
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

// Type Filters — standard, limited and event pools are listed; kernel pools are not.
type FilterChoice = 'all' | 'limited' | 'event' | 'standard'
const selectedFilter = ref<FilterChoice>('all')

const filterOptions = computed<{ value: FilterChoice; label: string }[]>(() => [
  { value: 'all', label: t('gacha.filter.all') },
  { value: 'limited', label: t('gacha.filter.limited') },
  { value: 'event', label: t('gacha.filter.event') },
  { value: 'standard', label: t('gacha.filter.standard') },
])

const isCalculatorVisible = ref(true)

// Upcoming CN banners: released on CN, not yet on Global, with a known rate-up roster.
// The window and the Global lag are derived from the dataset only, never from the clock.
const filteredUpcomingBanners = computed<GachaBanner[]>(() => {
  if (selectedFilter.value === 'all') {
    return [...upcomingBanners.value]
  }
  if (selectedFilter.value === 'limited') {
    return upcomingBanners.value.filter((banner) => banner.ruleType === 'LIMITED')
  }
  if (selectedFilter.value === 'standard') {
    return upcomingBanners.value.filter(
      (banner) => banner.ruleType === 'NORMAL' || banner.ruleType === 'SINGLE',
    )
  }
  return upcomingBanners.value.filter(
    (banner) => banner.ruleType === 'LINKAGE' || banner.ruleType === 'SPECIAL',
  )
})

// The estimated-live pool is rendered as the current banner, never duplicated in
// the upcoming list.
const visibleUpcomingBanners = computed<GachaBanner[]>(() => {
  const hero = heroBanner.value
  if (!hero || hero.server === 'en') return filteredUpcomingBanners.value
  return filteredUpcomingBanners.value.filter((banner) => banner.id !== hero.id)
})

function estimateFor(banner: GachaBanner): string | null {
  return getEstimatedGlobalDate(banner, globalLagDays.value)
}

// Active banner selection for Calculator
const activeBannerId = ref<string | null>(null)

// Initialize active banner with the rendered current banner if available, otherwise first upcoming
watch(
  heroBanner,
  () => {
    if (!activeBannerId.value) {
      activeBannerId.value = heroBanner.value?.id ?? upcomingBanners.value[0]?.id ?? null
    }
  },
  { immediate: true },
)

const bannerDetails = ref<Record<string, GachaBanner>>({})

const activeBanner = computed<GachaBanner | null>(() => {
  let base: GachaBanner | null = null
  if (activeBannerId.value) {
    const found = upcomingBanners.value.find((b) => b.id === activeBannerId.value)
    if (found) base = found
    else if (heroBanner.value?.id === activeBannerId.value) base = heroBanner.value
  }
  if (!base) {
    base =
      visibleUpcomingBanners.value[0] ??
      upcomingBanners.value[0] ??
      heroBanner.value ??
      currentEnFullBanner.value
  }
  if (!base) return null
  const detailed = bannerDetails.value[base.id]
  if (detailed) {
    return { ...base, ...detailed }
  }
  return base
})

function resolveBannerStartDate(banner: GachaBanner): string | null {
  if (banner.globalStartDate) {
    const d = new Date(banner.globalStartDate)
    if (!Number.isNaN(d.getTime())) return d.toISOString()
  }
  if (banner.server === 'en' || banner.isActive) {
    if (banner.openIso) return banner.openIso
    if (banner.openTime) return new Date(banner.openTime * 1000).toISOString()
  }
  const estStart = getEstimatedGlobalDate(banner, globalLagDays.value)
  if (estStart) {
    const d = new Date(estStart)
    if (!Number.isNaN(d.getTime())) return d.toISOString()
  }
  if (banner.openIso) return banner.openIso
  if (banner.openTime) return new Date(banner.openTime * 1000).toISOString()
  if (banner.cnStartDate) {
    const d = new Date(banner.cnStartDate)
    if (!Number.isNaN(d.getTime())) return d.toISOString()
  }
  return null
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
  if (heroBanner.value) {
    candidates.push(heroBanner.value)
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
    const startDate = resolveBannerStartDate(banner)
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
      title: name,
      startDate,
      endDate,
      isUpcoming: !heroBanner.value || banner.id !== heroBanner.value.id,
      type: banner.type,
    })
  }

  return result
})

async function selectBanner(id: string): Promise<void> {
  activeBannerId.value = id
  if (!bannerDetails.value[id]) {
    try {
      const detail = await fetchBannerDetail(id)
      bannerDetails.value[id] = detail
    } catch (_err) {
      // Non-fatal: compact banner remains displayed
    }
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
              :banners="forecastBanners"
              :selected-banner-id="activeBannerId"
              :active-banner-type="activeBanner?.type ?? 'standard'"
              :operators-map="operatorsMap"
              @select-banner="selectBanner"
            />
          </div>

          <!-- Section 1: Current Global Active Banner (same card as the list below) -->
          <section class="gacha-page__current-en">
            <div class="gacha-current-en">
              <div class="gacha-current-en__header">
                <span class="gacha-current-en__tag">{{ t('gacha.currentBanner.tag') }}</span>
                <span class="gacha-current-en__server">{{ t('gacha.currentBanner.server') }}</span>
              </div>

              <GachaBannerCard
                v-if="heroBanner"
                :banner="
                  bannerDetails[heroBanner.id]
                    ? { ...heroBanner, ...bannerDetails[heroBanner.id] }
                    : heroBanner
                "
                :operators-map="operatorsMap"
                :is-selected="activeBanner?.id === heroBanner.id"
                :global-estimate="heroEstimate"
                :global-window="heroWindow"
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
                  ({{ visibleUpcomingBanners.length }})
                </span>
              </div>
              <h2 class="gacha-page__section-title">{{ t('gacha.upcoming.title') }}</h2>
              <p class="gacha-page__section-subtitle">{{ t('gacha.upcoming.subtitle') }}</p>
            </div>

            <!-- Upcoming Banner Cards Column (rendered immediately, no pagination) -->
            <div class="gacha-page__banners-list">
              <GachaBannerCard
                v-for="banner in visibleUpcomingBanners"
                :key="banner.id"
                :banner="
                  bannerDetails[banner.id] ? { ...banner, ...bannerDetails[banner.id] } : banner
                "
                :date-mode="dateMode"
                :operators-map="operatorsMap"
                :is-selected="activeBanner?.id === banner.id"
                :global-estimate="estimateFor(banner)"
                :is-next="banner.id === visibleUpcomingBanners[0]?.id"
                @select="selectBanner"
              />

              <!-- Empty Filter State -->
              <div v-if="visibleUpcomingBanners.length === 0" class="gacha-page__empty-box">
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

@keyframes gacha-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
