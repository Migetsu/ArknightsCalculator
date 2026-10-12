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
  font-family: var(--font-mono);
  font-weight: var(--font-weight-semibold);
  letter-spacing: var(--letter-spacing-mono);
  text-transform: uppercase;
  line-height: 1;
  white-space: nowrap;
  border: 1px solid var(--color-border-subtle);
  background-color: var(--color-bg-subtle);
  color: var(--color-text-secondary);
  clip-path: polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px));

  &__dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background-color: currentcolor;
    box-shadow: 0 0 6px currentcolor;
  }

  &--size-sm {
    padding: 0.125rem var(--space-xs);
    font-size: var(--font-size-2xs);
  }

  &--size-md {
    padding: var(--space-2xs) var(--space-xs);
    font-size: var(--font-size-xs);
  }

  &--cyan {
    border-color: rgb(0 229 255 / 30%);
    background-color: var(--color-accent-primary-subtle);
    color: var(--color-accent-primary);
  }

  &--amber {
    border-color: rgb(255 152 0 / 30%);
    background-color: var(--color-accent-warning-subtle);
    color: var(--color-accent-warning);
  }

  &--green {
    border-color: rgb(0 230 118 / 30%);
    background-color: var(--color-accent-success-subtle);
    color: var(--color-accent-success);
  }

  &--red {
    border-color: rgb(255 23 68 / 30%);
    background-color: var(--color-accent-danger-subtle);
    color: var(--color-accent-danger);
  }

  &--neutral {
    border-color: var(--color-border-base);
    background-color: var(--color-bg-elevated);
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
    background-color: rgb(255 171 0 / 12%);
    color: var(--color-rarity-5);
  }

  &--rarity-6 {
    border-color: var(--color-rarity-6);
    background-color: rgb(255 109 0 / 14%);
    color: var(--color-rarity-6-gold);
    box-shadow: 0 0 6px rgb(255 109 0 / 25%);
  }
}
</style>
