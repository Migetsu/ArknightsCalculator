<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import AkAlert from '~/components/ui/AkAlert.vue'
import AkButton from '~/components/ui/AkButton.vue'
import AkStat from '~/components/ui/AkStat.vue'
import AkPanel from '~/components/ui/AkPanel.vue'
import AkAvatar from '~/components/ui/AkAvatar.vue'
import AkProgress from '~/components/ui/AkProgress.vue'
import AkEmptyState from '~/components/ui/AkEmptyState.vue'
import SyncAccountModal from '~/components/sync/SyncAccountModal.vue'
import { DEMO_DASHBOARD_DATA } from '~/../shared/data/demo-dashboard'

const { t } = useI18n()
const localePath = useLocalePath()

const isSyncModalOpen = ref(false)
const dashboardData = ref(DEMO_DASHBOARD_DATA)
const isDemoLoaded = ref(false)

// Countdown timer reactive state
const remainingTime = ref({
  days: 24,
  hours: 19,
  minutes: 7,
  seconds: 31,
})

let timerInterval: ReturnType<typeof setInterval> | null = null

function updateCountdown(): void {
  const diff = Math.max(0, dashboardData.value.nextBanner.targetTimestamp - Date.now())
  const totalSeconds = Math.floor(diff / 1000)
  remainingTime.value = {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  }
}

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

onMounted(() => {
  updateCountdown()
  timerInterval = setInterval(updateCountdown, 1000)
})

onBeforeUnmount(() => {
  if (timerInterval) {
    clearInterval(timerInterval)
  }
})
</script>

<template>
  <div class="dashboard-page">
    <div class="dashboard-page__container">
      <!-- Page Header -->
      <section class="dashboard-page__header">
        <div class="dashboard-page__header-main">
          <div class="dashboard-page__badge">
            {{ t('dashboard.commandBadge') }}
          </div>
          <h1 class="dashboard-page__title">
            {{ t('dashboard.title') }}
          </h1>
          <p class="dashboard-page__subtitle">
            {{ t('dashboard.subtitle') }}
          </p>
        </div>

        <div class="dashboard-page__doctor-card">
          <div class="dashboard-page__doctor-avatar" aria-hidden="true">
            <span class="dashboard-page__doctor-dr">DR</span>
          </div>
          <div class="dashboard-page__doctor-info">
            <div class="dashboard-page__doctor-top">
              <span class="dashboard-page__doctor-name">
                {{ t('common.doctor') }}
              </span>
              <span class="dashboard-page__doctor-settings" aria-hidden="true">⚙</span>
            </div>
            <span class="dashboard-page__doctor-status">
              LV.1 // {{ t('common.server') }}: EN
            </span>
          </div>
        </div>
      </section>

      <!-- Account Risk / Standby Alert -->
      <section class="dashboard-page__alert-section">
        <AkAlert
          variant="warning"
          :title="t('dashboard.alert.title')"
          :badge="t('dashboard.alert.badge')"
        >
          <p>{{ t('dashboard.alert.body') }}</p>

          <template #actions>
            <AkButton variant="ghost" size="md" @click="handleLoadDemo">
              {{ t('dashboard.alert.loadDemo') }}
            </AkButton>
            <AkButton variant="primary" size="md" @click="isSyncModalOpen = true">
              {{ t('dashboard.alert.syncAccount') }}
            </AkButton>
          </template>
        </AkAlert>
      </section>

      <!-- 4 Stats Tiles Grid -->
      <section class="dashboard-page__stats-grid">
        <AkStat
          :label="t('dashboard.stats.availablePulls')"
          :value="`${dashboardData.stats.availablePulls} ${t('dashboard.stats.rolls')}`"
          variant="cyan"
        />
        <AkStat
          :label="t('dashboard.stats.activeTargets')"
          :value="`${dashboardData.stats.activeTargets} ${t('dashboard.stats.operators')}`"
          variant="neutral"
        />
        <AkStat
          :label="t('dashboard.stats.sparkReadiness')"
          :value="`${Math.round((dashboardData.stats.sparkCurrent / dashboardData.stats.sparkGoal) * 100)}%`"
          :subvalue="`(${dashboardData.stats.sparkCurrent}/${dashboardData.stats.sparkGoal})`"
          variant="amber"
        />
        <AkStat
          :label="t('dashboard.stats.monthlyCard')"
          :value="t('dashboard.stats.activeRate')"
          variant="green"
        />
      </section>

      <!-- 3 Tactical Panels Grid -->
      <section class="dashboard-page__panels-grid">
        <!-- Panel 1: Next Banner Radar -->
        <AkPanel
          :tag="t('dashboard.banner.tag')"
          :title="t('dashboard.banner.title')"
          :badge="dashboardData.nextBanner.tag"
          badge-variant="amber"
          line-color="amber"
          class="dashboard-page__panel"
        >
          <div class="dashboard-page__banner-box">
            <div class="dashboard-page__banner-card">
              <div class="dashboard-page__banner-meta">
                <h3 class="dashboard-page__banner-name">
                  {{ dashboardData.nextBanner.title }}
                </h3>
                <span class="dashboard-page__banner-dates">
                  {{ dashboardData.nextBanner.startDate }} → {{ dashboardData.nextBanner.endDate }}
                </span>
              </div>
            </div>

            <!-- Countdown Timer -->
            <div class="dashboard-page__countdown">
              <span class="dashboard-page__countdown-label">
                {{ t('dashboard.banner.commencingIn') }}
              </span>
              <div class="dashboard-page__countdown-grid">
                <div class="dashboard-page__countdown-unit">
                  <span class="dashboard-page__countdown-digits">
                    {{ String(remainingTime.days).padStart(2, '0') }}
                  </span>
                  <span class="dashboard-page__countdown-name">
                    {{ t('dashboard.banner.days') }}
                  </span>
                </div>
                <span class="dashboard-page__countdown-sep">:</span>
                <div class="dashboard-page__countdown-unit">
                  <span class="dashboard-page__countdown-digits">
                    {{ String(remainingTime.hours).padStart(2, '0') }}
                  </span>
                  <span class="dashboard-page__countdown-name">
                    {{ t('dashboard.banner.hrs') }}
                  </span>
                </div>
                <span class="dashboard-page__countdown-sep">:</span>
                <div class="dashboard-page__countdown-unit">
                  <span class="dashboard-page__countdown-digits">
                    {{ String(remainingTime.minutes).padStart(2, '0') }}
                  </span>
                  <span class="dashboard-page__countdown-name">
                    {{ t('dashboard.banner.min') }}
                  </span>
                </div>
                <span class="dashboard-page__countdown-sep">:</span>
                <div class="dashboard-page__countdown-unit">
                  <span class="dashboard-page__countdown-digits">
                    {{ String(remainingTime.seconds).padStart(2, '0') }}
                  </span>
                  <span class="dashboard-page__countdown-name">
                    {{ t('dashboard.banner.sec') }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Rate-up Operators -->
            <div class="dashboard-page__rate-up">
              <span class="dashboard-page__rate-up-label">
                {{ t('dashboard.banner.featuredRateUp') }}
              </span>
              <div class="dashboard-page__rate-up-list">
                <div
                  v-for="op in dashboardData.nextBanner.operators"
                  :key="op.id"
                  class="dashboard-page__rate-up-item"
                >
                  <AkAvatar :name="op.name" :rarity="op.rarity" size="sm" />
                  <div class="dashboard-page__rate-up-info">
                    <span class="dashboard-page__rate-up-name" :title="op.name">
                      {{ op.name }}
                    </span>
                    <span
                      class="dashboard-page__rate-up-stars"
                      :class="`dashboard-page__rate-up-stars--${op.rarity}`"
                    >
                      {{ '★'.repeat(op.rarity) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <template #footer>
            <AkButton
              variant="secondary"
              size="md"
              :to="localePath('/gacha')"
              class="dashboard-page__panel-btn"
            >
              {{ t('dashboard.banner.archiveButton') }}
            </AkButton>
          </template>
        </AkPanel>

        <!-- Panel 2: Gacha Treasury -->
        <AkPanel
          :tag="t('dashboard.treasury.tag')"
          :title="t('dashboard.treasury.title')"
          :badge="t('dashboard.treasury.sparkBadge')"
          badge-variant="cyan"
          line-color="cyan"
          class="dashboard-page__panel"
        >
          <div class="dashboard-page__treasury-box">
            <div class="dashboard-page__treasury-main">
              <span class="dashboard-page__treasury-pulls">
                {{ dashboardData.treasury.totalPulls }}
              </span>
              <span class="dashboard-page__treasury-pulls-label">
                {{ t('dashboard.treasury.pullsAvailable') }}
              </span>
            </div>

            <AkProgress
              :value="dashboardData.treasury.totalPulls"
              :max="dashboardData.treasury.sparkGoal"
              :label="t('dashboard.treasury.sparkProgress')"
              :show-percentage="true"
              variant="cyan"
              :segments="3"
            />

            <!-- Currency Breakdown -->
            <div class="dashboard-page__currency-list">
              <div class="dashboard-page__currency-row">
                <span class="dashboard-page__currency-name">
                  {{ t('dashboard.treasury.orundum') }}
                </span>
                <span class="dashboard-page__currency-val">
                  {{ dashboardData.treasury.orundum.toLocaleString() }}
                </span>
                <span class="dashboard-page__currency-equiv">
                  {{
                    t('dashboard.treasury.rollsEquivalent', {
                      count: Math.floor(dashboardData.treasury.orundum / 600),
                    })
                  }}
                </span>
              </div>

              <div class="dashboard-page__currency-row">
                <span class="dashboard-page__currency-name">
                  {{ t('dashboard.treasury.originitePrime') }}
                </span>
                <span class="dashboard-page__currency-val">
                  {{ dashboardData.treasury.originitePrime }} OP
                </span>
                <span class="dashboard-page__currency-equiv">
                  {{
                    t('dashboard.treasury.rollsEquivalent', {
                      count: Math.floor((dashboardData.treasury.originitePrime * 180) / 600),
                    })
                  }}
                </span>
              </div>

              <div class="dashboard-page__currency-row">
                <span class="dashboard-page__currency-name">
                  {{ t('dashboard.treasury.permits') }}
                </span>
                <span class="dashboard-page__currency-val">
                  {{
                    t('dashboard.treasury.singleTenRoll', {
                      single: dashboardData.treasury.permitsSingle,
                      ten: dashboardData.treasury.permitsTen,
                    })
                  }}
                </span>
                <span class="dashboard-page__currency-equiv">
                  {{
                    t('dashboard.treasury.rollsEquivalent', {
                      count:
                        dashboardData.treasury.permitsSingle +
                        dashboardData.treasury.permitsTen * 10,
                    })
                  }}
                </span>
              </div>
            </div>

            <!-- Monthly Card Callout -->
            <div class="dashboard-page__monthly-card">
              <div class="dashboard-page__monthly-header">
                <span class="dashboard-page__monthly-dot" />
                <span class="dashboard-page__monthly-title">
                  {{ t('dashboard.treasury.monthlyCardNote') }}
                </span>
              </div>
              <p class="dashboard-page__monthly-desc">
                {{ t('dashboard.treasury.monthlyCardDesc') }}
              </p>
            </div>
          </div>

          <template #footer>
            <AkButton
              variant="secondary"
              size="md"
              :to="localePath('/gacha')"
              class="dashboard-page__panel-btn"
            >
              {{ t('dashboard.treasury.calculatorButton') }}
            </AkButton>
          </template>
        </AkPanel>

        <!-- Panel 3: Promotion Targets -->
        <AkPanel
          :tag="t('dashboard.targets.tag')"
          :title="t('dashboard.targets.title')"
          :badge="t('dashboard.targets.activeCount', { count: dashboardData.stats.activeTargets })"
          badge-variant="green"
          line-color="green"
          class="dashboard-page__panel"
        >
          <div class="dashboard-page__targets-box">
            <AkEmptyState
              :title="t('dashboard.targets.emptyTitle')"
              :description="t('dashboard.targets.emptyDesc')"
            />

            <!-- Quick Add Operators -->
            <div class="dashboard-page__quick-operators">
              <div
                v-for="op in dashboardData.quickOperators"
                :key="op.id"
                class="dashboard-page__quick-item"
              >
                <AkAvatar :name="op.name" :rarity="op.rarity" size="sm" />
                <span class="dashboard-page__quick-name" :title="op.name">
                  {{ op.name }}
                </span>
                <AkButton variant="ghost" size="sm" class="dashboard-page__plan-btn">
                  {{ t('dashboard.targets.planButton') }}
                </AkButton>
              </div>
            </div>
          </div>

          <template #footer>
            <AkButton
              variant="secondary"
              size="md"
              :to="localePath('/planner')"
              class="dashboard-page__panel-btn"
            >
              {{ t('dashboard.targets.plannerButton') }}
            </AkButton>
          </template>
        </AkPanel>
      </section>
    </div>

    <!-- Sync Modal -->
    <SyncAccountModal v-model="isSyncModalOpen" @load-demo="handleLoadDemo" />
  </div>
</template>

<style lang="scss" scoped>
.dashboard-page {
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  flex: 1;

  @include mq(md) {
    padding: var(--space-xl);
  }

  &__container {
    max-width: 1400px;
    width: 100%;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
  }

  // Header Section
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-md);
    flex-wrap: wrap;
  }

  &__header-main {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
    max-width: 720px;
  }

  &__badge {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-bold);
    letter-spacing: var(--letter-spacing-mono);
    color: var(--color-accent-primary);
    text-transform: uppercase;
  }

  &__title {
    font-family: var(--font-heading);
    font-size: var(--font-size-2xl);
    font-weight: var(--font-weight-bold);
    letter-spacing: var(--letter-spacing-heading);
    color: var(--color-text-primary);
    text-transform: uppercase;
    margin: 0;

    @include mq(md) {
      font-size: var(--font-size-3xl);
    }
  }

  &__subtitle {
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    line-height: var(--line-height-relaxed);
    margin: 0;
  }

  &__doctor-card {
    display: none;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    border: 1px solid var(--color-border-subtle);
    background-color: var(--color-bg-surface);

    @include mq(lg) {
      display: flex;
    }
  }

  &__doctor-avatar {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    border: 1px solid var(--color-accent-primary);
    background-color: var(--color-bg-elevated);
    color: var(--color-accent-primary);
    font-family: var(--font-mono);
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-xs);
  }

  &__doctor-dr {
    line-height: 1;
  }

  &__doctor-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__doctor-top {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }

  &__doctor-name {
    font-family: var(--font-heading);
    font-weight: var(--font-weight-bold);
    font-size: var(--font-size-sm);
    color: var(--color-text-primary);
  }

  &__doctor-settings {
    color: var(--color-text-secondary);
    font-size: var(--font-size-xs);
  }

  &__doctor-status {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    color: var(--color-text-secondary);
  }

  // 4 Stats Grid
  &__stats-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-sm);

    @include mq(sm) {
      grid-template-columns: repeat(2, 1fr);
    }

    @include mq(lg) {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  // 3 Panels Grid
  &__panels-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-lg);

    @include mq(lg) {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  &__panel {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  &__panel-btn {
    width: 100%;
  }

  // Panel 1: Banner Box
  &__banner-box {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  &__banner-card {
    display: flex;
    flex-direction: column;
    padding: var(--space-md);
    background: linear-gradient(135deg, rgb(255 152 0 / 10%) 0%, var(--color-bg-elevated) 100%);
    border: 1px solid var(--color-border-bold);
  }

  &__banner-name {
    font-family: var(--font-heading);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    margin: 0;
  }

  &__banner-dates {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    color: var(--color-accent-warning);
    letter-spacing: var(--letter-spacing-mono);
  }

  // Countdown Grid
  &__countdown {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-sm);
    border: 1px solid var(--color-border-subtle);
    background-color: var(--color-bg-elevated);
  }

  &__countdown-label {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-semibold);
    letter-spacing: var(--letter-spacing-mono);
    color: var(--color-text-secondary);
  }

  &__countdown-grid {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }

  &__countdown-unit {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  &__countdown-digits {
    font-family: var(--font-mono);
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-accent-primary);
    line-height: 1;
  }

  &__countdown-name {
    font-family: var(--font-mono);
    font-size: 0.625rem;
    color: var(--color-text-secondary);
    letter-spacing: var(--letter-spacing-mono);
  }

  &__countdown-sep {
    font-family: var(--font-mono);
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    color: var(--color-border-bold);
  }

  // Rate-up Operators
  &__rate-up {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__rate-up-label {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-semibold);
    letter-spacing: var(--letter-spacing-mono);
    color: var(--color-text-secondary);
  }

  &__rate-up-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
  }

  &__rate-up-item {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-2xs) var(--space-xs);
    border: 1px solid var(--color-border-subtle);
    background-color: var(--color-bg-elevated);
  }

  &__rate-up-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex: 1;
    min-width: 0;
    gap: var(--space-xs);
  }

  &__rate-up-name {
    font-family: var(--font-heading);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);

    @include text-truncate;
  }

  &__rate-up-stars {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    letter-spacing: 1px;
    flex-shrink: 0;

    &--6 {
      color: var(--color-rarity-6-gold);
    }

    &--5 {
      color: var(--color-rarity-5);
    }
  }

  // Panel 2: Treasury
  &__treasury-box {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  &__treasury-main {
    display: flex;
    align-items: baseline;
    gap: var(--space-xs);
  }

  &__treasury-pulls {
    font-family: var(--font-mono);
    font-size: var(--font-size-3xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-accent-primary);
    line-height: 1;
  }

  &__treasury-pulls-label {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    letter-spacing: var(--letter-spacing-mono);
  }

  &__currency-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
  }

  &__currency-row {
    display: grid;
    grid-template-columns: 1.2fr 1.2fr 0.8fr;
    align-items: center;
    padding: var(--space-xs);
    border: 1px solid var(--color-border-subtle);
    background-color: var(--color-bg-elevated);
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
  }

  &__currency-name {
    color: var(--color-text-secondary);
    letter-spacing: var(--letter-spacing-mono);
  }

  &__currency-val {
    color: var(--color-text-primary);
    font-weight: var(--font-weight-bold);
  }

  &__currency-equiv {
    color: var(--color-accent-primary);
    text-align: right;
  }

  &__monthly-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
    padding: var(--space-sm);
    border: 1px solid rgb(0 230 118 / 30%);
    background-color: var(--color-accent-success-subtle);
  }

  &__monthly-header {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }

  &__monthly-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: var(--color-accent-success);
    box-shadow: 0 0 6px var(--color-accent-success);
  }

  &__monthly-title {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-bold);
    letter-spacing: var(--letter-spacing-mono);
    color: var(--color-accent-success);
  }

  &__monthly-desc {
    font-size: var(--font-size-2xs);
    color: var(--color-text-secondary);
    line-height: var(--line-height-base);
    margin: 0;
  }

  // Panel 3: Targets
  &__targets-box {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  &__quick-operators {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-xs);

    @include mq(sm) {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  &__quick-item {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-2xs) var(--space-xs);
    border: 1px solid var(--color-border-subtle);
    background-color: var(--color-bg-elevated);
  }

  &__quick-name {
    font-family: var(--font-heading);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    flex: 1;
    min-width: 0;

    @include text-truncate;
  }

  &__plan-btn {
    font-size: var(--font-size-2xs);
    color: var(--color-accent-success);
    border-color: rgb(0 230 118 / 40%);
    flex-shrink: 0;

    &:hover {
      background-color: var(--color-accent-success-subtle);
      border-color: var(--color-accent-success);
    }
  }
}
</style>
