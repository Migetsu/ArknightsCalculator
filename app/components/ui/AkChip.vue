<script setup lang="ts">
interface Props {
  modelValue?: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'click', event: MouseEvent): void
}>()

function toggle(event: MouseEvent): void {
  if (props.disabled) return
  emit('update:modelValue', !props.modelValue)
  emit('click', event)
}
</script>

<template>
  <button
    type="button"
    class="ak-chip"
    :class="{
      'ak-chip--active': modelValue,
      'ak-chip--disabled': disabled,
    }"
    :aria-pressed="modelValue"
    :disabled="disabled"
    @click="toggle"
  >
    <slot />
  </button>
</template>

<style lang="scss" scoped>
.ak-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  padding: 7px 14px;
  font-family: var(--font-body);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.04em;
  background-color: var(--color-bg-deep);
  border: 1px solid var(--color-border-bold);
  border-radius: var(--radius-none);
  color: var(--color-text-primary);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast);

  @include focus-ring;

  &:hover:not(:disabled, .ak-chip--disabled) {
    border-color: var(--color-text-accent);
    color: var(--color-text-accent);
  }

  &--active {
    background-color: var(--color-accent-primary);
    border-color: var(--color-accent-primary);
    color: var(--color-text-inverse);

    &:hover:not(:disabled, .ak-chip--disabled) {
      background-color: var(--color-accent-primary-hover);
      border-color: var(--color-accent-primary-hover);
      color: var(--color-text-inverse);
    }
  }

  &--disabled {
    opacity: 0.4;
    cursor: not-allowed;
    pointer-events: none;
  }
}
</style>
