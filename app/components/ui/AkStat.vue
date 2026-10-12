<script setup lang="ts">
interface Props {
  label: string
  value: string | number
  subvalue?: string
  variant?: 'cyan' | 'amber' | 'green' | 'red' | 'neutral'
}

withDefaults(defineProps<Props>(), {
  subvalue: undefined,
  variant: 'neutral',
})
</script>

<template>
  <div class="ak-stat" :class="`ak-stat--${variant}`">
    <span class="ak-stat__label">{{ label }}</span>
    <div class="ak-stat__value-row">
      <span class="ak-stat__value">{{ value }}</span>
      <span v-if="subvalue" class="ak-stat__subvalue">{{ subvalue }}</span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ak-stat {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xs);
  padding: var(--space-sm) var(--space-md);
  border: 1px solid var(--color-border-subtle);
  background-color: var(--color-bg-surface);
  min-width: 0;

  &__label {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-semibold);
    letter-spacing: var(--letter-spacing-mono);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    line-height: 1.2;

    @include text-truncate;
  }

  &__value-row {
    display: flex;
    align-items: baseline;
    gap: var(--space-xs);
    min-width: 0;
  }

  &__value {
    font-family: var(--font-mono);
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    letter-spacing: 0.04em;
    color: var(--color-text-primary);
    text-transform: uppercase;
    line-height: 1.2;

    @include text-truncate;
  }

  &__subvalue {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-secondary);
    line-height: 1.2;

    @include text-truncate;
  }

  &--cyan {
    border-left: 2px solid var(--color-accent-primary);

    .ak-stat__value {
      color: var(--color-accent-primary);
    }
  }

  &--amber {
    border-left: 2px solid var(--color-accent-warning);

    .ak-stat__value {
      color: var(--color-accent-warning);
    }
  }

  &--green {
    border-left: 2px solid var(--color-accent-success);

    .ak-stat__value {
      color: var(--color-accent-success);
    }
  }

  &--red {
    border-left: 2px solid var(--color-accent-danger);

    .ak-stat__value {
      color: var(--color-accent-danger);
    }
  }

  &--neutral {
    border-left: 2px solid var(--color-border-bold);
  }
}
</style>
