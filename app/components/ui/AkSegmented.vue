<script setup lang="ts" generic="T extends string | number = string">
export interface SegmentOption<TVal extends string | number = string> {
  value: TVal
  label: string
  disabled?: boolean
}

interface Props<TVal extends string | number = string> {
  modelValue: TVal
  options: SegmentOption<TVal>[]
  ariaLabel?: string
  disabled?: boolean
  size?: 'sm' | 'md'
}

const props = withDefaults(defineProps<Props<T>>(), {
  ariaLabel: 'Segmented control',
  disabled: false,
  size: 'md',
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: T): void
}>()

function select(val: T): void {
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
        'ak-segmented__btn--sm': size === 'sm',
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
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 1 1 auto;
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

    &--sm {
      padding: 8px 6px;
      font-size: var(--font-size-xs, 12px);
      flex: 1 1 50%;
      min-width: 0;
    }

    &--disabled {
      opacity: 0.35;
      cursor: not-allowed;
      pointer-events: none;
    }
  }
}
</style>
