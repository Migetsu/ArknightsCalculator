<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  value: number
  max?: number
  variant?: 'cyan' | 'amber' | 'green'
  label?: string
  showPercentage?: boolean
  segments?: number
}

const props = withDefaults(defineProps<Props>(), {
  max: 100,
  variant: 'cyan',
  label: undefined,
  showPercentage: false,
  segments: 3,
})

const percentage = computed(() => {
  if (props.max <= 0) return 0
  const pct = Math.round((props.value / props.max) * 100)
  return Math.min(100, Math.max(0, pct))
})
</script>

<template>
  <div class="ak-progress" :class="`ak-progress--${variant}`">
    <div v-if="label || showPercentage" class="ak-progress__header">
      <span v-if="label" class="ak-progress__label">{{ label }}</span>
      <span v-if="showPercentage" class="ak-progress__percentage"> {{ percentage }}% </span>
    </div>

    <div
      class="ak-progress__track"
      role="progressbar"
      :aria-valuenow="value"
      :aria-valuemin="0"
      :aria-valuemax="max"
    >
      <div class="ak-progress__fill" :style="{ width: `${percentage}%` }" />

      <div v-if="segments > 1" class="ak-progress__grid" aria-hidden="true">
        <span
          v-for="index in segments - 1"
          :key="index"
          class="ak-progress__divider"
          :style="{ left: `${(index / segments) * 100}%` }"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ak-progress {
  display: flex;
  flex-direction: column;
  gap: var(--space-2xs);
  width: 100%;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-semibold);
    letter-spacing: var(--letter-spacing-mono);
    text-transform: uppercase;
    color: var(--color-text-secondary);
  }

  &__label {
    line-height: 1;
  }

  &__percentage {
    color: var(--color-text-primary);
    line-height: 1;
    font-weight: var(--font-weight-bold);
  }

  &__track {
    position: relative;
    height: 8px;
    background-color: var(--color-bg-base);
    border: 1px solid var(--color-border-bold);
    overflow: hidden;
  }

  &__fill {
    height: 100%;
    transition: width var(--transition-base);

    @include reduced-motion;
  }

  &__grid {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  &__divider {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background-color: var(--color-bg-surface);
  }

  // Variants
  &--cyan {
    .ak-progress__fill {
      background-color: var(--color-accent-primary);
      box-shadow: 0 0 10px var(--color-accent-primary-glow);
    }

    .ak-progress__percentage {
      color: var(--color-accent-primary);
    }
  }

  &--amber {
    .ak-progress__fill {
      background-color: var(--color-accent-warning);
      box-shadow: 0 0 10px var(--color-accent-warning-glow);
    }

    .ak-progress__percentage {
      color: var(--color-accent-warning);
    }
  }

  &--green {
    .ak-progress__fill {
      background-color: var(--color-accent-success);
      box-shadow: 0 0 10px var(--color-accent-success-glow);
    }

    .ak-progress__percentage {
      color: var(--color-accent-success);
    }
  }
}
</style>
