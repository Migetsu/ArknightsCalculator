<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'outline' | 'gold-outline' | 'danger' | 'ghost' | 'secondary' | 'warning'
  size?: 'sm' | 'md' | 'lg'
  type?: 'button' | 'submit' | 'reset'
  to?: string
  disabled?: boolean
  loading?: boolean
  cutCorner?: boolean // Kept for API compatibility, renders flat border-radius in Ember Editorial
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  type: 'button',
  to: undefined,
  disabled: false,
  loading: false,
  cutCorner: false,
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
  font-family: var(--font-body);
  font-weight: var(--font-weight-semibold);
  font-size: var(--font-size-sm);
  text-decoration: none;
  border: 1px solid transparent;
  border-radius: var(--radius-none);
  cursor: pointer;
  position: relative;
  user-select: none;
  white-space: nowrap;
  transition:
    background-color var(--transition-fast),
    border-color var(--transition-fast),
    color var(--transition-fast),
    opacity var(--transition-fast);

  @include focus-ring;

  &--sm {
    padding: 7px var(--space-sm);
    font-size: var(--font-size-xs);
    min-height: 2rem;
  }

  &--md {
    padding: 11px var(--space-md);
    font-size: var(--font-size-sm);
    min-height: 2.5rem;
  }

  &--lg {
    padding: 13px 26px;
    font-size: 0.9375rem; // 15px
    min-height: 3rem;
  }

  // Primary: Ember #ff6a3d fill with dark text #120d0b
  &--primary {
    background-color: var(--color-accent-primary);
    border-color: var(--color-accent-primary);
    color: var(--color-text-inverse);

    &:hover:not(:disabled, .ak-button--disabled) {
      background-color: var(--color-accent-primary-hover);
      border-color: var(--color-accent-primary-hover);
    }

    &:active:not(:disabled, .ak-button--disabled) {
      background-color: var(--color-accent-primary-active);
      border-color: var(--color-accent-primary-active);
    }
  }

  // Outline: Transparent with border rgba(232,221,211,.3) and text #e8ddd3
  &--outline,
  &--secondary {
    background-color: transparent;
    border-color: var(--color-border-bold);
    color: var(--color-text-primary);

    &:hover:not(:disabled, .ak-button--disabled) {
      border-color: var(--color-text-accent);
      color: var(--color-text-accent);
    }

    &:active:not(:disabled, .ak-button--disabled) {
      background-color: rgb(232 221 211 / 6%);
    }
  }

  // Gold Outline: border rgba(255,217,168,.4) and text #ffd9a8
  &--gold-outline {
    background-color: transparent;
    border-color: var(--color-border-gold);
    color: var(--color-text-accent);

    &:hover:not(:disabled, .ak-button--disabled) {
      background-color: rgb(255 217 168 / 8%);
      border-color: var(--color-text-accent);
    }

    &:active:not(:disabled, .ak-button--disabled) {
      background-color: rgb(255 217 168 / 14%);
    }
  }

  // Danger: border rgba(255,138,92,.5) and text #ff8a5c
  &--danger {
    background-color: transparent;
    border-color: var(--color-border-danger);
    color: var(--color-accent-ember-light);

    &:hover:not(:disabled, .ak-button--disabled) {
      background-color: rgb(255 138 92 / 10%);
      border-color: var(--color-accent-ember-light);
    }

    &:active:not(:disabled, .ak-button--disabled) {
      background-color: rgb(255 138 92 / 18%);
    }
  }

  // Warning: amber border and text
  &--warning {
    background-color: transparent;
    border-color: var(--color-border-amber);
    color: var(--color-accent-warning);

    &:hover:not(:disabled, .ak-button--disabled) {
      background-color: rgb(255 157 43 / 10%);
    }
  }

  // Ghost: transparent, text #a8978a, hover #ffd9a8
  &--ghost {
    background-color: transparent;
    border-color: transparent;
    color: var(--color-text-secondary);

    &:hover:not(:disabled, .ak-button--disabled) {
      color: var(--color-text-accent);
      background-color: rgb(232 221 211 / 5%);
    }

    &:active:not(:disabled, .ak-button--disabled) {
      background-color: rgb(232 221 211 / 10%);
    }
  }

  // Disabled state
  &:disabled,
  &--disabled {
    cursor: not-allowed;
    opacity: 0.4;
    pointer-events: none;
  }

  // Loading spinner
  &__spinner {
    width: 14px;
    height: 14px;
    border: 2px solid currentcolor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: ak-btn-spin 600ms linear infinite;

    @include reduced-motion;
  }

  &__icon {
    display: inline-flex;
    align-items: center;
  }

  &__content {
    display: inline-flex;
    align-items: center;
  }
}

@keyframes ak-btn-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
