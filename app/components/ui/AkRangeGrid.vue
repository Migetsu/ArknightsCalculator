<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { RangeTableEntry } from '~~/shared/schemas/range'
import { fetchRange } from '~/composables/useOperatorRanges'
import AkBadge from '~/components/ui/AkBadge.vue'

defineOptions({ name: 'AkRangeGrid' })

interface Props {
  range?: RangeTableEntry | null
  rangeId?: string | null
  size?: 'sm' | 'md' | 'lg'
  showMeta?: boolean
  showLegend?: boolean
  badge?: string
  badgeVariant?: 'amber' | 'cyan' | 'green' | 'red' | 'neutral'
  variant?: 'default' | 'modified' | 'inherited'
  ariaLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  range: undefined,
  rangeId: undefined,
  size: 'md',
  showMeta: true,
  showLegend: false,
  badge: undefined,
  badgeVariant: undefined,
  variant: 'default',
  ariaLabel: undefined,
})

const { t } = useI18n()

const fetchedRange = ref<RangeTableEntry | null>(null)
const isPending = ref(false)

async function updateRange(id: string | null | undefined): Promise<void> {
  if (props.range) {
    fetchedRange.value = null
    return
  }
  if (!id) {
    fetchedRange.value = null
    return
  }
  isPending.value = true
  try {
    fetchedRange.value = await fetchRange(id)
  } finally {
    isPending.value = false
  }
}

if (!props.range && props.rangeId) {
  await updateRange(props.rangeId)
}

watch(
  () => props.rangeId,
  async (newId) => {
    await updateRange(newId)
  },
)

const effectiveRange = computed<RangeTableEntry | null>(() => {
  return props.range ?? fetchedRange.value ?? null
})

const resolvedBadge = computed<string | undefined>(() => {
  if (props.badge) return props.badge
  if (props.variant === 'modified') {
    return t('operators.detail.range.modified')
  }
  if (props.variant === 'inherited') {
    return t('operators.detail.range.inherited')
  }
  return undefined
})

const resolvedBadgeVariant = computed<'amber' | 'cyan' | 'green' | 'red' | 'neutral'>(() => {
  if (props.badgeVariant) return props.badgeVariant
  if (props.variant === 'modified') return 'amber'
  if (props.variant === 'inherited') return 'neutral'
  return 'neutral'
})

const gridStyle = computed(() => {
  const r = effectiveRange.value
  if (!r) return {}
  return {
    '--range-cols': String(r.cols),
    '--range-rows': String(r.rows),
  }
})

function isAnchor(row: number, col: number): boolean {
  const r = effectiveRange.value
  if (!r) return false
  return r.anchor.row === row && r.anchor.col === col
}

function isAttackable(row: number, col: number): boolean {
  const r = effectiveRange.value
  if (!r) return false
  return r.matrix[row]?.[col] === 1
}

function getCellTitle(row: number, col: number): string {
  const anchor = isAnchor(row, col)
  const attack = isAttackable(row, col)

  if (anchor && attack) {
    return `${t('operators.detail.range.anchor')} · ${t('operators.detail.range.attackable')}`
  }
  if (anchor && !attack) {
    return `${t('operators.detail.range.anchor')} · ${t('operators.detail.range.nonAttackable')}`
  }
  if (attack) {
    return t('operators.detail.range.attackable')
  }
  return t('operators.detail.range.nonAttackable')
}
</script>

<template>
  <div
    class="ak-range-grid"
    :class="[
      `ak-range-grid--${size}`,
      `ak-range-grid--${variant}`,
      { 'ak-range-grid--pending': isPending },
    ]"
    :aria-label="
      ariaLabel ??
      (effectiveRange
        ? `${t('operators.detail.range.title')} ${effectiveRange.id} (${effectiveRange.cols}x${effectiveRange.rows})`
        : t('operators.detail.range.title'))
    "
  >
    <!-- Header / Metadata bar -->
    <div v-if="showMeta" class="ak-range-grid__header">
      <div class="ak-range-grid__meta">
        <span class="ak-range-grid__id">
          {{
            effectiveRange ? t('operators.detail.range.rangeId', { id: effectiveRange.id }) : '—'
          }}
        </span>
        <span v-if="effectiveRange" class="ak-range-grid__dims">
          {{
            t('operators.detail.range.dimensions', {
              cols: effectiveRange.cols,
              rows: effectiveRange.rows,
            })
          }}
        </span>
      </div>

      <AkBadge
        v-if="resolvedBadge"
        size="sm"
        :variant="resolvedBadgeVariant"
        class="ak-range-grid__badge"
      >
        {{ resolvedBadge }}
      </AkBadge>
    </div>

    <!-- Active Range Board -->
    <div
      v-if="effectiveRange"
      class="ak-range-grid__board"
      :style="gridStyle"
      role="grid"
      :aria-rowcount="effectiveRange.rows"
      :aria-colcount="effectiveRange.cols"
    >
      <div
        v-for="(rowCells, rIndex) in effectiveRange.matrix"
        :key="`row-${rIndex}`"
        class="ak-range-grid__row"
        role="row"
      >
        <div
          v-for="(_cell, cIndex) in rowCells"
          :key="`cell-${rIndex}-${cIndex}`"
          class="ak-range-grid__cell"
          :class="{
            'ak-range-grid__cell--attackable': isAttackable(rIndex, cIndex),
            'ak-range-grid__cell--empty': !isAttackable(rIndex, cIndex),
            'ak-range-grid__cell--anchor': isAnchor(rIndex, cIndex),
            'ak-range-grid__cell--dead-zone-anchor':
              isAnchor(rIndex, cIndex) && !isAttackable(rIndex, cIndex),
          }"
          :title="getCellTitle(rIndex, cIndex)"
          role="gridcell"
          :aria-selected="isAnchor(rIndex, cIndex)"
        >
          <!-- Tactical Operator Anchor Reticle -->
          <span
            v-if="isAnchor(rIndex, cIndex)"
            class="ak-range-grid__anchor-marker"
            :class="{ 'ak-range-grid__anchor-marker--dead-zone': !isAttackable(rIndex, cIndex) }"
            :aria-label="t('operators.detail.range.anchor')"
          >
            <svg
              class="ak-range-grid__anchor-svg"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="3.5" fill="currentColor" />
              <path
                d="M12 2v4M12 18v4M2 12h4M18 12h4"
                stroke="currentColor"
                stroke-width="2.2"
                stroke-linecap="round"
              />
            </svg>
          </span>
        </div>
      </div>
    </div>

    <!-- Loading Skeleton State -->
    <div v-else-if="isPending" class="ak-range-grid__skeleton" aria-busy="true">
      <div class="ak-range-grid__skeleton-board">
        <div v-for="i in 9" :key="`skel-${i}`" class="ak-range-grid__skeleton-cell" />
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="ak-range-grid__empty">
      <span class="ak-range-grid__empty-text">
        {{ t('operators.detail.range.noRange') }}
      </span>
    </div>

    <!-- Optional Legend -->
    <div v-if="showLegend && effectiveRange" class="ak-range-grid__legend">
      <div class="ak-range-grid__legend-item">
        <span class="ak-range-grid__legend-swatch ak-range-grid__legend-swatch--anchor" />
        <span class="ak-range-grid__legend-label">{{ t('operators.detail.range.anchor') }}</span>
      </div>
      <div class="ak-range-grid__legend-item">
        <span class="ak-range-grid__legend-swatch ak-range-grid__legend-swatch--attackable" />
        <span class="ak-range-grid__legend-label">{{
          t('operators.detail.range.attackable')
        }}</span>
      </div>
      <div class="ak-range-grid__legend-item">
        <span class="ak-range-grid__legend-swatch ak-range-grid__legend-swatch--empty" />
        <span class="ak-range-grid__legend-label">{{
          t('operators.detail.range.nonAttackable')
        }}</span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ak-range-grid {
  --cell-size: 26px;
  --cell-gap: 3px;
  --board-padding: 6px;

  display: inline-flex;
  flex-direction: column;
  gap: var(--space-2xs);
  min-width: 0;
  max-width: 100%;

  &--sm {
    --cell-size: 18px;
    --cell-gap: 2px;
    --board-padding: 4px;

    .ak-range-grid__id {
      font-size: 10px;
    }

    .ak-range-grid__dims {
      font-size: 9px;
    }
  }

  &--md {
    --cell-size: 26px;
    --cell-gap: 3px;
    --board-padding: 6px;
  }

  &--lg {
    --cell-size: 34px;
    --cell-gap: 4px;
    --board-padding: 8px;
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-xs);
    width: 100%;
    min-width: 0;
  }

  &__meta {
    display: flex;
    align-items: baseline;
    gap: var(--space-2xs);
    min-width: 0;
  }

  &__id {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    letter-spacing: var(--letter-spacing-mono);
    color: var(--color-text-primary);
    text-transform: uppercase;
  }

  &__dims {
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--color-text-secondary);
    letter-spacing: 0.04em;
  }

  &__badge {
    flex-shrink: 0;
  }

  &__board {
    display: grid;
    grid-template-columns: repeat(var(--range-cols, 1), var(--cell-size));
    grid-auto-rows: var(--cell-size);
    gap: var(--cell-gap);
    background-color: var(--color-bg-deep);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-xs);
    padding: var(--board-padding);
    width: fit-content;
    box-sizing: content-box;
    user-select: none;
  }

  // Row is display: contents so the cells map directly into the grid columns
  &__row {
    display: contents;
  }

  &__cell {
    position: relative;
    width: var(--cell-size);
    height: var(--cell-size);
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    border-radius: 1px;
    transition:
      background-color var(--transition-fast),
      border-color var(--transition-fast);

    &--attackable {
      background-color: rgb(255 157 43 / 16%);
      border: 1px solid rgb(255 157 43 / 50%);

      &:hover {
        background-color: rgb(255 157 43 / 28%);
        border-color: var(--color-accent-warning);
      }
    }

    &--empty {
      background-color: rgb(232 221 211 / 2%);
      border: 1px dashed rgb(232 221 211 / 10%);
    }

    &--anchor {
      border: 1.5px solid var(--color-accent-primary);
      box-shadow: 0 0 6px rgb(255 106 61 / 30%);
      z-index: 1;
    }

    // Crucial edge case: Besieger sniper '4-3' has dead zone at (row 2, col 0)
    &--dead-zone-anchor {
      background-color: rgb(255 106 61 / 10%);
      background-image: repeating-linear-gradient(
        45deg,
        transparent,
        transparent 3px,
        rgb(255 106 61 / 12%) 3px,
        rgb(255 106 61 / 12%) 6px
      );
      border: 1.5px dashed var(--color-accent-primary);
    }
  }

  // Modified variant accentuates attackable cells with Ember
  &--modified {
    .ak-range-grid__cell--attackable {
      background-color: rgb(255 106 61 / 18%);
      border-color: rgb(255 106 61 / 65%);

      &:hover {
        background-color: rgb(255 106 61 / 30%);
        border-color: var(--color-accent-primary);
      }
    }
  }

  &__anchor-marker {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-accent-primary);
    width: 80%;
    height: 80%;

    &--dead-zone {
      color: var(--color-accent-primary);
      filter: drop-shadow(0 0 2px rgb(255 106 61 / 70%));
    }
  }

  &__anchor-svg {
    width: 100%;
    height: 100%;
  }

  // Skeleton state
  &__skeleton {
    padding: var(--board-padding);
    background-color: var(--color-bg-deep);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-xs);
    width: fit-content;
  }

  &__skeleton-board {
    display: grid;
    grid-template-columns: repeat(3, var(--cell-size));
    gap: var(--cell-gap);
  }

  &__skeleton-cell {
    width: var(--cell-size);
    height: var(--cell-size);
    background-color: rgb(232 221 211 / 4%);
    border-radius: 1px;
    animation: ak-range-pulse 1.4s ease-in-out infinite;
  }

  // Empty state
  &__empty {
    padding: var(--space-xs) var(--space-sm);
    background-color: var(--color-bg-deep);
    border: 1px dashed var(--color-border-subtle);
    border-radius: var(--radius-xs);
    color: var(--color-text-secondary);
    font-size: var(--font-size-xs);
    font-family: var(--font-body);
  }

  // Legend
  &__legend {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs) var(--space-sm);
    margin-top: 2px;
  }

  &__legend-item {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  &__legend-swatch {
    width: 10px;
    height: 10px;
    border-radius: 1px;

    &--anchor {
      background-color: var(--color-bg-deep);
      border: 1.5px solid var(--color-accent-primary);
    }

    &--attackable {
      background-color: rgb(255 157 43 / 25%);
      border: 1px solid var(--color-accent-warning);
    }

    &--empty {
      background-color: rgb(232 221 211 / 3%);
      border: 1px dashed rgb(232 221 211 / 15%);
    }
  }

  &__legend-label {
    font-family: var(--font-body);
    font-size: 10px;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
}

@keyframes ak-range-pulse {
  0%,
  100% {
    opacity: 0.4;
  }

  50% {
    opacity: 0.8;
  }
}
</style>
