<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { BannerType, GachaBanner } from '~/../shared/schemas/banner'
import type { OperatorSummary } from '~/../shared/schemas/operator'
import { resolveI18nString } from '~/../shared/schemas/operator'
import {
  calculateTotalPulls,
  calculateSparkProgress,
  calculateRateUpProbability,
  getProbabilityMilestones,
  getTargetRateUpShare,
} from '~/../shared/utils/gacha'
import { forecastPulls, type ForecastMode } from '~/../shared/utils/gacha/forecast'
import { useDepotStore } from '~/stores/depot'
import AkProgress from '~/components/ui/AkProgress.vue'
import AkButton from '~/components/ui/AkButton.vue'
import AkItemIcon from '~/components/ui/AkItemIcon.vue'
import AkStepper from '~/components/ui/AkStepper.vue'
import GachaPityTooltip from '~/components/gacha/GachaPityTooltip.vue'

export interface ForecastBannerOption {
  id: string
  title: string
  endDate: string | null
  isUpcoming?: boolean
  type?: BannerType
}

interface Props {
  activeBannerType?: BannerType
  banner?: GachaBanner | null
  banners?: readonly ForecastBannerOption[]
  selectedBannerId?: string | null
  operatorsMap?: Map<string, OperatorSummary>
}

const props = withDefaults(defineProps<Props>(), {
  activeBannerType: 'standard',
  banner: null,
  banners: () => [],
  selectedBannerId: null,
  operatorsMap: undefined,
})

const emit = defineEmits<{
  (e: 'select-banner', bannerId: string): void
}>()

const { t, locale } = useI18n()
const depotStore = useDepotStore()

// Fallback lookup when operatorsMap is not provided (e.g. in standalone unit tests)
const FALLBACK_NAMES: Record<string, string> = {
  char_4228_closur: 'Closure',
  char_003_kalts: "Kal'tsit",
  char_4225_tanya: 'Tanya',
}

function getOperatorName(id: string): string {
  const op = props.operatorsMap?.get(id)
  if (op) {
    return resolveI18nString(op.name, locale.value as 'en' | 'zh') || op.name.en || id
  }
  return FALLBACK_NAMES[id] || id
}

// Available rate-up 6★ targets for selected banner
const availableTargets = computed<{ id: string; name: string }[]>(() => {
  if (!props.banner?.rateUp6) return []
  return props.banner.rateUp6.map((id) => ({
    id,
    name: getOperatorName(id),
  }))
})

// Selected target operator ID
const selectedTargetId = ref<string | null>(props.banner?.rateUp6?.[0] ?? null)

watch(
  () => props.banner,
  (newBanner) => {
    if (newBanner?.rateUp6 && newBanner.rateUp6.length > 0) {
      if (!selectedTargetId.value || !newBanner.rateUp6.includes(selectedTargetId.value)) {
        selectedTargetId.value = newBanner.rateUp6[0] ?? null
      }
    } else {
      selectedTargetId.value = null
    }
  },
  { immediate: true },
)

const selectedTargetName = computed<string>(() => {
  if (!selectedTargetId.value) return ''
  return getOperatorName(selectedTargetId.value)
})

const targetRateUpShare = computed<number | null>(() => {
  if (!props.banner) return null
  return getTargetRateUpShare(props.banner)
})

const effectiveBannerType = computed<BannerType>(() => {
  return props.banner?.type ?? props.activeBannerType
})

// Treasury state
const orundum = ref<number>(0)
const originitePrime = ref<number>(0)
const permitsSingle = ref<number>(0)
const permitsTen = ref<number>(0)

// Fill from depot store
function fillFromDepot(): void {
  orundum.value = depotStore.currencies.orundum || 0
  originitePrime.value = depotStore.currencies.originitePrime || 0
  permitsSingle.value = depotStore.getItemCount('7003') || 0
  permitsTen.value = depotStore.getItemCount('7004') || 0
}

const totalPermitsPulls = computed<number>(() => {
  return permitsSingle.value + permitsTen.value * 10
})

watch(
  [
    () => depotStore.currencies.orundum,
    () => depotStore.currencies.originitePrime,
    () => depotStore.singlePermits,
    () => depotStore.tenRollPermits,
  ],
  ([newOrundum, newOP, newSingle, newTen]) => {
    if (newOrundum || newOP || newSingle || newTen) {
      fillFromDepot()
    }
  },
  { immediate: true },
)

onMounted(async () => {
  if (depotStore.status === 'idle') {
    await depotStore.init()
  }
  if (
    orundum.value === 0 &&
    originitePrime.value === 0 &&
    permitsSingle.value === 0 &&
    permitsTen.value === 0 &&
    (depotStore.currencies.orundum > 0 ||
      depotStore.currencies.originitePrime > 0 ||
      depotStore.singlePermits > 0 ||
      depotStore.tenRollPermits > 0)
  ) {
    fillFromDepot()
  }
})

// Target forecast banner & income mode
const selectedTargetBannerId = ref<string | null>(null)
const forecastMode = ref<ForecastMode>('f2p')

watch(
  [() => props.selectedBannerId, () => props.banners, () => props.banner],
  ([propId, bannerList, currentBanner]) => {
    if (propId && bannerList && bannerList.some((b) => b.id === propId)) {
      selectedTargetBannerId.value = propId
      return
    }
    if (propId) {
      selectedTargetBannerId.value = propId
      return
    }
    if (!selectedTargetBannerId.value && bannerList && bannerList.length > 0) {
      const upcoming = bannerList.find((b) => b.isUpcoming)
      selectedTargetBannerId.value = upcoming?.id ?? bannerList[0]?.id ?? null
      return
    }
    if (!selectedTargetBannerId.value && currentBanner) {
      selectedTargetBannerId.value = currentBanner.id
    }
  },
  { immediate: true },
)

function onTargetBannerChange(e: Event): void {
  const target = e.target as HTMLSelectElement
  selectedTargetBannerId.value = target.value
  emit('select-banner', target.value)
}

const targetForecastBanner = computed(() => {
  if (selectedTargetBannerId.value && props.banners && props.banners.length > 0) {
    const found = props.banners.find((b) => b.id === selectedTargetBannerId.value)
    if (found) return found
  }
  return props.banner
})

const forecastResult = computed(() => {
  let endDate: string | null = null
  const b = targetForecastBanner.value
  if (b) {
    if ('endDate' in b && typeof b.endDate === 'string') {
      endDate = b.endDate
    } else if ('globalEndDate' in b && typeof b.globalEndDate === 'string') {
      endDate = b.globalEndDate
    } else if ('endIso' in b && typeof b.endIso === 'string') {
      endDate = b.endIso
    } else if ('cnEndDate' in b && typeof b.cnEndDate === 'string') {
      endDate = b.cnEndDate
    }
  }
  return forecastPulls({
    bannerEndDate: endDate,
    currentOrundum: orundum.value,
    currentOP: originitePrime.value,
    currentTicketsSingle: permitsSingle.value,
    currentTicketsTen: permitsTen.value,
    mode: forecastMode.value,
  })
})

const totalAvailablePulls = computed<number>(() => {
  return calculateTotalPulls({
    orundum: orundum.value,
    originitePrime: originitePrime.value,
    permitsSingle: permitsSingle.value,
    permitsTen: permitsTen.value,
  })
})

const sparkProgress = computed(() => {
  return calculateSparkProgress(totalAvailablePulls.value, 300)
})

// Target simulation pulls (can be manually adjusted)
const simPulls = ref<number>(50)

const currentProb = computed<number>(() => {
  if (!props.banner || targetRateUpShare.value === null) return 0
  const prob = calculateRateUpProbability(
    totalAvailablePulls.value,
    effectiveBannerType.value,
    targetRateUpShare.value,
  )
  return Math.round(prob * 1000) / 10
})

const simProb = computed<number>(() => {
  if (!props.banner || targetRateUpShare.value === null) return 0
  const prob = calculateRateUpProbability(
    simPulls.value,
    effectiveBannerType.value,
    targetRateUpShare.value,
  )
  return Math.round(prob * 1000) / 10
})

const milestones = computed(() => {
  const share = props.banner ? targetRateUpShare.value : undefined
  return getProbabilityMilestones(effectiveBannerType.value, share)
})

const probabilityLabel = computed<string>(() => {
  if (props.banner && selectedTargetName.value) {
    return t('gacha.calculator.probabilityTarget', { name: selectedTargetName.value })
  }
  return t('gacha.calculator.probabilityTitle')
})
</script>

<template>
  <div class="gacha-calc">
    <div class="gacha-calc__header">
      <div class="gacha-calc__title-wrap">
        <h2 class="gacha-calc__title">
          {{ t('gacha.calculator.title') }}
        </h2>
        <span class="gacha-calc__subtitle">
          {{ t('gacha.calculator.subtitle') }}
        </span>
      </div>

      <AkButton variant="ghost" size="sm" class="gacha-calc__depot-btn" @click="fillFromDepot">
        {{ t('gacha.calculator.fillFromDepot') }}
      </AkButton>
    </div>

    <!-- Target 6★ Operator Selection -->
    <div v-if="props.banner && availableTargets.length > 0" class="gacha-calc__target-section">
      <div class="gacha-calc__target-control">
        <label class="gacha-calc__target-label" for="gacha-target-select">
          {{ t('gacha.calculator.targetLabel') }}:
        </label>
        <select
          id="gacha-target-select"
          v-model="selectedTargetId"
          class="gacha-calc__target-select"
          :aria-label="t('gacha.calculator.targetLabel')"
        >
          <option v-for="target in availableTargets" :key="target.id" :value="target.id">
            {{ target.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- Treasury Inputs Grid -->
    <div class="gacha-calc__treasury-grid">
      <!-- Orundum -->
      <div class="gacha-calc__treasury-cell">
        <div class="gacha-calc__item-info">
          <AkItemIcon item-id="4003" icon-id="DIAMOND_SHD" name="Orundum" :tier="5" :size="40" />
          <div class="gacha-calc__item-meta">
            <span class="gacha-calc__item-label">{{ t('gacha.calculator.orundum') }}</span>
            <span class="gacha-calc__item-sub">600 = 1 roll</span>
          </div>
        </div>
        <AkStepper
          :model-value="orundum"
          :min="0"
          :max="9999999"
          :step="600"
          class="gacha-calc__stepper"
          aria-label="Orundum"
          @update:model-value="orundum = $event"
        />
      </div>

      <!-- Originite Prime -->
      <div class="gacha-calc__treasury-cell">
        <div class="gacha-calc__item-info">
          <AkItemIcon
            item-id="4002"
            icon-id="DIAMOND"
            name="Originite Prime"
            :tier="5"
            :size="40"
          />
          <div class="gacha-calc__item-meta">
            <span class="gacha-calc__item-label">{{ t('gacha.calculator.originitePrime') }}</span>
            <span class="gacha-calc__item-sub">1 OP = 180</span>
          </div>
        </div>
        <AkStepper
          :model-value="originitePrime"
          :min="0"
          :max="99999"
          :step="1"
          class="gacha-calc__stepper"
          aria-label="Originite Prime"
          @update:model-value="originitePrime = $event"
        />
      </div>

      <!-- Single Permits -->
      <div class="gacha-calc__treasury-cell">
        <div class="gacha-calc__item-info">
          <AkItemIcon
            item-id="7003"
            icon-id="TKT_GACHA"
            name="Single Permit"
            :tier="4"
            :size="40"
          />
          <div class="gacha-calc__item-meta">
            <span class="gacha-calc__item-label">{{ t('gacha.calculator.singlePermits') }}</span>
            <span class="gacha-calc__item-sub">1 = 1 roll</span>
          </div>
        </div>
        <AkStepper
          :model-value="permitsSingle"
          :min="0"
          :max="9999"
          :step="1"
          class="gacha-calc__stepper"
          aria-label="Single Permits"
          @update:model-value="permitsSingle = $event"
        />
      </div>

      <!-- Ten-roll Permits -->
      <div class="gacha-calc__treasury-cell">
        <div class="gacha-calc__item-info">
          <AkItemIcon
            item-id="7004"
            icon-id="TKT_GACHA_10"
            name="Ten-roll Permit"
            :tier="5"
            :size="40"
          />
          <div class="gacha-calc__item-meta">
            <span class="gacha-calc__item-label">{{ t('gacha.calculator.tenPermits') }}</span>
            <span class="gacha-calc__item-sub">1 = 10 rolls</span>
          </div>
        </div>
        <AkStepper
          :model-value="permitsTen"
          :min="0"
          :max="999"
          :step="1"
          class="gacha-calc__stepper"
          aria-label="Ten-roll Permits"
          @update:model-value="permitsTen = $event"
        />
      </div>
    </div>

    <!-- Results & Spark Tracker -->
    <div class="gacha-calc__results-card">
      <div class="gacha-calc__rolls-summary">
        <div class="gacha-calc__stat-block">
          <span class="gacha-calc__stat-label">{{ t('gacha.calculator.totalPulls') }}</span>
          <span class="gacha-calc__stat-value gacha-calc__stat-value--rolls">
            {{ totalAvailablePulls }}
          </span>
        </div>

        <div class="gacha-calc__stat-block">
          <span class="gacha-calc__stat-label gacha-calc__stat-label--prob">
            {{ probabilityLabel }}
          </span>
          <span v-if="!banner" class="gacha-calc__stat-value gacha-calc__stat-value--none">
            —
          </span>
          <span
            v-else-if="targetRateUpShare === null"
            class="gacha-calc__stat-value gacha-calc__stat-value--unavailable"
          >
            {{ t('gacha.calculator.unavailable') }}
          </span>
          <span v-else class="gacha-calc__stat-value gacha-calc__stat-value--prob">
            {{ currentProb }}%
          </span>
        </div>
      </div>

      <!-- Free Permits Notice -->
      <div v-if="totalPermitsPulls > 0" class="gacha-calc__permits-notice">
        <span class="gacha-calc__permits-tag">PERMITS</span>
        <span class="gacha-calc__permits-text">
          {{
            t('gacha.calculator.permitsNotice', {
              count: totalPermitsPulls,
              single: permitsSingle,
              ten: permitsTen,
            })
          }}
        </span>
      </div>

      <p v-if="!banner" class="gacha-calc__banner-hint">
        {{ t('gacha.calculator.selectTargetHint') }}
      </p>

      <!-- Spark Progress Bar -->
      <div class="gacha-calc__spark-bar">
        <AkProgress
          :value="sparkProgress.current"
          :max="sparkProgress.max"
          variant="amber"
          :label="
            t('gacha.calculator.sparkProgress', {
              current: sparkProgress.current,
              max: sparkProgress.max,
            })
          "
          show-percentage
        />
        <span
          class="gacha-calc__spark-note"
          :class="{ 'gacha-calc__spark-note--ready': sparkProgress.isReady }"
        >
          {{
            sparkProgress.isReady
              ? t('gacha.calculator.sparkReady')
              : t('gacha.calculator.rollsToSpark', { count: sparkProgress.remaining })
          }}
        </span>
      </div>
    </div>

    <!-- Forecast to Banner End Card -->
    <section
      v-if="(props.banners && props.banners.length > 0) || targetForecastBanner"
      class="gacha-calc__forecast-card gacha-forecast-card"
    >
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

      <div class="gacha-forecast-card__body">
        <div class="gacha-forecast-card__controls">
          <!-- Target Banner Select -->
          <div
            v-if="props.banners && props.banners.length > 0"
            class="gacha-forecast-card__control-group"
          >
            <label for="gacha-forecast-banner" class="gacha-forecast-card__label">
              {{ t('gacha.forecast.bannerLabel') }}:
            </label>
            <select
              id="gacha-forecast-banner"
              :value="selectedTargetBannerId"
              class="gacha-forecast-card__select"
              :aria-label="t('gacha.forecast.bannerLabel')"
              @change="onTargetBannerChange"
            >
              <option v-for="b in props.banners" :key="b.id" :value="b.id">
                {{ b.title }}{{ b.isUpcoming ? ' (Upcoming)' : '' }}
              </option>
            </select>
          </div>

          <!-- Income Mode Toggle -->
          <div
            class="gacha-forecast-card__control-group"
            role="radiogroup"
            :aria-label="t('gacha.forecast.modeLabel')"
          >
            <span class="gacha-forecast-card__label"> {{ t('gacha.forecast.modeLabel') }}: </span>
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
                  value="f2p"
                  name="forecast-income-mode"
                  class="gacha-forecast-card__radio-input"
                />
                <span class="gacha-forecast-card__radio-text">{{
                  t('gacha.forecast.modeF2p')
                }}</span>
              </label>

              <label
                class="gacha-forecast-card__radio-label"
                :class="{
                  'gacha-forecast-card__radio-label--active': forecastMode === 'monthly_card',
                }"
              >
                <input
                  v-model="forecastMode"
                  type="radio"
                  value="monthly_card"
                  name="forecast-income-mode"
                  class="gacha-forecast-card__radio-input"
                />
                <span class="gacha-forecast-card__radio-text">{{
                  t('gacha.forecast.modeMonthly')
                }}</span>
              </label>
            </div>
          </div>
        </div>

        <!-- Forecast Results -->
        <div class="gacha-forecast-card__results">
          <div class="gacha-forecast-card__stat-primary">
            <span class="gacha-forecast-card__stat-value">
              {{ t('gacha.forecast.pullsTotal', { count: forecastResult.pullsWithIncome }) }}
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
                  count: forecastResult.pullsWithIncome - forecastResult.pullsNow,
                })
              }}
            </span>
            <span v-if="forecastResult.daysUntil > 0" class="gacha-forecast-card__days-badge">
              {{ t('gacha.forecast.daysRemaining', { count: forecastResult.daysUntil }) }}
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- Probability Simulation & Curve Milestones -->
    <div class="gacha-calc__sim-section">
      <div class="gacha-calc__sim-controls">
        <label class="gacha-calc__sim-label" for="sim-pulls-input">
          {{ t('gacha.calculator.simPulls') }}:
        </label>
        <AkStepper
          id="sim-pulls-input"
          :model-value="simPulls"
          :min="1"
          :max="300"
          :step="10"
          aria-label="Simulation Rolls"
          @update:model-value="simPulls = $event"
        />
        <span v-if="props.banner && targetRateUpShare !== null" class="gacha-calc__sim-result">
          {{ t('gacha.calculator.probabilityCurrent', { percent: simProb, pulls: simPulls }) }}
        </span>
        <span
          v-else-if="props.banner && targetRateUpShare === null"
          class="gacha-calc__sim-result gacha-calc__sim-result--unavailable"
        >
          {{ t('gacha.calculator.unavailable') }}
        </span>
        <span v-else class="gacha-calc__sim-result gacha-calc__sim-result--hint">
          {{ t('gacha.calculator.selectTargetHint') }}
        </span>
      </div>

      <!-- Milestones Cards -->
      <div class="gacha-calc__milestones-grid">
        <div
          v-for="m in milestones"
          :key="m.pulls"
          class="gacha-calc__milestone-card"
          :class="{
            'gacha-calc__milestone-card--active': totalAvailablePulls >= m.pulls,
            'gacha-calc__milestone-card--spark': m.isSpark,
          }"
        >
          <span class="gacha-calc__milestone-rolls">{{ m.pulls }} ROLLS</span>
          <span class="gacha-calc__milestone-prob">
            {{
              props.banner && targetRateUpShare === null
                ? '—'
                : m.isSpark
                  ? '100% SPARK'
                  : `${m.probability}%`
            }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.gacha-calc {
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
  padding: var(--space-lg, 24px);
  display: flex;
  flex-direction: column;
  gap: var(--space-md, 20px);
  min-width: 0;

  @media (width <= 640px) {
    padding: var(--space-sm, 12px);
    gap: var(--space-sm, 14px);
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-md);
    flex-wrap: wrap;
    border-bottom: 1px solid var(--color-border-subtle);
    padding-bottom: var(--space-sm);
  }

  &__title-wrap {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__title {
    margin: 0;
    font-family: var(--font-heading);
    font-size: var(--font-size-md, 18px);
    font-weight: var(--font-weight-extrabold);
    color: var(--color-text-primary);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  &__subtitle {
    font-family: var(--font-body);
    font-size: var(--font-size-xs, 12px);
    color: var(--color-text-secondary);
  }

  &__depot-btn {
    align-self: flex-start;
  }

  &__target-section {
    background-color: var(--color-bg-base);
    border: 1px solid var(--color-border-subtle);
    padding: var(--space-sm) var(--space-md);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-md);
    flex-wrap: wrap;

    @media (width <= 640px) {
      padding: var(--space-xs) var(--space-sm);
      gap: var(--space-xs);
    }
  }

  &__target-control {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    width: 100%;
    max-width: 460px;

    @media (width <= 480px) {
      flex-direction: column;
      align-items: stretch;
      gap: 4px;
    }
  }

  &__target-label {
    font-family: var(--font-body);
    font-size: var(--font-size-xs, 12px);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    white-space: nowrap;
  }

  &__target-select {
    flex: 1;
    min-width: 0;
    padding: var(--space-xs) var(--space-sm);
    font-family: var(--font-body);
    font-size: var(--font-size-sm, 14px);
    background-color: var(--color-bg-deep);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border-bold);
    border-radius: var(--radius-none);
    cursor: pointer;
    transition: border-color var(--transition-fast);

    @include focus-ring;

    &:hover {
      border-color: var(--color-accent-amber);
    }
  }

  &__treasury-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: var(--space-sm, 14px);

    @media (width <= 480px) {
      grid-template-columns: 1fr;
    }
  }

  &__treasury-cell {
    background-color: var(--color-bg-base);
    border: 1px solid var(--color-border-subtle);
    padding: var(--space-sm, 12px);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-sm);
    min-width: 0;

    @media (width <= 480px) {
      padding: 10px 12px;
    }
  }

  &__stepper {
    flex-shrink: 0;
  }

  &__item-info {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    min-width: 0;
  }

  &__item-meta {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  &__item-label {
    font-family: var(--font-heading);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__item-sub {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    color: var(--color-text-muted);
  }

  &__results-card {
    background-color: var(--color-bg-base);
    border: 1px solid var(--color-border-subtle);
    border-left: 3px solid var(--color-accent-amber);
    padding: var(--space-md);
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  &__rolls-summary {
    display: flex;
    gap: var(--space-xl);
    flex-wrap: wrap;
  }

  &__stat-block {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  &__stat-label {
    font-family: var(--font-body);
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  &__stat-value {
    font-family: var(--font-mono);
    font-size: var(--font-size-xl, 24px);
    font-weight: var(--font-weight-bold);
    line-height: 1.1;

    &--rolls {
      color: var(--color-text-primary);
    }

    &--prob {
      color: var(--color-accent-amber);
    }

    &--none {
      color: var(--color-text-muted);
    }

    &--unavailable {
      color: var(--color-status-warning);
      font-size: var(--font-size-sm, 14px);
      line-height: 1.4;
    }
  }

  &__banner-hint {
    margin: 0;
    font-family: var(--font-body);
    font-size: var(--font-size-xs, 12px);
    color: var(--color-text-muted);
    line-height: 1.5;
  }

  &__spark-bar {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__permits-notice {
    display: flex;
    align-items: center;
    gap: var(--space-xs, 8px);
    padding: 8px 12px;
    background-color: rgb(255 157 43 / 8%);
    border: 1px solid var(--color-accent-amber);
    box-sizing: border-box;
  }

  &__permits-tag {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs, 10px);
    font-weight: var(--font-weight-bold);
    color: var(--color-accent-amber);
    letter-spacing: 0.08em;
  }

  &__permits-text {
    font-family: var(--font-body);
    font-size: var(--font-size-xs, 12px);
    color: var(--color-text-secondary);
  }

  &__spark-note {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    color: var(--color-text-muted);

    &--ready {
      color: var(--color-status-success);
      font-weight: var(--font-weight-bold);
    }
  }

  &__sim-section {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  &__sim-controls {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    flex-wrap: wrap;
  }

  &__sim-label {
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-secondary);
  }

  &__sim-result {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--color-accent-amber);

    &--unavailable {
      color: var(--color-status-warning);
    }

    &--hint {
      color: var(--color-text-muted);
    }
  }

  &__milestones-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: var(--space-xs);
    min-width: 0;
  }

  &__milestone-card {
    background-color: var(--color-bg-base);
    border: 1px solid var(--color-border-subtle);
    padding: var(--space-xs) var(--space-sm);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    text-align: center;
    transition:
      border-color var(--transition-fast),
      background-color var(--transition-fast);

    &--active {
      border-color: var(--color-accent-amber);
      background-color: rgb(255 157 43 / 6%);
    }

    &--spark {
      border-color: var(--color-rarity-5);
    }
  }

  &__milestone-rolls {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    color: var(--color-text-muted);
    letter-spacing: 0.08em;
  }

  &__milestone-prob {
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }
}

/* Forecast to Banner End Card */
.gacha-forecast-card {
  background-color: var(--color-bg-base);
  border: 1px solid var(--color-border-subtle);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;

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
    min-width: 0;
    max-width: 100%;

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
    max-width: 100%;
    box-sizing: border-box;

    @media (width <= 640px) {
      width: 100%;
    }
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
    display: block;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
    padding: 8px 12px;
    background-color: var(--color-bg-deep);
    border: 1px solid var(--color-border-subtle);
    color: var(--color-text-primary);
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: border-color var(--transition-fast);

    &:focus-visible {
      outline: 2px solid var(--color-accent-amber);
      outline-offset: 1px;
    }
  }

  &__radios {
    display: flex;
    gap: var(--space-sm);
    flex-wrap: wrap;
    min-width: 0;
    max-width: 100%;
    box-sizing: border-box;

    @media (width <= 640px) {
      flex-direction: column;
      align-items: stretch;
      gap: 6px;
    }
  }

  &__radio-label {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    min-width: 0;
    max-width: 100%;
    box-sizing: border-box;
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
  }

  &__radio-text {
    white-space: nowrap;
  }

  &__results {
    display: flex;
    align-items: center;
    gap: var(--space-xl);
    flex-wrap: wrap;
    padding: var(--space-sm) var(--space-md);
    background-color: var(--color-bg-deep);
    border: 1px solid var(--color-border-subtle);
    border-left: 3px solid var(--color-accent-amber);

    @media (width <= 640px) {
      flex-direction: column;
      align-items: flex-start;
      gap: var(--space-xs);
    }
  }

  &__stat-primary {
    display: flex;
    align-items: baseline;
    gap: var(--space-xs);
  }

  &__stat-value {
    font-family: var(--font-mono);
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-accent-amber);
    line-height: 1.1;

    @media (width <= 640px) {
      font-size: var(--font-size-lg);
    }
  }

  &__breakdown {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    flex-wrap: wrap;
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }

  &__breakdown-item {
    white-space: nowrap;
  }

  &__breakdown-sep {
    color: var(--color-text-muted);
  }

  &__days-badge {
    margin-left: var(--space-xs);
    padding: 2px 8px;
    background-color: rgb(255 157 43 / 15%);
    border: 1px solid var(--color-accent-amber);
    color: var(--color-accent-amber);
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-bold);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
}
</style>
