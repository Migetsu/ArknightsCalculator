<script setup lang="ts">
import { computed } from 'vue'
import type { OperatorDetail } from '~/../shared/schemas/operator'
import { calculateOperatorStats, MAX_LEVEL_BY_RARITY } from '~/../shared/utils/stats/calculateStats'
import type { CalculatedStatsResult } from '~/../shared/utils/stats/types'
import AkButton from '~/components/ui/AkButton.vue'

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

function handleLevelInput(e: Event): void {
  const input = e.target as HTMLInputElement
  let val = parseInt(input.value, 10)
  if (isNaN(val)) val = 1
  val = Math.max(1, Math.min(maxLevelForPhase.value, val))
  emit('update:level', val)
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
    <!-- Controls Section -->
    <div class="ak-operator-stats-panel__controls">
      <!-- 1. Elite Selector -->
      <div class="ak-operator-stats-panel__control-group">
        <label class="ak-operator-stats-panel__control-label">
          {{ t('operators.detail.stats.elite') }}
        </label>
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

      <!-- 2. Level Slider & Input -->
      <div
        class="ak-operator-stats-panel__control-group ak-operator-stats-panel__control-group--wide"
      >
        <div class="ak-operator-stats-panel__slider-header">
          <label for="op-level-input" class="ak-operator-stats-panel__control-label">
            {{ t('operators.detail.stats.level') }}
          </label>
          <input
            id="op-level-input"
            type="number"
            class="ak-operator-stats-panel__num-input"
            min="1"
            :max="maxLevelForPhase"
            :value="level"
            @input="handleLevelInput"
            @change="handleLevelInput"
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
          :aria-valuemin="1"
          :aria-valuemax="maxLevelForPhase"
          :aria-valuenow="level"
          :aria-valuetext="`Level ${level} of ${maxLevelForPhase}`"
          @input="$emit('update:level', parseInt(($event.target as HTMLInputElement).value, 10))"
        />
      </div>

      <!-- 3. Trust Slider -->
      <div
        class="ak-operator-stats-panel__control-group ak-operator-stats-panel__control-group--wide"
      >
        <div class="ak-operator-stats-panel__slider-header">
          <label for="op-trust-slider" class="ak-operator-stats-panel__control-label">
            {{ t('operators.detail.stats.trust') }}
          </label>
          <span class="ak-operator-stats-panel__val-badge">{{ trust }}%</span>
        </div>
        <input
          id="op-trust-slider"
          type="range"
          class="ak-operator-stats-panel__slider"
          min="0"
          max="100"
          :value="trust"
          :aria-label="t('operators.detail.stats.trust')"
          :aria-valuemin="0"
          :aria-valuemax="100"
          :aria-valuenow="trust"
          :aria-valuetext="`${trust} percent trust`"
          @input="$emit('update:trust', parseInt(($event.target as HTMLInputElement).value, 10))"
        />
      </div>

      <!-- 4. Potential Selector -->
      <div class="ak-operator-stats-panel__control-group">
        <label class="ak-operator-stats-panel__control-label">
          {{ t('operators.detail.stats.potential') }}
        </label>
        <div class="ak-operator-stats-panel__btn-group">
          <AkButton
            v-for="p in 6"
            :key="p"
            size="sm"
            :variant="potential === p ? 'secondary' : 'ghost'"
            @click="$emit('update:potential', p)"
          >
            P{{ p }}
          </AkButton>
        </div>
      </div>

      <!-- 5. Module Selector (if available) -->
      <div v-if="combatModules.length > 0" class="ak-operator-stats-panel__control-group">
        <label class="ak-operator-stats-panel__control-label">
          {{ t('operators.detail.stats.module') }}
        </label>
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
            {{ m.type }}
          </AkButton>
        </div>
      </div>

      <!-- Module Stage (if module selected) -->
      <div v-if="selectedModuleId" class="ak-operator-stats-panel__control-group">
        <label class="ak-operator-stats-panel__control-label">
          {{ t('operators.detail.stats.moduleStage') }}
        </label>
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

  &__controls {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-md);
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    padding: var(--space-md);
  }

  &__control-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);

    &--wide {
      flex: 1 1 200px;
      min-width: 180px;
    }
  }

  &__control-label {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-dim);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  &__btn-group {
    display: flex;
    gap: var(--space-xs);
    flex-wrap: wrap;
  }

  &__slider-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__num-input {
    width: 60px;
    background: var(--color-bg-base);
    border: 1px solid var(--color-border);
    color: var(--color-text-primary);
    font-family: var(--font-family-mono);
    font-size: var(--font-size-sm);
    padding: 2px var(--space-xs);
    text-align: right;

    &:focus {
      outline: 1px solid var(--color-accent-cyan);
    }
  }

  &__val-badge {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-xs);
    color: var(--color-accent-amber);
    font-weight: var(--font-weight-bold);
  }

  &__slider {
    width: 100%;
    accent-color: var(--color-accent-cyan);
    cursor: pointer;
  }

  &__stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
    gap: var(--space-sm);
  }

  &__stat-card {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    padding: var(--space-sm) var(--space-md);
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    position: relative;
    clip-path: polygon(
      0 var(--cut-corner-size),
      var(--cut-corner-size) 0,
      100% 0,
      100% calc(100% - var(--cut-corner-size)),
      calc(100% - var(--cut-corner-size)) 100%,
      0 100%
    );
  }

  &__stat-label {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-xs);
    color: var(--color-text-dim);
    text-transform: uppercase;
  }

  &__stat-value {
    font-family: var(--font-family-mono);
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  &__stat-breakdown {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    font-family: var(--font-family-mono);
    font-size: 10px;
    color: var(--color-text-dim);
  }

  &__breakdown-part {
    &--trust {
      color: var(--color-accent-amber);
    }

    &--pot {
      color: var(--color-accent-green);
    }

    &--mod {
      color: var(--color-accent-cyan);
    }
  }
}
</style>
