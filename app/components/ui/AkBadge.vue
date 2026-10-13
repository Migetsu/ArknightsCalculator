<script setup lang="ts">
interface Props {
  variant?: 'cyan' | 'amber' | 'green' | 'red' | 'neutral' | 'rarity'
  rarity?: 1 | 2 | 3 | 4 | 5 | 6
  size?: 'sm' | 'md'
  dot?: boolean
}

withDefaults(defineProps<Props>(), {
  variant: 'neutral',
  rarity: undefined,
  size: 'md',
  dot: false,
})
</script>

<template>
  <span
    class="ak-badge"
    :class="[
      `ak-badge--${variant}`,
      `ak-badge--size-${size}`,
      rarity ? `ak-badge--rarity-${rarity}` : null,
    ]"
  >
    <span v-if="dot" class="ak-badge__dot" aria-hidden="true" />
    <slot />
  </span>
</template>

<style lang="scss" scoped>
.ak-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2xs);
  font-family: var(--font-body);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-spacing-caption);
  text-transform: uppercase;
  line-height: 1;
  white-space: nowrap;
  border: 1px solid var(--color-border-base);
  background-color: var(--color-bg-deep);
  color: var(--color-text-secondary);
  border-radius: var(--radius-none);

  &__dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: currentcolor;
  }

  &--size-sm {
    padding: 3px 8px;
    font-size: var(--font-size-2xs);
  }

  &--size-md {
    padding: 4px 10px;
    font-size: var(--font-size-xs);
  }

  &--cyan {
    border-color: var(--color-border-bold);
    color: var(--color-text-accent);
  }

  &--amber {
    border-color: var(--color-border-amber);
    color: var(--color-accent-warning);
  }

  &--green {
    border-color: rgb(143 209 158 / 35%);
    color: var(--color-accent-success);
  }

  &--red {
    border-color: var(--color-border-danger);
    color: var(--color-accent-ember-light);
  }

  &--neutral {
    border-color: var(--color-border-base);
    color: var(--color-text-secondary);
  }

  &--rarity-1 {
    border-color: var(--color-rarity-1);
    color: var(--color-rarity-1);
  }

  &--rarity-2 {
    border-color: var(--color-rarity-2);
    color: var(--color-rarity-2);
  }

  &--rarity-3 {
    border-color: var(--color-rarity-3);
    color: var(--color-rarity-3);
  }

  &--rarity-4 {
    border-color: var(--color-rarity-4);
    color: var(--color-rarity-4);
  }

  &--rarity-5 {
    border-color: var(--color-rarity-5);
    color: var(--color-rarity-5);
  }

  &--rarity-6 {
    border-color: var(--color-rarity-6);
    color: var(--color-rarity-6);
  }
}
</style>
