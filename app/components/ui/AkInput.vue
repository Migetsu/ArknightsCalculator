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
  gap: var(--space-2xs);

  &__label {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-secondary);
    letter-spacing: var(--letter-spacing-mono);
    text-transform: uppercase;
  }

  &__field {
    display: flex;
    align-items: center;
    background-color: var(--color-bg-surface);
    border: 1px solid var(--color-border-bold);
    clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%);
    transition:
      border-color var(--transition-fast),
      box-shadow var(--transition-fast);

    &:focus-within {
      border-color: var(--color-accent-primary);
      box-shadow:
        0 0 12px rgb(0 240 255 / 30%),
        inset 0 0 6px rgb(0 240 255 / 10%);
    }
  }

  &__native {
    flex: 1;
    width: 100%;
    padding: var(--space-xs) var(--space-md);
    background: transparent;
    border: none;
    color: var(--color-text-primary);
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    outline: none;

    &::placeholder {
      color: var(--color-text-tertiary);
      opacity: 0.8;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
  }

  &__prefix,
  &__suffix {
    display: inline-flex;
    align-items: center;
    padding: 0 var(--space-xs);
    color: var(--color-accent-primary);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
  }

  &__hint {
    font-size: var(--font-size-2xs);
    color: var(--color-text-secondary);
    margin: 0;
  }

  &__error {
    font-size: var(--font-size-xs);
    color: var(--color-accent-danger);
    margin: 0;
    font-family: var(--font-mono);
  }

  &--error &__field {
    border-color: var(--color-accent-danger);

    &:focus-within {
      box-shadow: 0 0 12px rgb(255 42 77 / 35%);
    }
  }

  &--disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
}
</style>
