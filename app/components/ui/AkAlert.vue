<script setup lang="ts">
interface Props {
  variant?: 'info' | 'warning' | 'success' | 'danger'
  title?: string
  badge?: string
}

withDefaults(defineProps<Props>(), {
  variant: 'warning',
  title: undefined,
  badge: undefined,
})
</script>

<template>
  <div class="ak-alert" :class="`ak-alert--${variant}`" role="alert">
    <div class="ak-alert__strip" />
    <div class="ak-alert__content">
      <div v-if="badge || title || $slots.badge" class="ak-alert__header">
        <div class="ak-alert__badge-group">
          <slot name="badge">
            <span v-if="badge" class="ak-alert__badge">{{ badge }}</span>
          </slot>
          <span v-if="title" class="ak-alert__title">{{ title }}</span>
        </div>
      </div>

      <div class="ak-alert__body">
        <slot />
      </div>
    </div>

    <div v-if="$slots.actions" class="ak-alert__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ak-alert {
  display: flex;
  position: relative;
  flex-direction: column;
  border: 1px solid var(--color-border-subtle);
  background: linear-gradient(135deg, var(--color-bg-surface) 0%, var(--color-bg-card) 100%);
  box-shadow: var(--shadow-panel);

  @include cut-corner(8px, top-right);

  @include mq(md) {
    flex-direction: row;
    align-items: stretch;
  }

  &__strip {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    width: 5px;
    flex-shrink: 0;
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    padding: var(--space-md) var(--space-md) var(--space-sm) calc(var(--space-md) + 6px);
    flex: 1;
    min-width: 0;

    @include mq(md) {
      padding: var(--space-md);
      padding-left: calc(var(--space-md) + 6px);
    }
  }

  &__header {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }

  &__badge-group {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-xs);
  }

  &__badge {
    display: inline-flex;
    align-items: center;
    padding: var(--space-2xs) var(--space-xs);
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-bold);
    letter-spacing: var(--letter-spacing-mono);
    text-transform: uppercase;
    line-height: 1;
    white-space: nowrap;

    @include cut-corner(3px, top-right);
  }

  &__title {
    font-family: var(--font-heading);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-bold);
    letter-spacing: var(--letter-spacing-heading);
    text-transform: uppercase;
    color: var(--color-text-primary);
  }

  &__body {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    line-height: var(--line-height-relaxed);
  }

  &__actions {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-xs);
    padding: var(--space-sm) var(--space-md) var(--space-md) calc(var(--space-md) + 6px);
    border-top: 1px solid var(--color-border-subtle);
    flex-shrink: 0;

    @include mq(md) {
      padding: var(--space-md);
      border-top: none;
      border-left: 1px solid var(--color-border-subtle);
      justify-content: flex-end;
    }
  }

  // Variants
  &--info {
    border-color: rgb(0 240 255 / 35%);

    .ak-alert__strip {
      background-color: var(--color-accent-primary);
      box-shadow: 0 0 8px var(--color-accent-primary-glow);
    }

    .ak-alert__badge {
      background-color: var(--color-accent-primary-subtle);
      color: var(--color-accent-primary);
      border: 1px solid rgb(0 240 255 / 40%);
    }
  }

  &--warning {
    border-color: rgb(243 144 0 / 35%);

    .ak-alert__strip {
      @include hazard-stripes(var(--color-accent-warning), var(--color-bg-base), 6px);

      box-shadow: 0 0 8px var(--color-accent-warning-glow);
    }

    .ak-alert__badge {
      background-color: var(--color-accent-warning-subtle);
      color: var(--color-accent-warning);
      border: 1px solid rgb(243 144 0 / 40%);
    }
  }

  &--success {
    border-color: rgb(0 230 118 / 35%);

    .ak-alert__strip {
      background-color: var(--color-accent-success);
      box-shadow: 0 0 8px var(--color-accent-success-glow);
    }

    .ak-alert__badge {
      background-color: var(--color-accent-success-subtle);
      color: var(--color-accent-success);
      border: 1px solid rgb(0 230 118 / 40%);
    }
  }

  &--danger {
    border-color: rgb(255 42 77 / 35%);

    .ak-alert__strip {
      @include hazard-stripes(var(--color-accent-danger), var(--color-bg-base), 6px);

      box-shadow: 0 0 8px var(--color-accent-danger-glow);
    }

    .ak-alert__badge {
      background-color: var(--color-accent-danger-subtle);
      color: var(--color-accent-danger);
      border: 1px solid rgb(255 42 77 / 40%);
    }
  }
}
</style>
