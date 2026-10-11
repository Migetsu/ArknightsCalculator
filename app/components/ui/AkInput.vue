<script setup lang="ts">
interface Props {
  modelValue: string | number
  id?: string
  label?: string
  type?: string
  placeholder?: string
  error?: string
  disabled?: boolean
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  id: undefined,
  label: undefined,
  type: 'text',
  placeholder: undefined,
  error: undefined,
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
        :aria-describedby="error ? `${inputId}-error` : undefined"
        class="ak-input__native"
        @input="handleInput"
      />

      <span v-if="$slots.suffix" class="ak-input__suffix">
        <slot name="suffix" />
      </span>
    </div>

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
    font-family: var(--font-heading);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-medium);
    color: var(--color-text-secondary);
    letter-spacing: 0.05em;
    text-transform: uppercase;
  }

  &__field {
    display: flex;
    align-items: center;
    background-color: var(--color-bg-surface);
    border: 1px solid var(--color-border-base);
    transition:
      border-color var(--transition-fast),
      box-shadow var(--transition-fast);

    &:focus-within {
      border-color: var(--color-accent-primary);
      box-shadow: 0 0 0 1px var(--color-accent-primary);
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
      color: var(--color-text-muted);
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
    color: var(--color-text-muted);
  }

  &__error {
    font-size: var(--font-size-xs);
    color: var(--color-accent-danger);
    margin: 0;
  }

  &--error &__field {
    border-color: var(--color-accent-danger);

    &:focus-within {
      box-shadow: 0 0 0 1px var(--color-accent-danger);
    }
  }

  &--disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
}
</style>
