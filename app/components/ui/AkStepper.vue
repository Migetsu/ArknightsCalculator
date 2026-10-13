<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue: number
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  ariaLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  min: 0,
  max: 999999,
  step: 1,
  disabled: false,
  ariaLabel: 'Quantity',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
}>()

const canDecrement = computed(() => !props.disabled && props.modelValue > props.min)
const canIncrement = computed(() => !props.disabled && props.modelValue < props.max)

function decrement(): void {
  if (!canDecrement.value) return
  const next = Math.max(props.min, props.modelValue - props.step)
  emit('update:modelValue', next)
}

function increment(): void {
  if (!canIncrement.value) return
  const next = Math.min(props.max, props.modelValue + props.step)
  emit('update:modelValue', next)
}

function handleInput(event: Event): void {
  const target = event.target as HTMLInputElement
  const parsed = parseInt(target.value, 10)
  if (Number.isNaN(parsed)) {
    emit('update:modelValue', props.min)
  } else {
    const clamped = Math.min(props.max, Math.max(props.min, parsed))
    emit('update:modelValue', clamped)
  }
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    increment()
  } else if (event.key === 'ArrowDown') {
    event.preventDefault()
    decrement()
  }
}
</script>

<template>
  <span class="ak-stepper" :class="{ 'ak-stepper--disabled': disabled }">
    <button
      type="button"
      class="ak-stepper__btn ak-stepper__btn--dec"
      :aria-label="`Decrease ${ariaLabel}`"
      :disabled="!canDecrement"
      @click="decrement"
    >
      &minus;
    </button>

    <input
      type="number"
      class="ak-stepper__input"
      :value="modelValue"
      :min="min"
      :max="max"
      :step="step"
      :disabled="disabled"
      :aria-label="ariaLabel"
      @input="handleInput"
      @keydown="handleKeydown"
    />

    <button
      type="button"
      class="ak-stepper__btn ak-stepper__btn--inc"
      :aria-label="`Increase ${ariaLabel}`"
      :disabled="!canIncrement"
      @click="increment"
    >
      +
    </button>
  </span>
</template>

<style lang="scss" scoped>
.ak-stepper {
  display: inline-flex;
  align-items: stretch;
  background-color: var(--color-bg-deep);
  border: 1px solid var(--color-border-bold);
  border-radius: var(--radius-none);
  user-select: none;

  &__btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    padding: 0;
    background-color: var(--color-bg-elevated);
    border: none;
    color: var(--color-text-accent);
    font-family: var(--font-body);
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-semibold);
    cursor: pointer;
    transition:
      background-color var(--transition-fast),
      color var(--transition-fast);

    &:hover:not(:disabled) {
      background-color: var(--color-accent-primary);
      color: var(--color-text-inverse);
    }

    &:focus-visible {
      outline: 2px solid var(--color-text-accent);
      outline-offset: -2px;
      z-index: 1;
    }

    &:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
  }

  &__input {
    width: 56px;
    min-width: 0;
    margin: 0;
    padding: 6px 4px;
    text-align: center;
    background-color: transparent;
    border: none;
    border-left: 1px solid var(--color-border-base);
    border-right: 1px solid var(--color-border-base);
    color: var(--color-text-primary);
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);

    // Hide native number spinner arrows
    appearance: textfield;
    /* stylelint-disable-next-line property-no-vendor-prefix */
    -moz-appearance: textfield;

    &::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button {
      /* stylelint-disable-next-line property-no-vendor-prefix */
      -webkit-appearance: none;
      margin: 0;
    }

    &:focus-visible {
      outline: 2px solid var(--color-text-accent);
      outline-offset: -2px;
      z-index: 1;
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  }

  &--disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}
</style>
