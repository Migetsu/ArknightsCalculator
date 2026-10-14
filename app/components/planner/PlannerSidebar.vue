<script setup lang="ts">
import { computed } from 'vue'
import rawOperatorsData from '~/../data/operators-index.json'
import {
  resolveI18nString,
  type OperatorSummary,
  type ContentLocale,
} from '~/../shared/schemas/operator'
import { usePlannerStore } from '~/stores/planner'
import AkAvatar from '~/components/ui/AkAvatar.vue'
import AkButton from '~/components/ui/AkButton.vue'

interface Props {
  isModalOpen: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'open-add-modal'): void
}>()

const { t, locale } = useI18n()
const plannerStore = usePlannerStore()

const allOperators = rawOperatorsData as unknown as readonly OperatorSummary[]
const operatorsMap = computed(() => {
  const map = new Map<string, OperatorSummary>()
  for (const op of allOperators) {
    map.set(op.id, op)
  }
  return map
})

function getOperatorName(operatorId: string): string {
  const op = operatorsMap.value.get(operatorId)
  if (!op) return operatorId
  return resolveI18nString(op.name, locale.value as ContentLocale)
}

function getOperatorRarity(operatorId: string): 1 | 2 | 3 | 4 | 5 | 6 {
  const r = operatorsMap.value.get(operatorId)?.rarity ?? 5
  return (r >= 1 && r <= 6 ? r : 5) as 1 | 2 | 3 | 4 | 5 | 6
}

function formatTargetSubtitle(plan: (typeof plannerStore.plans)[0]): string {
  const cur = `E${plan.current.elite} Lv${plan.current.level}`
  const tgt = `E${plan.target.elite} Lv${plan.target.level}`
  return `${cur} → ${tgt}`
}

function calculatePlanProgress(plan: (typeof plannerStore.plans)[0]): number {
  const maxElite = Math.max(1, plan.target.elite)
  const currentTotal = plan.current.elite * 100 + plan.current.level
  const targetTotal = maxElite * 100 + plan.target.level
  if (targetTotal <= 0) return 0
  const pct = Math.round((currentTotal / targetTotal) * 100)
  return Math.min(100, Math.max(0, pct))
}

const totalExpCardCount = computed<number>(() => {
  let count = 0
  for (const qty of Object.values(plannerStore.plannedExpCards.cards)) {
    count += qty
  }
  return count
})
</script>

<template>
  <aside class="planner-sidebar">
    <div class="planner-sidebar__header">
      <h1 class="planner-sidebar__title">{{ t('planner.title') }}</h1>
      <AkButton
        variant="primary"
        size="md"
        class="planner-sidebar__add-btn"
        @click="emit('open-add-modal')"
      >
        {{ t('planner.addOperator') }}
      </AkButton>
    </div>

    <!-- Plans List -->
    <div v-if="plannerStore.plans.length > 0" class="planner-sidebar__plans-list">
      <div
        v-for="plan in plannerStore.plans"
        :key="plan.id"
        class="planner-sidebar__plan-card"
        :class="{ 'planner-sidebar__plan-card--active': plan.id === plannerStore.selectedPlanId }"
        @click="plannerStore.selectPlan(plan.id)"
      >
        <AkAvatar
          :id="plan.operatorId"
          :name="getOperatorName(plan.operatorId)"
          :rarity="getOperatorRarity(plan.operatorId)"
          size="52"
        />

        <div class="planner-sidebar__plan-body">
          <div class="planner-sidebar__plan-top">
            <span class="planner-sidebar__plan-name">
              {{ getOperatorName(plan.operatorId) }}
            </span>
            <button
              type="button"
              class="planner-sidebar__plan-remove"
              :aria-label="t('planner.removePlan')"
              :title="t('planner.removePlan')"
              @click.stop="plannerStore.removePlan(plan.id)"
            >
              ✕
            </button>
          </div>

          <div class="planner-sidebar__plan-target">
            {{ formatTargetSubtitle(plan) }}
          </div>

          <div class="planner-sidebar__bar">
            <div
              class="planner-sidebar__bar-fill"
              :style="{ width: `${calculatePlanProgress(plan)}%` }"
            />
          </div>
        </div>
      </div>
    </div>

    <div v-else class="planner-sidebar__no-plans">
      <p class="planner-sidebar__no-plans-text">{{ t('planner.noPlansAside') }}</p>
    </div>

    <!-- Total Needed Section -->
    <div class="planner-sidebar__summary">
      <p class="planner-sidebar__summary-heading">
        {{ t('planner.totalNeeded') }}
      </p>

      <div class="planner-sidebar__summary-card">
        <div class="planner-sidebar__summary-row">
          <span>LMD</span>
          <b class="planner-sidebar__summary-val">
            {{ plannerStore.aggregatedDemand.lmd.toLocaleString() }}
          </b>
        </div>

        <div class="planner-sidebar__summary-row">
          <span>{{ t('planner.expCards') }}</span>
          <b class="planner-sidebar__summary-val">
            {{ totalExpCardCount }}
          </b>
        </div>

        <div class="planner-sidebar__summary-row">
          <span>{{ t('planner.missingItems') }}</span>
          <b class="planner-sidebar__summary-val planner-sidebar__summary-val--accent">
            {{ plannerStore.missingItemsCount }}
          </b>
        </div>
      </div>
    </div>
  </aside>
</template>

<style lang="scss" scoped>
.planner-sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  width: 100%;
  min-width: 0;

  @include mq(lg) {
    width: 320px;
    flex-shrink: 0;
  }

  &__header {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  &__title {
    margin: 0;
    font-family: var(--font-heading);
    font-size: var(--font-size-2xl);
    font-weight: 800;
    color: var(--color-text-primary);
    letter-spacing: var(--letter-spacing-heading);
  }

  &__add-btn {
    width: 100%;
  }

  &__plans-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    max-height: 480px;
    overflow-y: auto;
    padding-right: var(--space-2xs);

    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: var(--color-border-bold);
    }
  }

  &__plan-card {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm);
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-none);
    cursor: pointer;
    transition:
      background var(--transition-fast),
      border-color var(--transition-fast);

    &:hover {
      background: var(--color-bg-card-hover);
      border-color: var(--color-border-bold);
    }

    &--active {
      border-color: var(--color-accent-primary);
      background: var(--color-bg-card);
      box-shadow: inset 0 0 12px rgb(255 106 61 / 8%);
    }
  }

  &__plan-body {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
  }

  &__plan-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2xs);
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

  &__plan-remove {
    background: transparent;
    border: 0;
    color: var(--color-text-muted);
    cursor: pointer;
    font-size: var(--font-size-xs);
    padding: 2px 4px;
    line-height: 1;
    transition: color var(--transition-fast);

    &:hover {
      color: var(--color-accent-danger);
    }
  }

  &__plan-target {
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    margin: 2px 0 6px;
  }

  &__bar {
    height: 4px;
    background: var(--color-bg-base);
    width: 100%;
    overflow: hidden;
  }

  &__bar-fill {
    height: 100%;
    background: var(--color-accent-primary);
    transition: width var(--transition-base);
  }

  &__no-plans {
    padding: var(--space-md);
    background: var(--color-bg-surface);
    border: 1px dashed var(--color-border-subtle);
    text-align: center;
  }

  &__no-plans-text {
    margin: 0;
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  &__summary {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
    margin-top: auto;
  }

  &__summary-heading {
    margin: 0;
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    font-weight: 600;
    letter-spacing: 0.14em;
    color: var(--color-text-secondary);
    text-transform: uppercase;
  }

  &__summary-card {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    padding: var(--space-sm) var(--space-md);
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
  }

  &__summary-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
  }

  &__summary-val {
    font-family: var(--font-mono);
    color: var(--color-text-primary);

    &--accent {
      color: var(--color-accent-primary);
    }
  }
}
</style>
