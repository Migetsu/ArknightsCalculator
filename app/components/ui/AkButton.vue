<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  type?: 'button' | 'submit' | 'reset'
  to?: string
  disabled?: boolean
  loading?: boolean
  cutCorner?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  type: 'button',
  to: undefined,
  disabled: false,
  loading: false,
  cutCorner: true,
})

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

function handleClick(event: MouseEvent): void {
  if (props.disabled || props.loading) {
    event.preventDefault()
    return
  }
  emit('click', event)
}
</script>

<template>
  <NuxtLink
    v-if="to && !disabled"
    :to="to"
    class="ak-button"
    :class="[
      `ak-button--${variant}`,
      `ak-button--${size}`,
      {
        'ak-button--cut': cutCorner,
        'ak-button--loading': loading,
      },
    ]"
    role="button"
    :aria-busy="loading ? 'true' : undefined"
    @click="handleClick"
  >
    <span v-if="loading" class="ak-button__spinner" aria-hidden="true" />
    <span v-if="$slots.icon" class="ak-button__icon">
      <slot name="icon" />
    </span>
    <span class="ak-button__content">
      <slot />
    </span>
  </NuxtLink>

  <button
    v-else
    :type="type"
    :disabled="disabled || loading"
    class="ak-button"
    :class="[
      `ak-button--${variant}`,
      `ak-button--${size}`,
      {
        'ak-button--cut': cutCorner,
        'ak-button--loading': loading,
        'ak-button--disabled': disabled,
      },
    ]"
    :aria-busy="loading ? 'true' : undefined"
    @click="handleClick"
  >
    <span v-if="loading" class="ak-button__spinner" aria-hidden="true" />
    <span v-if="$slots.icon" class="ak-button__icon">
      <slot name="icon" />
    </span>
    <span class="ak-button__content">
      <slot />
    </span>
  </button>
</template>

<style lang="scss" scoped>
.ak-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-xs);
  font-family: var(--font-heading);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  text-decoration: none;
  border: 1px solid transparent;
  cursor: pointer;
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast),
    box-shadow var(--transition-fast);
  user-select: none;
  white-space: nowrap;

  @include focus-ring;

  &--sm {
    padding: var(--space-2xs) var(--space-sm);
    font-size: var(--font-size-xs);
    height: 1.75rem;
  }

  &--md {
    padding: var(--space-xs) var(--space-md);
    font-size: var(--font-size-sm);
    height: 2.25rem;
  }

  &--lg {
    padding: var(--space-sm) var(--space-lg);
    font-size: var(--font-size-md);
    height: 2.75rem;
  }

  &--cut {
    @include cut-corner(8px, top-left);
  }

  &--primary {
    background-color: var(--color-accent-primary);
    color: var(--color-text-inverse);
    border-color: var(--color-accent-primary);

    &:hover:not(:disabled) {
      background-color: var(--color-accent-primary-hover);
      box-shadow: var(--shadow-glow-primary);
    }

    &:active:not(:disabled) {
      background-color: var(--color-accent-primary-active);
    }
  }

  &--ghost {
    background-color: transparent;
    color: var(--color-text-primary);
    border-color: var(--color-border-base);

    &:hover:not(:disabled) {
      background-color: var(--color-bg-subtle);
      border-color: var(--color-accent-primary);
      color: var(--color-accent-primary);
    }

    &:active:not(:disabled) {
      background-color: var(--color-accent-primary-subtle);
    }
  }

  &--danger {
    background-color: var(--color-accent-danger);
    color: var(--color-text-primary);
    border-color: var(--color-accent-danger);

    &:hover:not(:disabled) {
      background-color: var(--color-accent-danger-hover);
      box-shadow: var(--shadow-glow-danger);
    }
  }

  &--disabled,
  &:disabled {
    cursor: not-allowed;
    opacity: 0.45;
    box-shadow: none;
  }

  &--loading {
    cursor: wait;
    opacity: 0.8;
  }

  &__icon {
    display: inline-flex;
    align-items: center;
  }

  &__content {
    display: inline-flex;
    align-items: center;
  }

  &__spinner {
    width: 0.875rem;
    height: 0.875rem;
    border: 2px solid currentcolor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: ak-spinner-spin 600ms linear infinite;
  }
}

@keyframes ak-spinner-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
