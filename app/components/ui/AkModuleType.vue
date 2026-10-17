<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  type?: string
  size?: 'xs' | 'sm' | 'md'
}

const props = withDefaults(defineProps<Props>(), {
  type: undefined,
  size: 'xs',
})

const { t } = useI18n()

const displayType = computed(() => {
  if (!props.type) return ''
  const trimmed = props.type.trim()
  if (trimmed.toUpperCase() === 'D') return 'Δ'
  if (trimmed.toLowerCase() === 'alpha' || trimmed === 'α') return 'α'
  return trimmed.toUpperCase()
})

const typeClass = computed(() => {
  if (displayType.value === 'Δ') return 'delta'
  if (displayType.value === 'α') return 'alpha'
  return displayType.value.toLowerCase().replace(/[^a-z0-9]/g, '-')
})

const accessibleLabel = computed(() => {
  if (!displayType.value) return ''
  const readable = displayType.value === 'Δ' ? t('modules.typeDelta') : displayType.value
  return t('modules.typeLabel', { type: readable })
})
</script>

<template>
  <span
    v-if="displayType"
    class="ak-module-type"
    :class="[`ak-module-type--size-${size}`, `ak-module-type--${typeClass}`]"
    :title="accessibleLabel"
    :aria-label="accessibleLabel"
  >
    <span class="ak-module-type__glyph" aria-hidden="true">{{ displayType }}</span>
  </span>
</template>

<style lang="scss" scoped>
.ak-module-type {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display);
  font-weight: var(--font-weight-bold);
  line-height: 1;
  text-transform: uppercase;
  user-select: none;
  white-space: nowrap;
  vertical-align: middle;
  border-radius: var(--radius-none);

  // Ember Editorial flat badge style
  background-color: var(--color-accent-primary-subtle);
  border: 1px solid var(--color-accent-primary);
  color: var(--color-accent-primary);

  &__glyph {
    line-height: 1;
  }

  &--size-xs {
    padding: 1px 4px;
    font-size: var(--font-size-2xs);
    letter-spacing: 0.05em;
  }

  &--size-sm {
    padding: 2px 6px;
    font-size: var(--font-size-xs);
    letter-spacing: 0.06em;
  }

  &--size-md {
    padding: 3px 8px;
    font-size: var(--font-size-sm);
    letter-spacing: 0.08em;
  }

  &--x {
    border-color: var(--color-accent-warning);
    color: var(--color-accent-warning);
    background-color: var(--color-accent-warning-subtle);
  }

  &--y {
    border-color: var(--color-accent-cyan, #00e5ff);
    color: var(--color-accent-cyan, #00e5ff);
    background-color: rgb(0 229 255 / 10%);
  }

  &--delta {
    border-color: var(--color-accent-primary);
    color: var(--color-accent-primary);
    background-color: var(--color-accent-primary-subtle);
  }

  &--a {
    border-color: var(--color-accent-amber);
    color: var(--color-accent-amber);
    background-color: var(--color-accent-warning-subtle);
  }

  &--b {
    border-color: var(--color-accent-cyan, #00e5ff);
    color: var(--color-accent-cyan, #00e5ff);
    background-color: rgb(0 229 255 / 10%);
  }

  &--sp,
  &--alpha {
    border-color: var(--color-accent-primary);
    color: var(--color-accent-primary);
    background-color: var(--color-accent-primary-subtle);
  }
}
</style>
