<script setup lang="ts">
interface Props {
  label: string
  value: string | number
  subvalue?: string
  variant?: 'cyan' | 'amber' | 'green' | 'red' | 'ember' | 'neutral'
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
  padding: 18px 20px;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-none);
  min-width: 0;

  &__label {
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
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
    margin-top: 4px;
  }

  &__value {
    font-family: var(--font-display);
    font-size: var(--font-size-3xl); // 32px
    font-weight: var(--font-weight-bold); // 800
    color: var(--color-text-primary);
    line-height: 1.1;

    @include text-truncate;
  }

  &__subvalue {
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-regular);
    color: var(--color-text-secondary);
    line-height: 1.2;

    @include text-truncate;
  }

  &--ember,
  &--cyan {
    .ak-stat__value {
      color: var(--color-accent-primary);
    }
  }

  &--amber {
    .ak-stat__value {
      color: var(--color-accent-warning);
    }
  }

  &--green {
    .ak-stat__value {
      color: var(--color-accent-success);
    }
  }

  &--red {
    .ak-stat__value {
      color: var(--color-accent-danger);
    }
  }
}
</style>
