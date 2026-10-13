<script setup lang="ts">
interface Props {
  tag?: string
  title?: string
  subtitle?: string
  badge?: string
  badgeVariant?: 'cyan' | 'amber' | 'green' | 'red' | 'neutral'
  lineColor?: 'cyan' | 'amber' | 'green' | 'red' | 'ember' | 'none'
  cutCorner?: 'top-left' | 'top-right' | 'bottom-right' | 'none' // Kept for API compatibility
  variant?: 'base' | 'surface' | 'elevated' | 'bordered'
}

withDefaults(defineProps<Props>(), {
  tag: undefined,
  title: undefined,
  subtitle: undefined,
  badge: undefined,
  badgeVariant: 'neutral',
  lineColor: 'none',
  cutCorner: 'none',
  variant: 'surface',
})
</script>

<template>
  <section class="ak-panel" :class="[`ak-panel--${variant}`, `ak-panel--line-${lineColor}`]">
    <header
      v-if="tag || title || subtitle || badge || $slots.header || $slots.actions"
      class="ak-panel__header"
    >
      <div class="ak-panel__title-group">
        <slot name="header">
          <div v-if="tag" class="ak-panel__tag">
            {{ tag }}
          </div>
          <h2 v-if="title" class="ak-panel__title">
            {{ title }}
          </h2>
          <p v-if="subtitle" class="ak-panel__subtitle">
            {{ subtitle }}
          </p>
        </slot>
      </div>

      <div class="ak-panel__actions">
        <slot name="actions">
          <span v-if="badge" class="ak-panel__badge" :class="`ak-panel__badge--${badgeVariant}`">
            {{ badge }}
          </span>
        </slot>
      </div>
    </header>

    <div class="ak-panel__body">
      <slot />
    </div>

    <footer v-if="$slots.footer" class="ak-panel__footer">
      <slot name="footer" />
    </footer>
  </section>
</template>

<style lang="scss" scoped>
.ak-panel {
  display: flex;
  flex-direction: column;
  position: relative;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-none);
  box-shadow: var(--shadow-panel);
  min-width: 0;

  // Variants
  &--base {
    background-color: var(--color-bg-deep);
  }

  &--surface {
    background-color: var(--color-bg-surface);
  }

  &--elevated {
    background-color: var(--color-bg-elevated);
    border-color: var(--color-border-base);
  }

  &--bordered {
    background-color: transparent;
    border-color: var(--color-border-bold);
  }

  // Accent edge indicators (left edge)
  &--line-ember {
    border-left: 3px solid var(--color-accent-primary);
  }

  &--line-amber {
    border-left: 3px solid var(--color-accent-warning);
  }

  &--line-cyan {
    border-left: 3px solid var(--color-accent-primary);
  }

  &--line-green {
    border-left: 3px solid var(--color-accent-success);
  }

  &--line-red {
    border-left: 3px solid var(--color-accent-danger);
  }

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-md);
    padding: var(--space-md) var(--space-lg);
    border-bottom: 1px solid var(--color-border-subtle);
  }

  &__title-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
    min-width: 0;
  }

  &__tag {
    font-family: var(--font-body);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-semibold);
    letter-spacing: var(--letter-spacing-caption);
    color: var(--color-text-accent);
    text-transform: uppercase;
    line-height: 1.2;
  }

  &__title {
    font-family: var(--font-display);
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    line-height: var(--line-height-tight);
    margin: 0;
  }

  &__subtitle {
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    color: var(--color-text-secondary);
    line-height: var(--line-height-base);
    margin: 0;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    flex-shrink: 0;
  }

  &__badge {
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    font-family: var(--font-body);
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-semibold);
    letter-spacing: var(--letter-spacing-mono);
    text-transform: uppercase;
    border: 1px solid var(--color-border-base);
    background-color: var(--color-bg-deep);
    color: var(--color-text-secondary);

    &--amber {
      border-color: var(--color-border-amber);
      color: var(--color-accent-warning);
    }

    &--green {
      border-color: var(--color-accent-success);
      color: var(--color-accent-success);
    }

    &--red {
      border-color: var(--color-border-danger);
      color: var(--color-accent-ember-light);
    }

    &--cyan {
      border-color: var(--color-accent-primary);
      color: var(--color-accent-primary);
    }
  }

  &__body {
    padding: var(--space-lg);
    flex: 1;
    min-width: 0;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-sm);
    padding: var(--space-md) var(--space-lg);
    border-top: 1px solid var(--color-border-subtle);
    background-color: rgb(0 0 0 / 15%);
  }
}
</style>
