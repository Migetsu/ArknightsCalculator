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
  padding: 14px 16px;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-none);
  box-shadow: var(--shadow-panel);
  gap: var(--space-sm);

  @include mq(md) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
    min-width: 0;
  }

  &__header {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
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
    padding: 2px 8px;
    font-family: var(--font-body);
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-semibold);
    letter-spacing: var(--letter-spacing-caption);
    text-transform: uppercase;
    line-height: 1.2;
    background-color: var(--color-bg-deep);
    border: 1px solid var(--color-border-base);
    color: var(--color-text-secondary);
  }

  &__title {
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-semibold);
    color: var(--color-text-primary);
  }

  &__body {
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    line-height: 1.55;
    color: var(--color-text-secondary);
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-xs);
    width: 100%;

    @include mq(md) {
      width: auto;
      flex-shrink: 0;
    }
  }

  // Variant: Warning (Amber by DESIGN.md: background rgba(255,157,43,.08), border 1px solid rgba(255,157,43,.35))
  &--warning {
    background-color: rgb(255 157 43 / 8%);
    border-color: var(--color-border-amber);

    .ak-alert__title {
      color: var(--color-accent-warning);
    }

    .ak-alert__badge {
      border-color: var(--color-border-amber);
      color: var(--color-accent-warning);
    }
  }

  // Variant: Danger
  &--danger {
    background-color: rgb(255 138 92 / 8%);
    border-color: var(--color-border-danger);

    .ak-alert__title {
      color: var(--color-accent-ember-light);
    }

    .ak-alert__badge {
      border-color: var(--color-border-danger);
      color: var(--color-accent-ember-light);
    }
  }

  // Variant: Info
  &--info {
    background-color: rgb(255 217 168 / 6%);
    border-color: var(--color-border-bold);

    .ak-alert__title {
      color: var(--color-text-accent);
    }

    .ak-alert__badge {
      border-color: var(--color-border-bold);
      color: var(--color-text-accent);
    }
  }

  // Variant: Success
  &--success {
    background-color: rgb(143 209 158 / 8%);
    border-color: rgb(143 209 158 / 35%);

    .ak-alert__title {
      color: var(--color-accent-success);
    }

    .ak-alert__badge {
      border-color: rgb(143 209 158 / 35%);
      color: var(--color-accent-success);
    }
  }
}
</style>
