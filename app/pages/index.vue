<script setup lang="ts">
import {
  ref,
  shallowRef,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  defineAsyncComponent,
} from 'vue'
import { DEMO_DASHBOARD_DATA } from '~/../shared/data/demo-dashboard'
import { useSettingsStore } from '~/stores/settings'
import { usePlannerStore } from '~/stores/planner'
import { useProfile } from '~/composables/useProfile'
import {
  resolveI18nString,
  type OperatorSummary,
  type ContentLocale,
} from '~/../shared/schemas/operator'
import {
  getEstimatedGlobalDate,
  formatBannerDateRange,
  calculateTotalPulls,
  getBannerLifecycleStatus,
} from '~/../shared/utils/gacha'
import { useGachaPageData } from '~/composables/useGachaPageData'
import { useDepotStore } from '~/stores/depot'
import AkAvatar from '~/components/ui/AkAvatar.vue'
import AkBadge from '~/components/ui/AkBadge.vue'

const SyncAccountModal = defineAsyncComponent(
  () => import('~/components/sync/SyncAccountModal.vue'),
)

const { t, locale } = useI18n()
const localePath = useLocalePath()
const settingsStore = useSettingsStore()
const plannerStore = usePlannerStore()
const depotStore = useDepotStore()
const {
  isAuthenticated,
  profile,
  userEmail,
  loading: isProfileLoading,
  fetchProfile,
} = useProfile()

const doctorName = computed(() => {
  if (isProfileLoading.value && !profile.value) return '…'
  return profile.value?.displayName || userEmail.value || 'Doctor'
})

watch(
  isAuthenticated,
  (val) => {
    if (val && !profile.value) {
      void fetchProfile()
    }
  },
  { immediate: true },
)

const operatorsMap = shallowRef<Map<string, OperatorSummary>>(new Map())

watch(
  () => plannerStore.plans.length,
  async (len) => {
    if (len > 0 && operatorsMap.value.size === 0) {
      const mod = await import('~/../data/operators-index.json')
      const ops = (mod.default ?? mod) as unknown as readonly OperatorSummary[]
      const map = new Map<string, OperatorSummary>()
      for (const op of ops) {
        map.set(op.id, op)
      }
      operatorsMap.value = map
    }
  },
  { immediate: true },
)

function getOperatorName(operatorId: string): string {
  const op = operatorsMap.value.get(operatorId)
  if (!op) return operatorId
  return resolveI18nString(op.name, locale.value as ContentLocale)
}

function getOperatorRarity(operatorId: string): 1 | 2 | 3 | 4 | 5 | 6 {
  const r = operatorsMap.value.get(operatorId)?.rarity ?? 5
  return (r >= 1 && r <= 6 ? r : 5) as 1 | 2 | 3 | 4 | 5 | 6
}

const isSyncModalOpen = ref(false)
const dashboardData = ref(DEMO_DASHBOARD_DATA)
const isDemoLoaded = ref(false)

const { data: gachaData } = await useGachaPageData()

const nextBannerInfo = computed(() => {
  const b = gachaData.value?.upcomingBanners?.[0]
  if (!b) {
    return {
      title: dashboardData.value.nextBanner.title,
      dateRange: `${dashboardData.value.nextBanner.startDate} to ${dashboardData.value.nextBanner.endDate}`,
      targetTimestamp: dashboardData.value.nextBanner.targetTimestamp,
      isStartsToday: false,
    }
  }

  const title =
    resolveI18nString(b.title ?? b.name, locale.value as ContentLocale) ||
    b.title?.en ||
    b.name?.en ||
    b.id

  const estStart = getEstimatedGlobalDate(b, gachaData.value?.globalLagDays ?? null)
  const startDateStr = b.globalStartDate || estStart || b.openIso || b.cnStartDate || null

  let endDateStr: string | null = null
  if (b.globalEndDate) {
    endDateStr = b.globalEndDate
  } else if (b.server === 'en' || b.isActive) {
    endDateStr = b.endIso || (b.endTime ? new Date(b.endTime * 1000).toISOString() : null)
  } else if (estStart) {
    // When start date is estimated for Global, end date is start date + duration (default 14 days)
    const startMs = new Date(
      estStart.includes('/') ? estStart.replace(/\//g, '-') : estStart,
    ).getTime()
    const durationDays = b.durationDays && b.durationDays > 0 ? b.durationDays : 14
    endDateStr = new Date(startMs + durationDays * 86400000).toISOString().slice(0, 10)
  } else {
    endDateStr = b.cnEndDate || b.endIso || null
  }

  let targetTimestamp = 0
  if (startDateStr) {
    const parsed = new Date(
      startDateStr.includes('/') ? startDateStr.replace(/\//g, '-') : startDateStr,
    ).getTime()
    if (!Number.isNaN(parsed)) {
      targetTimestamp = parsed
    }
  }

  if (targetTimestamp === 0) {
    targetTimestamp = dashboardData.value.nextBanner.targetTimestamp
  }

  let dateRange = `${dashboardData.value.nextBanner.startDate} to ${dashboardData.value.nextBanner.endDate}`
  if (startDateStr && endDateStr) {
    dateRange = formatBannerDateRange(startDateStr, endDateStr)
  }

  const isStartsToday = targetTimestamp > 0 && targetTimestamp <= Date.now()

  return {
    title,
    dateRange,
    targetTimestamp,
    isStartsToday,
  }
})

// Countdown timer reactive state
const remainingTime = ref({
  days: 24,
  hours: 19,
  minutes: 7,
  seconds: 31,
})

let timerInterval: ReturnType<typeof setInterval> | null = null

function updateCountdown(): void {
  const diff = Math.max(0, nextBannerInfo.value.targetTimestamp - Date.now())
  const totalSeconds = Math.floor(diff / 1000)
  remainingTime.value = {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  }
}

watch(nextBannerInfo, () => {
  updateCountdown()
})

const activePlansCount = computed<number>(() => {
  if (plannerStore.plans.length > 0) {
    return plannerStore.plans.length
  }
  return isDemoLoaded.value ? dashboardData.value.stats.activeTargets : 0
})

const totalAvailablePulls = computed<number>(() => {
  const pulls = calculateTotalPulls({
    orundum: depotStore.currencies.orundum || 0,
    originitePrime: depotStore.currencies.originitePrime || 0,
    permitsSingle: depotStore.singlePermits || 0,
    permitsTen: depotStore.tenRollPermits || 0,
  })
  if (pulls > 0) return pulls
  return isDemoLoaded.value ? dashboardData.value.stats.availablePulls : 0
})

const activeBannerPulls = computed<number>(() => {
  // Active pulls (spark) ONLY apply when a LIMITED banner is currently active!
  // When no limited banner is active (e.g. between limited events), spark count is 0.
  const enBanner = gachaData.value?.currentEnFullBanner
  if (enBanner && (enBanner.ruleType === 'LIMITED' || enBanner.type === 'limited')) {
    const status = getBannerLifecycleStatus(enBanner)
    if (status === 'active' && enBanner.lmtgsid) {
      const count = depotStore.getItemCount(enBanner.lmtgsid)
      if (count > 0) return count
    }
  }

  const curBanner = gachaData.value?.currentBanner
  if (curBanner && (curBanner.ruleType === 'LIMITED' || curBanner.type === 'limited')) {
    const status = getBannerLifecycleStatus(curBanner)
    if (status === 'active' && curBanner.lmtgsid) {
      const count = depotStore.getItemCount(curBanner.lmtgsid)
      if (count > 0) return count
    }
  }

  return 0
})

const sparkCurrent = computed<number>(() => {
  if (activeBannerPulls.value > 0) {
    return activeBannerPulls.value
  }
  return isDemoLoaded.value ? dashboardData.value.stats.sparkCurrent : 0
})

const sparkGoal = computed<number>(() => {
  return dashboardData.value.stats.sparkGoal || 300
})

function handleLoadDemo(): void {
  isDemoLoaded.value = true
  dashboardData.value = {
    ...dashboardData.value,
    stats: {
      ...dashboardData.value.stats,
      availablePulls: 142,
      activeTargets: 3,
      sparkCurrent: 142,
    },
    treasury: {
      ...dashboardData.value.treasury,
      totalPulls: 142,
      orundum: 73200,
      originitePrime: 45,
      permitsSingle: 12,
      permitsTen: 1,
    },
  }
}

function onVisibilityChange(): void {
  if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
    updateCountdown()
  }
}

onMounted(() => {
  if (plannerStore.status === 'idle') {
    void plannerStore.init()
  }
  if (depotStore.status === 'idle') {
    void depotStore.init()
  }
  updateCountdown()
  timerInterval = setInterval(updateCountdown, 1000)
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange)
  }
})

onBeforeUnmount(() => {
  if (timerInterval) {
    clearInterval(timerInterval)
  }
  if (typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
})
</script>

<template>
  <div class="dashboard-page">
    <div class="dashboard-page__container">
      <!-- 1. Hero Terminal Banner -->
      <section class="dashboard-page__hero">
        <p class="dashboard-page__hero-tag">
          {{
            isAuthenticated
              ? t('dashboard.hero.terminalConnected')
              : t('dashboard.hero.terminalNoAccount')
          }}
        </p>
        <h1 class="dashboard-page__hero-title dashboard-page__title">
          {{
            isAuthenticated
              ? t('dashboard.hero.welcomeBackName', { name: doctorName })
              : isDemoLoaded
                ? t('dashboard.title')
                : t('dashboard.hero.welcomeBack')
          }}
        </h1>
        <p class="dashboard-page__hero-desc dashboard-page__subtitle">
          {{
            isAuthenticated
              ? t('dashboard.hero.accountConnectedDesc')
              : isDemoLoaded
                ? t('dashboard.subtitle')
                : t('dashboard.hero.syncDesc')
          }}
        </p>
        <div class="dashboard-page__hero-actions">
          <NuxtLink
            v-if="isAuthenticated"
            :to="localePath('/settings')"
            class="dashboard-page__btn-primary"
          >
            {{ t('dashboard.hero.manageAccountBtn') }}
          </NuxtLink>
          <button
            v-else
            type="button"
            class="dashboard-page__btn-primary"
            @click="isSyncModalOpen = true"
          >
            {{ t('settings.account.syncBtn') }}
          </button>
          <button
            v-if="!isAuthenticated"
            type="button"
            class="dashboard-page__btn-outline"
            @click="handleLoadDemo"
          >
            {{ t('dashboard.alert.loadDemo') }}
          </button>
        </div>
      </section>

      <!-- 2. Four Metric Tiles Grid -->
      <section class="dashboard-page__stats-grid">
        <div class="dashboard-page__stat-card">
          <span class="dashboard-page__stat-label">PULLS</span>
          <div class="dashboard-page__stat-val">
            {{ totalAvailablePulls }}
          </div>
        </div>

        <div class="dashboard-page__stat-card">
          <span class="dashboard-page__stat-label">SPARK</span>
          <div class="dashboard-page__stat-val">{{ sparkCurrent }} / {{ sparkGoal }}</div>
        </div>

        <div class="dashboard-page__stat-card">
          <span class="dashboard-page__stat-label">ACTIVE PLANS</span>
          <div class="dashboard-page__stat-val">
            {{ activePlansCount }}
          </div>
        </div>

        <div class="dashboard-page__stat-card">
          <span class="dashboard-page__stat-label">DROP DATA</span>
          <div class="dashboard-page__stat-val dashboard-page__stat-val--server">
            {{ settingsStore.dropDataServer === 'cn' ? 'CN' : 'Global' }}
          </div>
        </div>
      </section>

      <!-- 3. Two Columns: 3fr 2fr Widgets -->
      <section class="dashboard-page__widgets-grid dashboard-page__panels-grid">
        <!-- Next Headhunting Widget (3fr) -->
        <div class="dashboard-page__widget">
          <div class="dashboard-page__widget-head">
            <h2 class="dashboard-page__widget-title">{{ t('dashboard.banner.title') }}</h2>
            <AkBadge v-if="nextBannerInfo.isStartsToday" variant="amber" size="sm">
              {{ t('gacha.banner.startsToday') }}
            </AkBadge>
          </div>
          <p class="dashboard-page__widget-desc">
            {{ nextBannerInfo.title }} / {{ nextBannerInfo.dateRange }}
          </p>

          <div class="dashboard-page__countdown-row">
            <div class="dashboard-page__countdown-box">
              <div class="dashboard-page__countdown-num">
                {{ String(remainingTime.days).padStart(2, '0') }}
              </div>
              <span class="dashboard-page__countdown-unit">{{ t('dashboard.banner.days') }}</span>
            </div>
            <div class="dashboard-page__countdown-box">
              <div class="dashboard-page__countdown-num">
                {{ String(remainingTime.hours).padStart(2, '0') }}
              </div>
              <span class="dashboard-page__countdown-unit">{{ t('dashboard.banner.hrs') }}</span>
            </div>
            <div class="dashboard-page__countdown-box">
              <div class="dashboard-page__countdown-num">
                {{ String(remainingTime.minutes).padStart(2, '0') }}
              </div>
              <span class="dashboard-page__countdown-unit">{{ t('dashboard.banner.min') }}</span>
            </div>
            <div class="dashboard-page__countdown-box">
              <div class="dashboard-page__countdown-num">
                {{ String(remainingTime.seconds).padStart(2, '0') }}
              </div>
              <span class="dashboard-page__countdown-unit">{{ t('dashboard.banner.sec') }}</span>
            </div>
          </div>
        </div>

        <!-- Your Plans Widget (2fr) -->
        <div class="dashboard-page__widget">
          <div class="dashboard-page__widget-head">
            <h2 class="dashboard-page__widget-title">{{ t('dashboard.yourPlans') }}</h2>
            <NuxtLink
              v-if="plannerStore.plans.length > 0"
              :to="localePath('/planner')"
              class="dashboard-page__plans-link"
            >
              {{ t('dashboard.viewAllPlans', { count: plannerStore.plans.length }) }}
            </NuxtLink>
          </div>

          <!-- If plans exist -->
          <div v-if="plannerStore.plans.length > 0" class="dashboard-page__plans-list">
            <NuxtLink
              v-for="plan in plannerStore.plans.slice(0, 3)"
              :key="plan.id"
              :to="localePath('/planner')"
              class="dashboard-page__plan-item"
            >
              <AkAvatar
                :id="plan.operatorId"
                :name="getOperatorName(plan.operatorId)"
                :rarity="getOperatorRarity(plan.operatorId)"
                size="44"
              />
              <div class="dashboard-page__plan-info">
                <span class="dashboard-page__plan-name">
                  {{ getOperatorName(plan.operatorId) }}
                </span>
                <span class="dashboard-page__plan-target">
                  E{{ plan.current.elite }} Lv{{ plan.current.level }} → E{{
                    plan.target.elite
                  }}
                  Lv{{ plan.target.level }}
                </span>
              </div>
            </NuxtLink>
          </div>

          <!-- Empty plans -->
          <div v-else class="dashboard-page__plans-empty">
            <span>{{ t('dashboard.noPlansYet') }}</span>
            <br />
            <NuxtLink :to="localePath('/planner')" class="dashboard-page__plans-link">
              {{ t('dashboard.pickOperatorToStart') }}
            </NuxtLink>
          </div>
        </div>
      </section>
    </div>

    <!-- Account Sync Modal -->
    <SyncAccountModal
      v-if="isSyncModalOpen"
      v-model="isSyncModalOpen"
      @load-demo="handleLoadDemo"
    />
  </div>
</template>

<style lang="scss" scoped>
.dashboard-page {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  box-sizing: border-box;

  @include mq(md) {
    padding: 40px 48px;
  }

  &__container {
    max-width: 1400px;
    width: 100%;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 28px;
    min-width: 0;
  }

  // Hero Section
  &__hero {
    padding: 24px;
    border: 1px solid var(--color-border-subtle);
    background: linear-gradient(120deg, rgb(255 106 61 / 14%), rgb(23 17 15 / 90%) 60%);
    box-sizing: border-box;

    @include mq(md) {
      padding: 36px;
    }
  }

  &__hero-tag {
    margin: 0 0 10px;
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    letter-spacing: var(--letter-spacing-caption);
    color: var(--color-text-accent);
    text-transform: uppercase;
  }

  &__hero-title {
    margin: 0;
    font-family: var(--font-display);
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    line-height: var(--line-height-tight);

    @include mq(md) {
      font-size: 44px;
    }
  }

  &__hero-desc {
    margin: 12px 0 22px;
    max-width: 560px;
    font-family: var(--font-body);
    font-size: var(--font-size-md);
    line-height: var(--line-height-base);
    color: var(--color-text-secondary);
  }

  &__hero-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__btn-primary {
    border: 0;
    padding: 13px 26px;
    background-color: var(--color-accent-primary);
    color: var(--color-text-inverse);
    font-family: var(--font-body);
    font-size: 15px;
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: background-color var(--transition-fast);

    @include focus-ring;

    &:hover {
      background-color: var(--color-accent-primary-hover);
    }
  }

  &__btn-outline {
    padding: 13px 26px;
    background-color: transparent;
    color: var(--color-text-primary);
    border: 1px solid var(--color-border-bold);
    font-family: var(--font-body);
    font-size: 15px;
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    transition:
      border-color var(--transition-fast),
      background-color var(--transition-fast);

    @include focus-ring;

    &:hover {
      border-color: var(--color-text-accent);
      background-color: var(--color-bg-highlight);
    }
  }

  // Four Stats Grid
  &__stats-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
    min-width: 0;

    @include mq(sm) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    @include mq(lg) {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  &__stat-card {
    padding: 18px 20px;
    background-color: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  &__stat-label {
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    letter-spacing: var(--letter-spacing-mono);
    color: var(--color-text-secondary);
    text-transform: uppercase;
  }

  &__stat-val {
    font-family: var(--font-display);
    font-size: var(--font-size-3xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    margin-top: 4px;
    line-height: var(--line-height-tight);

    &--server {
      color: var(--color-text-accent);
    }
  }

  // Two columns: 3fr 2fr Widgets
  &__widgets-grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 20px;
    min-width: 0;

    @include mq(md) {
      grid-template-columns: 3fr 2fr;
    }
  }

  &__widget {
    padding: 24px;
    background-color: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  &__widget-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
  }

  &__widget-title {
    margin: 0;
    font-family: var(--font-display);
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  &__widget-desc {
    margin: 0 0 16px;
    font-family: var(--font-body);
    font-size: 15px;
    color: var(--color-text-secondary);
  }

  &__countdown-row {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__countdown-box {
    flex: 1 1 60px;
    padding: 12px 14px;
    background-color: var(--color-bg-deep);
    text-align: center;
    border: 1px solid var(--color-border-subtle);
    min-width: 60px;
  }

  &__countdown-num {
    font-family: var(--font-display);
    font-size: 28px;
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    line-height: 1;
  }

  &__countdown-unit {
    display: inline-block;
    margin-top: 4px;
    font-family: var(--font-body);
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-secondary);
    letter-spacing: 0.1em;
  }

  &__plans-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__plan-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px;
    background-color: var(--color-bg-deep);
    border: 1px solid var(--color-border-subtle);
    text-decoration: none;
    transition:
      background-color var(--transition-fast),
      border-color var(--transition-fast);

    &:hover {
      background-color: var(--color-bg-card-hover);
      border-color: var(--color-accent-primary);
    }
  }

  &__plan-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  &__plan-name {
    font-family: var(--font-heading);
    font-size: var(--font-size-sm);
    font-weight: 700;
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__plan-target {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }

  &__plans-empty {
    padding: 28px 12px;
    border: 1px dashed var(--color-border-bold);
    text-align: center;
    color: var(--color-text-secondary);
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    line-height: var(--line-height-base);
  }

  &__plans-link {
    color: var(--color-accent-ember-light);
    text-decoration: none;
    font-weight: var(--font-weight-semibold);

    @include focus-ring;

    &:hover {
      text-decoration: underline;
    }
  }
}
</style>
