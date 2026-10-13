<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue: string | number
  id?: string
  label?: string
  type?: string
  placeholder?: string
  error?: string
  hint?: string
  disabled?: boolean
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  id: undefined,
  label: undefined,
  type: 'text',
  placeholder: undefined,
  error: undefined,
  hint: undefined,
  disabled: false,
  readonly: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const generatedId = useId()
const inputId = computed<string>(() => props.id ?? `ak-input-${generatedId}`)

function handleInput(event: Event): void {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <div
    class="ak-input"
    :class="{
      'ak-input--error': !!error,
      'ak-input--disabled': disabled,
    }"
  >
    <label v-if="label" :for="inputId" class="ak-input__label">
      {{ label }}
    </label>

    <div class="ak-input__field">
      <span v-if="$slots.prefix" class="ak-input__prefix">
        <slot name="prefix" />
      </span>

      <input
        :id="inputId"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :aria-invalid="!!error"
        :aria-describedby="error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined"
        class="ak-input__native"
        @input="handleInput"
      />

      <span v-if="$slots.suffix" class="ak-input__suffix">
        <slot name="suffix" />
      </span>
    </div>

    <p v-if="hint && !error" :id="`${inputId}-hint`" class="ak-input__hint">
      {{ hint }}
    </p>

    <p v-if="error" :id="`${inputId}-error`" class="ak-input__error" role="alert">
      {{ error }}
    </p>
  </div>
</template>

<style lang="scss" scoped>
.ak-input {
  display: flex;
  flex-direction: column;
  gap: 6px;

  &__label {
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-secondary);
    letter-spacing: var(--letter-spacing-caption);
    text-transform: uppercase;
  }

  &__field {
    display: flex;
    align-items: center;
    position: relative;
    background-color: var(--color-bg-deep);
    border: 1px solid var(--color-border-bold);
    border-radius: var(--radius-none);
    transition:
      border-color var(--transition-fast),
      box-shadow var(--transition-fast);

    &:focus-within {
      border-color: var(--color-text-accent);
      outline: 1px solid var(--color-text-accent);
    }
  }

  &__prefix,
  &__suffix {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 var(--space-xs);
    color: var(--color-text-secondary);
  }

  &__native {
    flex: 1;
    min-width: 0;
    padding: 11px 14px;
    background: transparent;
    border: none;
    color: var(--color-text-primary);
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    line-height: var(--line-height-base);

    &::placeholder {
      color: var(--color-text-dim);
    }

    &:focus {
      outline: none;
    }

    &:disabled {
      cursor: not-allowed;
      color: var(--color-text-dim);
    }
  }

  &__hint {
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    line-height: 1.4;
    margin: 0;
  }

  &__error {
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    color: var(--color-accent-ember-light);
    line-height: 1.4;
    margin: 0;
  }

  &--error &__field {
    border-color: var(--color-accent-ember-light);
  }

  &--disabled {
    opacity: 0.45;
  }
}
</style>
