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
  background-color: var(--color-bg-surface);
  box-shadow: var(--shadow-panel);

  @include mq(md) {
    flex-direction: row;
    align-items: stretch;
  }

  &__strip {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    width: 4px;
    flex-shrink: 0;
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    padding: var(--space-md) var(--space-md) var(--space-sm) calc(var(--space-md) + 4px);
    flex: 1;
    min-width: 0;

    @include mq(md) {
      padding: var(--space-md);
      padding-left: calc(var(--space-md) + 4px);
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
    padding: var(--space-sm) var(--space-md) var(--space-md) calc(var(--space-md) + 4px);
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
    border-color: rgb(0 229 255 / 25%);

    .ak-alert__strip {
      background-color: var(--color-accent-primary);
    }

    .ak-alert__badge {
      background-color: var(--color-accent-primary-subtle);
      color: var(--color-accent-primary);
      border: 1px solid rgb(0 229 255 / 30%);
    }
  }

  &--warning {
    border-color: rgb(255 152 0 / 25%);

    .ak-alert__strip {
      background-color: var(--color-accent-warning);
    }

    .ak-alert__badge {
      background-color: var(--color-accent-warning-subtle);
      color: var(--color-accent-warning);
      border: 1px solid rgb(255 152 0 / 30%);
    }
  }

  &--success {
    border-color: rgb(0 230 118 / 25%);

    .ak-alert__strip {
      background-color: var(--color-accent-success);
    }

    .ak-alert__badge {
      background-color: var(--color-accent-success-subtle);
      color: var(--color-accent-success);
      border: 1px solid rgb(0 230 118 / 30%);
    }
  }

  &--danger {
    border-color: rgb(255 23 68 / 25%);

    .ak-alert__strip {
      background-color: var(--color-accent-danger);
    }

    .ak-alert__badge {
      background-color: var(--color-accent-danger-subtle);
      color: var(--color-accent-danger);
      border: 1px solid rgb(255 23 68 / 30%);
    }
  }
}
</style>
