<script setup lang="ts">
import { computed } from 'vue'
import type { OperatorDetail } from '~/../shared/schemas/operator'
import { resolveI18nString } from '~/../shared/schemas/operator'
import { calculateOperatorStats, MAX_LEVEL_BY_RARITY } from '~/../shared/utils/stats/calculateStats'
import type { CalculatedStatsResult } from '~/../shared/utils/stats/types'
import { getOperatorPromotionCosts } from '~/../shared/utils/upgradeCosts'
import rawConstantsData from '~/../data/constants.json'
import rawItemsData from '~/../data/items.json'
import type { GameItem } from '~/../shared/schemas/item'
import AkButton from '~/components/ui/AkButton.vue'
import AkStepper from '~/components/ui/AkStepper.vue'
import AkSegmented, { type SegmentOption } from '~/components/ui/AkSegmented.vue'
import AkRangeGrid from '~/components/ui/AkRangeGrid.vue'
import AkItemIcon from '~/components/ui/AkItemIcon.vue'

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

const { t, locale } = useI18n()

const itemsMap = new Map((rawItemsData as unknown as GameItem[]).map((it) => [it.id, it]))

function getItemName(id: string): string {
  if (id === '4001') return t('operators.detail.stats.lmd')
  const it = itemsMap.get(id)
  if (!it) return id
  return resolveI18nString(it.name, locale.value as 'en' | 'zh') || it.name.en || id
}

function getItemIconId(id: string): string | undefined {
  return itemsMap.get(id)?.iconId
}

function getItemRarity(id: string): 1 | 2 | 3 | 4 | 5 {
  if (id === '4001') return 4
  const r = itemsMap.get(id)?.rarity ?? 1
  return Math.max(1, Math.min(5, r)) as 1 | 2 | 3 | 4 | 5
}

// Available promotion costs (E1 / E2)
const promotionCosts = computed(() =>
  getOperatorPromotionCosts(props.operator, rawConstantsData.evolveGoldCost),
)

// Max available elite phases by operator rarity (0..2)
const maxElitePhase = computed(() => props.operator.phases.length - 1)

const eliteOptions = computed<SegmentOption<number>[]>(() => {
  return Array.from({ length: maxElitePhase.value + 1 }, (_, i) => ({
    value: i,
    label: `E${i}`,
  }))
})

// Max level for the current elite phase
const maxLevelForPhase = computed(() => {
  const allowed = MAX_LEVEL_BY_RARITY[props.operator.rarity]
  return allowed?.[props.elite] ?? props.operator.phases[props.elite]?.maxLevel ?? 50
})

// Current attack range ID based on active elite phase
const currentRangeId = computed(() => {
  return props.operator.phases[props.elite]?.rangeId ?? props.operator.phases[0]?.rangeId ?? ''
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

function formatDelta(val: number | undefined): string {
  if (!val || val === 0) return '—'
  return val > 0 ? `+${val}` : `${val}`
}

interface BreakdownRow {
  key: string
  label: string
  base: string | number
  trust: string | number
  potential: string | number
  module: string | number
  total: string | number
}

const breakdownRows = computed<BreakdownRow[]>(() => {
  if (!calculatedStats.value) return []
  const s = calculatedStats.value
  const b = s.breakdown

  return [
    {
      key: 'hp',
      label: t('operators.detail.stats.hp'),
      base: b.base.hp,
      trust: formatDelta(b.trust.hp),
      potential: formatDelta(b.potential.hp),
      module: formatDelta(b.module.hp),
      total: s.hp,
    },
    {
      key: 'atk',
      label: t('operators.detail.stats.atk'),
      base: b.base.atk,
      trust: formatDelta(b.trust.atk),
      potential: formatDelta(b.potential.atk),
      module: formatDelta(b.module.atk),
      total: s.atk,
    },
    {
      key: 'def',
      label: t('operators.detail.stats.def'),
      base: b.base.def,
      trust: formatDelta(b.trust.def),
      potential: formatDelta(b.potential.def),
      module: formatDelta(b.module.def),
      total: s.def,
    },
    {
      key: 'res',
      label: t('operators.detail.stats.res'),
      base: b.base.res,
      trust: formatDelta(b.trust.res),
      potential: formatDelta(b.potential.res),
      module: formatDelta(b.module.res),
      total: s.res,
    },
    {
      key: 'cost',
      label: t('operators.detail.stats.cost'),
      base: b.base.cost,
      trust: formatDelta(b.trust.cost),
      potential: formatDelta(b.potential.cost),
      module: formatDelta(b.module.cost),
      total: s.cost,
    },
    {
      key: 'block',
      label: t('operators.detail.stats.block'),
      base: b.base.block,
      trust: formatDelta(b.trust.block),
      potential: formatDelta(b.potential.block),
      module: formatDelta(b.module.block),
      total: s.block,
    },
    {
      key: 'attackInterval',
      label: t('operators.detail.stats.attackInterval'),
      base: `${s.baseAttackTime}s`,
      trust: '—',
      potential: '—',
      module: s.attackSpeed !== 0 ? `${s.attackSpeed > 0 ? '+' : ''}${s.attackSpeed} ASPD` : '—',
      total: `${s.attackInterval}s`,
    },
    {
      key: 'respawnTime',
      label: t('operators.detail.stats.redeploy'),
      base: `${b.base.respawnTime}s`,
      trust: b.trust.respawnTime ? `${b.trust.respawnTime}s` : '—',
      potential: b.potential.respawnTime ? `${b.potential.respawnTime}s` : '—',
      module: b.module.respawnTime ? `${b.module.respawnTime}s` : '—',
      total: `${s.respawnTime}s`,
    },
  ]
})
</script>

<template>
  <div class="ak-operator-stats-panel">
    <!-- 1. Four Cards Control Grid: Elite, Level, Trust, Potential -->
    <div class="ak-operator-stats-panel__cards-grid">
      <!-- Card 1: Elite (using AkSegmented) -->
      <div class="ak-operator-stats-panel__card">
        <div class="ak-operator-stats-panel__card-header">
          <span class="ak-operator-stats-panel__card-title">
            {{ t('operators.detail.stats.elite') }}
          </span>
        </div>
        <div class="ak-operator-stats-panel__elite-wrap">
          <AkSegmented
            :model-value="elite"
            :options="eliteOptions"
            :aria-label="t('operators.detail.stats.elite')"
            @update:model-value="setElite(Number($event))"
          />
        </div>
      </div>

      <!-- Card 2: Level -->
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

      <!-- Card 3: Trust -->
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

      <!-- Card 4: Potential -->
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

    <!-- 2. Compact Module Selector Row (Only if operator has modules) -->
    <div v-if="combatModules.length > 0" class="ak-operator-stats-panel__module-row">
      <span class="ak-operator-stats-panel__module-label">
        {{ t('operators.detail.stats.module') }}:
      </span>
      <div class="ak-operator-stats-panel__module-buttons">
        <AkButton size="sm" :variant="!selectedModuleId ? 'primary' : 'ghost'" @click="clearModule">
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

      <!-- Module Stage buttons (if module is active) -->
      <div v-if="selectedModuleId" class="ak-operator-stats-panel__module-stages">
        <span class="ak-operator-stats-panel__module-stage-label">Stage:</span>
        <AkButton
          v-for="st in 3"
          :key="st"
          size="sm"
          :variant="moduleStage === st ? 'secondary' : 'ghost'"
          @click="$emit('update:moduleStage', st)"
        >
          S{{ st }}
        </AkButton>
      </div>
    </div>

    <!-- 3. Attack Range Overview Card -->
    <div class="ak-operator-stats-panel__range-card">
      <div class="ak-operator-stats-panel__range-header">
        <span class="ak-operator-stats-panel__range-title">
          {{ t('operators.detail.range.title') }}
        </span>
        <span class="ak-operator-stats-panel__range-phase"> E{{ elite }} </span>
      </div>
      <div class="ak-operator-stats-panel__range-body">
        <AkRangeGrid :range-id="currentRangeId" size="md" :show-legend="true" />
      </div>
    </div>

    <!-- 4. Source Breakdown Table (Desktop) -->
    <div class="ak-operator-stats-panel__table-wrapper">
      <table class="ak-operator-stats-panel__table">
        <thead>
          <tr class="ak-operator-stats-panel__thead-tr">
            <th class="ak-operator-stats-panel__th ak-operator-stats-panel__th--attr">
              {{ t('operators.detail.stats.colAttribute') }}
            </th>
            <th class="ak-operator-stats-panel__th">{{ t('operators.detail.stats.colBase') }}</th>
            <th class="ak-operator-stats-panel__th">{{ t('operators.detail.stats.colTrust') }}</th>
            <th class="ak-operator-stats-panel__th">
              {{ t('operators.detail.stats.colPotential') }}
            </th>
            <th class="ak-operator-stats-panel__th">{{ t('operators.detail.stats.colModule') }}</th>
            <th class="ak-operator-stats-panel__th ak-operator-stats-panel__th--total">
              {{ t('operators.detail.stats.colTotal') }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in breakdownRows" :key="row.key" class="ak-operator-stats-panel__tr">
            <td class="ak-operator-stats-panel__td ak-operator-stats-panel__td--attr">
              {{ row.label }}
            </td>
            <td class="ak-operator-stats-panel__td">{{ row.base }}</td>
            <td
              class="ak-operator-stats-panel__td"
              :class="{
                'ak-operator-stats-panel__td--delta': row.trust !== '—',
              }"
            >
              {{ row.trust }}
            </td>
            <td
              class="ak-operator-stats-panel__td"
              :class="{
                'ak-operator-stats-panel__td--delta': row.potential !== '—',
              }"
            >
              {{ row.potential }}
            </td>
            <td
              class="ak-operator-stats-panel__td"
              :class="{
                'ak-operator-stats-panel__td--delta': row.module !== '—',
              }"
            >
              {{ row.module }}
            </td>
            <td class="ak-operator-stats-panel__td ak-operator-stats-panel__td--total">
              {{ row.total }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 4. Source Breakdown Cards (Mobile, no horizontal overflow) -->
    <div class="ak-operator-stats-panel__cards-mobile">
      <div v-for="row in breakdownRows" :key="row.key" class="ak-operator-stats-panel__card-mobile">
        <div class="ak-operator-stats-panel__card-mobile-header">
          <span class="ak-operator-stats-panel__card-mobile-label">
            {{ row.label }}
          </span>
          <span class="ak-operator-stats-panel__card-mobile-total">
            {{ row.total }}
          </span>
        </div>
        <div class="ak-operator-stats-panel__card-mobile-breakdown">
          <span>Base: {{ row.base }}</span>
          <span v-if="row.trust !== '—'">Trust: {{ row.trust }}</span>
          <span v-if="row.potential !== '—'">Pot: {{ row.potential }}</span>
          <span v-if="row.module !== '—'">Mod: {{ row.module }}</span>
        </div>
      </div>
    </div>

    <!-- 5. Promotion Costs Card (E1 / E2) -->
    <section v-if="promotionCosts.length > 0" class="ak-operator-stats-panel__promotion-card">
      <div class="ak-operator-stats-panel__promotion-header">
        <div class="ak-operator-stats-panel__promotion-title-wrap">
          <span class="ak-operator-stats-panel__promotion-tag">
            {{ t('operators.detail.stats.promotionTag') }}
          </span>
          <h3 class="ak-operator-stats-panel__promotion-title">
            {{ t('operators.detail.stats.promotionTitle') }}
          </h3>
        </div>
      </div>

      <div class="ak-operator-stats-panel__promotion-phases">
        <div
          v-for="promo in promotionCosts"
          :key="promo.phase"
          class="ak-operator-stats-panel__phase-card"
        >
          <div class="ak-operator-stats-panel__phase-header">
            <span class="ak-operator-stats-panel__phase-badge"> E{{ promo.phase }} </span>
            <span class="ak-operator-stats-panel__phase-name">
              {{
                promo.phase === 1
                  ? t('operators.detail.stats.elite1')
                  : t('operators.detail.stats.elite2')
              }}
            </span>
          </div>

          <div class="ak-operator-stats-panel__phase-items">
            <!-- LMD Currency -->
            <AkItemIcon
              v-if="promo.lmd > 0"
              item-id="4001"
              :name="t('operators.detail.stats.lmd')"
              :tier="4"
              :count="promo.lmd.toLocaleString('en-US')"
              size="md"
            />

            <!-- Required Materials -->
            <AkItemIcon
              v-for="mat in promo.materials"
              :key="mat.id"
              :item-id="mat.id"
              :icon-id="getItemIconId(mat.id)"
              :name="getItemName(mat.id)"
              :tier="getItemRarity(mat.id)"
              :count="mat.count"
              size="md"
            />

            <!-- 3-star operators require LMD only (0 materials) -->
            <span
              v-if="promo.materials.length === 0"
              class="ak-operator-stats-panel__phase-no-materials"
            >
              {{ t('operators.detail.stats.noExtraMaterials') }}
            </span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style lang="scss" scoped>
.ak-operator-stats-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-md);

  // 1. Four Cards Grid
  &__cards-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-md);

    @include mq(sm) {
      grid-template-columns: repeat(2, 1fr);
    }

    @include mq(lg) {
      grid-template-columns: repeat(4, 1fr);
    }
  }

  &__card {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-xs);
    padding: var(--space-md);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: var(--space-sm);
  }

  &__card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__card-title {
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-text-secondary);
  }

  &__elite-wrap {
    display: flex;
    align-items: center;
    padding-top: var(--space-xs);
  }

  &__slider {
    width: 100%;
    accent-color: var(--color-accent-primary);
    cursor: pointer;
  }

  // 2. Compact Module Row
  &__module-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-sm);
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-xs);
    padding: var(--space-sm) var(--space-md);
  }

  &__module-label {
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-text-secondary);
  }

  &__module-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
  }

  &__module-stages {
    display: flex;
    align-items: center;
    gap: var(--space-2xs);
    margin-left: 0;
    width: 100%;

    @include mq(sm) {
      margin-left: auto;
      width: auto;
    }
  }

  &__module-stage-label {
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    margin-right: 4px;
  }

  // 3. Attack Range Card
  &__range-card {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-xs);
    padding: var(--space-md);
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  &__range-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__range-title {
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-text-secondary);
  }

  &__range-phase {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    color: var(--color-accent-primary);
  }

  &__range-body {
    display: flex;
    justify-content: flex-start;
  }

  // 4. Desktop Table
  &__table-wrapper {
    display: none;
    background: var(--color-bg-deep);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-xs);
    overflow: hidden;

    @include mq(md) {
      display: block;
    }
  }

  &__table {
    width: 100%;
    border-collapse: collapse;
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    text-align: right;
  }

  &__thead-tr {
    background: var(--color-bg-surface);
    border-bottom: 1px solid var(--color-border-subtle);
  }

  &__th {
    padding: 12px 16px;
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-text-secondary);

    &--attr {
      text-align: left;
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-primary);
    }

    &--total {
      font-family: var(--font-display);
      font-weight: var(--font-weight-bold);
      color: var(--color-accent-primary);
    }
  }

  &__tr {
    transition: background-color var(--transition-fast);

    &:hover {
      background: rgb(255 255 255 / 2%);
    }

    &:last-child .ak-operator-stats-panel__td {
      border-bottom: none;
    }
  }

  &__td {
    padding: 10px 16px;
    border-bottom: 1px solid var(--color-border-subtle);
    color: var(--color-text-secondary);

    &--attr {
      text-align: left;
      font-weight: var(--font-weight-semibold);
      color: var(--color-text-primary);
    }

    &--total {
      font-family: var(--font-display);
      font-weight: var(--font-weight-bold);
      color: var(--color-accent-primary);
    }

    &--delta {
      color: var(--color-accent-amber);
    }
  }

  // 4. Mobile Cards
  &__cards-mobile {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;

    @include mq(md) {
      display: none;
    }
  }

  &__card-mobile {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-xs);
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  &__card-mobile-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__card-mobile-label {
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
  }

  &__card-mobile-total {
    font-family: var(--font-display);
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    color: var(--color-accent-primary);
  }

  &__card-mobile-breakdown {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 12px;
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
  }

  // 5. Promotion Costs Card
  &__promotion-card {
    background: var(--color-bg-surface);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-xs);
    padding: var(--space-md) var(--space-lg);
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
  }

  &__promotion-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid var(--color-border-subtle);
    padding-bottom: var(--space-xs);
  }

  &__promotion-title-wrap {
    display: flex;
    flex-direction: column;
    gap: var(--space-3xs);
  }

  &__promotion-tag {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-bold);
    letter-spacing: 0.16em;
    color: var(--color-accent-amber);
    text-transform: uppercase;
  }

  &__promotion-title {
    margin: 0;
    font-family: var(--font-display);
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    letter-spacing: var(--letter-spacing-display);
    color: var(--color-text-primary);
    text-transform: uppercase;
  }

  &__promotion-phases {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--space-md);

    @include mq(sm) {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  &__phase-card {
    background: var(--color-bg-deep);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-xs);
    padding: var(--space-md);
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }

  &__phase-header {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }

  &__phase-badge {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    color: var(--color-accent-amber);
    background: rgb(255 157 43 / 10%);
    border: 1px solid var(--color-accent-amber);
    border-radius: var(--radius-xs);
    padding: 2px 8px;
  }

  &__phase-name {
    font-family: var(--font-display);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
  }

  &__phase-items {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-sm);
  }

  &__phase-no-materials {
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    font-style: italic;
    color: var(--color-text-secondary);
  }
}
</style>
