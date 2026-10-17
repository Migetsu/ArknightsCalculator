<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { BannerType } from '~/../shared/schemas/banner'
import {
  calculateTotalPulls,
  calculateSparkProgress,
  calculateRateUpProbability,
  getProbabilityMilestones,
} from '~/../shared/utils/gacha'
import { useDepotStore } from '~/stores/depot'
import AkProgress from '~/components/ui/AkProgress.vue'
import AkButton from '~/components/ui/AkButton.vue'
import AkItemIcon from '~/components/ui/AkItemIcon.vue'
import AkStepper from '~/components/ui/AkStepper.vue'

interface Props {
  activeBannerType?: BannerType
}

const props = withDefaults(defineProps<Props>(), {
  activeBannerType: 'standard',
})

const { t } = useI18n()
const depotStore = useDepotStore()

// Treasury state
const orundum = ref<number>(0)
const originitePrime = ref<number>(0)
const permitsSingle = ref<number>(0)
const permitsTen = ref<number>(0)

onMounted(async () => {
  if (depotStore.status === 'idle') {
    await depotStore.init()
  }
})

// Fill from depot store
function fillFromDepot(): void {
  orundum.value = depotStore.currencies.orundum || 0
  originitePrime.value = depotStore.currencies.originitePrime || 0
}

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
  const prob = calculateRateUpProbability(totalAvailablePulls.value, props.activeBannerType)
  return Math.round(prob * 1000) / 10
})

const simProb = computed<number>(() => {
  const prob = calculateRateUpProbability(simPulls.value, props.activeBannerType)
  return Math.round(prob * 1000) / 10
})

const milestones = computed(() => {
  return getProbabilityMilestones(props.activeBannerType)
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
          <span class="gacha-calc__stat-label">{{ t('gacha.calculator.probabilityTitle') }}</span>
          <span class="gacha-calc__stat-value gacha-calc__stat-value--prob">
            {{ currentProb }}%
          </span>
        </div>
      </div>

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
        <span class="gacha-calc__sim-result">
          {{ t('gacha.calculator.probabilityCurrent', { percent: simProb, pulls: simPulls }) }}
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
            {{ m.isSpark ? '100% SPARK' : `${m.probability}%` }}
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
      flex-direction: column;
      align-items: stretch;
      gap: var(--space-xs, 8px);
    }
  }

  &__stepper {
    @media (width <= 480px) {
      width: 100%;
    }
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
  }

  &__spark-bar {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
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
</style>
