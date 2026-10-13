<script setup lang="ts">
import { computed } from 'vue'
import type { OperatorDetail } from '~/../shared/schemas/operator'
import { calculateOperatorStats, MAX_LEVEL_BY_RARITY } from '~/../shared/utils/stats/calculateStats'
import type { CalculatedStatsResult } from '~/../shared/utils/stats/types'
import AkButton from '~/components/ui/AkButton.vue'
import AkStepper from '~/components/ui/AkStepper.vue'

interface Props {
  operator: OperatorDetail
  elite: number
  level: number
  trust: number
  potential: number
  selectedModuleId?: string
  moduleStage: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (
    e: 'update:elite' | 'update:level' | 'update:trust' | 'update:potential' | 'update:moduleStage',
    val: number,
  ): void
  (e: 'update:selectedModuleId', val: string | undefined): void
}>()

const { t } = useI18n()

// Max available elite phases by operator rarity (0..2)
const maxElitePhase = computed(() => props.operator.phases.length - 1)

// Max level for the current elite phase
const maxLevelForPhase = computed(() => {
  const allowed = MAX_LEVEL_BY_RARITY[props.operator.rarity]
  return allowed?.[props.elite] ?? props.operator.phases[props.elite]?.maxLevel ?? 50
})

function setElite(phase: number): void {
  if (phase > maxElitePhase.value) return
  emit('update:elite', phase)
  // Clamp level if exceeds new phase cap
  const newCap = MAX_LEVEL_BY_RARITY[props.operator.rarity]?.[phase] ?? 50
  if (props.level > newCap) {
    emit('update:level', newCap)
  }
}

function clearModule(): void {
  emit('update:selectedModuleId', undefined)
  emit('update:moduleStage', 0)
}

function selectModule(moduleId: string): void {
  emit('update:selectedModuleId', moduleId)
  if (props.moduleStage === 0) {
    emit('update:moduleStage', 3)
  }
}

function getModuleLabel(m: NonNullable<OperatorDetail['modules']>[number]): string {
  const code = m.typeName2 || ''
  const name = m.name?.en || m.name?.zh || ''
  if (code && name) return `${code} (${name})`
  return code || name || m.id
}

// Available combat modules (excluding base mission entries if stages is 0)
const combatModules = computed(() => {
  return (props.operator.modules ?? []).filter((m) => (m.stages?.length ?? 0) > 0)
})

// Calculate current stats using calculation core
const calculatedStats = computed<CalculatedStatsResult | null>(() => {
  try {
    return calculateOperatorStats(props.operator, {
      elite: props.elite as 0 | 1 | 2,
      level: props.level,
      trust: props.trust,
      potential: props.potential,
      module:
        props.selectedModuleId && props.moduleStage > 0
          ? {
              id: props.selectedModuleId,
              stage: props.moduleStage as 1 | 2 | 3,
            }
          : undefined,
    })
  } catch (_err) {
    return null
  }
})

const statsGridItems = computed(() => {
  if (!calculatedStats.value) return []
  const s = calculatedStats.value
  return [
    { key: 'hp', label: t('operators.detail.stats.hp'), value: s.hp, breakdown: s.breakdown },
    { key: 'atk', label: t('operators.detail.stats.atk'), value: s.atk, breakdown: s.breakdown },
    { key: 'def', label: t('operators.detail.stats.def'), value: s.def, breakdown: s.breakdown },
    { key: 'res', label: t('operators.detail.stats.res'), value: s.res, breakdown: s.breakdown },
    { key: 'cost', label: t('operators.detail.stats.cost'), value: s.cost, breakdown: s.breakdown },
    {
      key: 'block',
      label: t('operators.detail.stats.block'),
      value: s.block,
      breakdown: s.breakdown,
    },
    {
      key: 'attackInterval',
      label: t('operators.detail.stats.attackInterval'),
      value: `${s.attackInterval}s`,
      breakdown: null,
    },
    {
      key: 'respawnTime',
      label: t('operators.detail.stats.respawnTime'),
      value: `${s.respawnTime}s`,
      breakdown: s.breakdown,
    },
  ]
})
</script>

<template>
  <div class="ak-operator-stats-panel">
    <!-- 1. Dedicated Top Bar: Promotion (Elite) & Combat Module -->
    <div class="ak-operator-stats-panel__top-row">
      <!-- Elite Promotion -->
      <div class="ak-operator-stats-panel__control-group">
        <span class="ak-operator-stats-panel__control-label">
          {{ t('operators.detail.stats.elite') }}
        </span>
        <div class="ak-operator-stats-panel__btn-group">
          <AkButton
            v-for="phase in maxElitePhase + 1"
            :key="phase - 1"
            size="sm"
            :variant="elite === phase - 1 ? 'primary' : 'ghost'"
            @click="setElite(phase - 1)"
          >
            E{{ phase - 1 }}
          </AkButton>
        </div>
      </div>

      <!-- Module Selector -->
      <div v-if="combatModules.length > 0" class="ak-operator-stats-panel__control-group">
        <span class="ak-operator-stats-panel__control-label">
          {{ t('operators.detail.stats.module') }}
        </span>
        <div class="ak-operator-stats-panel__btn-group">
          <AkButton
            size="sm"
            :variant="!selectedModuleId ? 'primary' : 'ghost'"
            @click="clearModule"
          >
            None
          </AkButton>
          <AkButton
            v-for="m in combatModules"
            :key="m.id"
            size="sm"
            :variant="selectedModuleId === m.id ? 'primary' : 'ghost'"
            @click="selectModule(m.id)"
          >
            {{ getModuleLabel(m) }}
          </AkButton>
        </div>
      </div>

      <!-- Module Stage -->
      <div v-if="selectedModuleId" class="ak-operator-stats-panel__control-group">
        <span class="ak-operator-stats-panel__control-label">
          {{ t('operators.detail.stats.moduleStage') }}
        </span>
        <div class="ak-operator-stats-panel__btn-group">
          <AkButton
            v-for="st in 3"
            :key="st"
            size="sm"
            :variant="moduleStage === st ? 'secondary' : 'ghost'"
            @click="$emit('update:moduleStage', st)"
          >
            Stage {{ st }}
          </AkButton>
        </div>
      </div>
    </div>

    <!-- 2. Triplet Controls Grid: Level, Trust, Potential Cards -->
    <div class="ak-operator-stats-panel__cards-grid">
      <!-- Card 1: Level -->
      <div class="ak-operator-stats-panel__card">
        <div class="ak-operator-stats-panel__card-header">
          <span class="ak-operator-stats-panel__card-title">
            {{ t('operators.detail.stats.level') }}
          </span>
          <AkStepper
            id="op-level-input"
            :model-value="level"
            :min="1"
            :max="maxLevelForPhase"
            :aria-label="t('operators.detail.stats.level')"
            @update:model-value="$emit('update:level', $event)"
          />
        </div>
        <input
          id="op-level-slider"
          type="range"
          class="ak-operator-stats-panel__slider"
          min="1"
          :max="maxLevelForPhase"
          :value="level"
          :aria-label="t('operators.detail.stats.level')"
          @input="$emit('update:level', parseInt(($event.target as HTMLInputElement).value, 10))"
        />
      </div>

      <!-- Card 2: Trust -->
      <div class="ak-operator-stats-panel__card">
        <div class="ak-operator-stats-panel__card-header">
          <span class="ak-operator-stats-panel__card-title">
            {{ t('operators.detail.stats.trust') }} ({{ trust }}%)
          </span>
          <AkStepper
            :model-value="trust"
            :min="0"
            :max="100"
            :step="5"
            :aria-label="t('operators.detail.stats.trust')"
            @update:model-value="$emit('update:trust', $event)"
          />
        </div>
        <input
          id="op-trust-slider"
          type="range"
          class="ak-operator-stats-panel__slider"
          min="0"
          max="100"
          :value="trust"
          :aria-label="t('operators.detail.stats.trust')"
          @input="$emit('update:trust', parseInt(($event.target as HTMLInputElement).value, 10))"
        />
      </div>

      <!-- Card 3: Potential -->
      <div class="ak-operator-stats-panel__card">
        <div class="ak-operator-stats-panel__card-header">
          <span class="ak-operator-stats-panel__card-title">
            {{ t('operators.detail.stats.potential') }} (P{{ potential }})
          </span>
          <AkStepper
            :model-value="potential"
            :min="1"
            :max="6"
            :step="1"
            :aria-label="t('operators.detail.stats.potential')"
            @update:model-value="$emit('update:potential', $event)"
          />
        </div>
        <input
          id="op-potential-slider"
          type="range"
          class="ak-operator-stats-panel__slider"
          min="1"
          max="6"
          :value="potential"
          :aria-label="t('operators.detail.stats.potential')"
          @input="
            $emit('update:potential', parseInt(($event.target as HTMLInputElement).value, 10))
          "
        />
      </div>
    </div>

    <!-- Stats Display Grid -->
    <div v-if="calculatedStats" class="ak-operator-stats-panel__stats-grid">
      <div
        v-for="item in statsGridItems"
        :key="item.key"
        class="ak-operator-stats-panel__stat-card"
      >
        <div class="ak-operator-stats-panel__stat-label">{{ item.label }}</div>
        <div class="ak-operator-stats-panel__stat-value">{{ item.value }}</div>

        <!-- Breakdown tooltip details if available -->
        <div
          v-if="item.breakdown && item.key in item.breakdown.base"
          class="ak-operator-stats-panel__stat-breakdown"
        >
          <span class="ak-operator-stats-panel__breakdown-part">
            Base: {{ item.breakdown.base[item.key as keyof typeof item.breakdown.base] }}
          </span>
          <span
            v-if="item.breakdown.trust[item.key as keyof typeof item.breakdown.trust]"
            class="ak-operator-stats-panel__breakdown-part ak-operator-stats-panel__breakdown-part--trust"
          >
            +{{ item.breakdown.trust[item.key as keyof typeof item.breakdown.trust] }}
          </span>
          <span
            v-if="item.breakdown.potential[item.key as keyof typeof item.breakdown.potential]"
            class="ak-operator-stats-panel__breakdown-part ak-operator-stats-panel__breakdown-part--pot"
          >
            +{{ item.breakdown.potential[item.key as keyof typeof item.breakdown.potential] }}
          </span>
          <span
            v-if="item.breakdown.module[item.key as keyof typeof item.breakdown.module]"
            class="ak-operator-stats-panel__breakdown-part ak-operator-stats-panel__breakdown-part--mod"
          >
            +{{ item.breakdown.module[item.key as keyof typeof item.breakdown.module] }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ak-operator-stats-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);

  &__top-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-md);
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-sm);
    padding: var(--space-md);
  }

  &__control-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
  }

  &__control-label {
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  &__btn-group {
    display: flex;
    gap: var(--space-xs);
    flex-wrap: wrap;
  }

  &__cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: var(--space-md);
  }

  &__card {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-sm);
    padding: var(--space-md);
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  &__card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-sm);
  }

  &__card-title {
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
  }

  &__slider {
    width: 100%;
    accent-color: var(--color-accent-primary);
    cursor: pointer;
  }

  &__stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    gap: var(--space-sm);
  }

  &__stat-card {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-sm);
    padding: var(--space-sm) var(--space-md);
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    position: relative;
  }

  &__stat-label {
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  &__stat-value {
    font-family: var(--font-mono);
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  &__stat-breakdown {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--color-text-secondary);
  }

  &__breakdown-part {
    &--trust {
      color: var(--color-accent-amber);
    }

    &--pot {
      color: var(--color-accent-success);
    }

    &--mod {
      color: var(--color-accent-primary);
    }
  }
}
</style>
