<script setup lang="ts">
export interface SegmentOption<T extends string | number = string> {
  value: T
  label: string
  disabled?: boolean
}

interface Props<T extends string | number = string> {
  modelValue: T
  options: SegmentOption<T>[]
  ariaLabel?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  ariaLabel: 'Segmented control',
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void
}>()

function select(val: string | number): void {
  if (props.disabled) return
  emit('update:modelValue', val)
}
</script>

<template>
  <div class="ak-segmented" role="group" :aria-label="ariaLabel">
    <button
      v-for="opt in options"
      :key="String(opt.value)"
      type="button"
      class="ak-segmented__btn"
      :class="{
        'ak-segmented__btn--active': opt.value === modelValue,
        'ak-segmented__btn--disabled': opt.disabled || disabled,
      }"
      :aria-pressed="opt.value === modelValue"
      :disabled="opt.disabled || disabled"
      @click="select(opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<style lang="scss" scoped>
.ak-segmented {
  display: inline-flex;
  align-items: stretch;
  background-color: var(--color-bg-deep);
  border: 1px solid var(--color-border-bold);
  border-radius: var(--radius-none);
  padding: 0;

  &__btn {
    padding: 10px 22px;
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
    background-color: transparent;
    border: none;
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
    transition:
      background-color var(--transition-fast),
      color var(--transition-fast);

    @include focus-ring;

    &:not(:last-child) {
      border-right: 1px solid var(--color-border-base);
    }

    &:hover:not(:disabled, .ak-segmented__btn--active) {
      color: var(--color-text-accent);
      background-color: rgb(232 221 211 / 4%);
    }

    &--active {
      background-color: var(--color-accent-primary);
      color: var(--color-text-inverse);

      &:hover:not(:disabled) {
        background-color: var(--color-accent-primary-hover);
        color: var(--color-text-inverse);
      }
    }

    &--disabled {
      opacity: 0.35;
      cursor: not-allowed;
      pointer-events: none;
    }
  }
}
</style>
