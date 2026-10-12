<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
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
  font-family: var(--font-mono);
  font-weight: var(--font-weight-bold);
  letter-spacing: var(--letter-spacing-mono);
  text-transform: uppercase;
  text-decoration: none;
  border: 1px solid transparent;
  cursor: pointer;
  position: relative;
  user-select: none;
  white-space: nowrap;
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast),
    box-shadow var(--transition-fast),
    filter var(--transition-fast);

  @include focus-ring;

  &--cut {
    @include cut-corner(8px, bottom-right);
    @include focus-ring-clipped;
  }

  &--sm {
    padding: var(--space-2xs) var(--space-sm);
    font-size: var(--font-size-xs);
    height: 1.875rem;
  }

  &--md {
    padding: var(--space-xs) var(--space-md);
    font-size: var(--font-size-xs);
    height: 2.25rem;
  }

  &--lg {
    padding: var(--space-sm) var(--space-lg);
    font-size: var(--font-size-sm);
    height: 2.75rem;
  }

  // Primary: solid cyan fill with dark text
  &--primary {
    background-color: var(--color-accent-primary);
    border-color: var(--color-accent-primary);
    color: var(--color-text-inverse);

    &:hover:not(:disabled, .ak-button--disabled) {
      background-color: var(--color-accent-primary-hover);
      border-color: var(--color-accent-primary-hover);
      box-shadow: var(--shadow-glow-cyan);
    }

    &:active:not(:disabled, .ak-button--disabled) {
      background-color: var(--color-accent-primary-active);
    }
  }

  // Secondary: outlined cyan / tactical outline
  &--secondary {
    background-color: transparent;
    border-color: var(--color-accent-primary);
    color: var(--color-accent-primary);

    &:hover:not(:disabled, .ak-button--disabled) {
      background-color: var(--color-accent-primary-subtle);
      box-shadow: var(--shadow-glow-cyan);
    }

    &:active:not(:disabled, .ak-button--disabled) {
      background-color: rgb(0 229 255 / 20%);
    }
  }

  // Ghost: subtle transparent
  &--ghost {
    background-color: transparent;
    border-color: var(--color-border-subtle);
    color: var(--color-text-primary);

    &:hover:not(:disabled, .ak-button--disabled) {
      background-color: var(--color-bg-subtle);
      border-color: var(--color-border-base);
    }
  }

  // Danger: solid or bordered combat red
  &--danger {
    background-color: var(--color-accent-danger);
    border-color: var(--color-accent-danger);
    color: var(--color-text-primary);

    &:hover:not(:disabled, .ak-button--disabled) {
      background-color: var(--color-accent-danger-hover);
      border-color: var(--color-accent-danger-hover);
      box-shadow: var(--shadow-glow-danger);
    }

    &:active:not(:disabled, .ak-button--disabled) {
      background-color: var(--color-accent-danger-active);
    }
  }

  &--disabled,
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    pointer-events: none;
    box-shadow: none !important;
  }

  &--loading {
    cursor: wait;
    opacity: 0.8;
  }

  &__content {
    display: inline-flex;
    align-items: center;
    line-height: 1;
  }

  &__icon {
    display: inline-flex;
    align-items: center;
    line-height: 1;
  }

  &__spinner {
    display: inline-block;
    width: 0.875rem;
    height: 0.875rem;
    border: 2px solid currentcolor;
    border-right-color: transparent;
    border-radius: 50%;
    animation: ak-button-spin 0.6s linear infinite;

    @include reduced-motion;
  }
}

@keyframes ak-button-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>
