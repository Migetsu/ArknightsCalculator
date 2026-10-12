<script setup lang="ts">
interface Props {
  tag?: string
  title?: string
  subtitle?: string
  badge?: string
  badgeVariant?: 'cyan' | 'amber' | 'green' | 'red' | 'neutral'
  lineColor?: 'cyan' | 'amber' | 'green' | 'red' | 'none'
  cutCorner?: 'top-left' | 'top-right' | 'bottom-right' | 'none'
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
  <section
    class="ak-panel"
    :class="[
      `ak-panel--${variant}`,
      `ak-panel--line-${lineColor}`,
      {
        'ak-panel--cut-top-left': cutCorner === 'top-left',
        'ak-panel--cut-top-right': cutCorner === 'top-right',
        'ak-panel--cut-bottom-right': cutCorner === 'bottom-right',
      },
    ]"
  >
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
  border: 1px solid var(--color-border-base);
  box-shadow: var(--shadow-panel);
  min-width: 0;

  &--line-cyan {
    border-top: 2px solid var(--color-accent-primary);
  }

  &--line-amber {
    border-top: 2px solid var(--color-accent-warning);
  }

  &--line-green {
    border-top: 2px solid var(--color-accent-success);
  }

  &--line-red {
    border-top: 2px solid var(--color-accent-danger);
  }

  &--surface {
    background-color: var(--color-bg-surface);
  }

  &--elevated {
    background-color: var(--color-bg-elevated);
  }

  &--base {
    background-color: var(--color-bg-base);
  }

  &--bordered {
    background-color: transparent;
    border-color: var(--color-border-bold);
  }

  &--cut-top-left {
    @include cut-corner(14px, top-left);
  }

  &--cut-top-right {
    @include cut-corner(14px, top-right);
  }

  &--cut-bottom-right {
    @include cut-corner(14px, bottom-right);
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    border-bottom: 1px solid var(--color-border-subtle);
    background-color: var(--color-bg-elevated);
    min-width: 0;
  }

  &__actions {
    flex-shrink: 0;
  }

  &__title-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
    min-width: 0;
    flex: 1;
  }

  &__tag {
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-bold);
    letter-spacing: var(--letter-spacing-mono);
    color: var(--color-accent-primary);
    text-transform: uppercase;
    line-height: 1.2;

    .ak-panel--line-amber & {
      color: var(--color-accent-warning);
    }

    .ak-panel--line-green & {
      color: var(--color-accent-success);
    }

    .ak-panel--line-red & {
      color: var(--color-accent-danger);
    }
  }

  &__title {
    font-family: var(--font-heading);
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    letter-spacing: var(--letter-spacing-heading);
    text-transform: uppercase;
    margin: 0;
    line-height: 1.2;

    @include text-truncate;
  }

  &__subtitle {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    margin: 0;

    @include text-truncate;
  }

  &__badge {
    display: inline-flex;
    align-items: center;
    padding: var(--space-2xs) var(--space-xs);
    font-family: var(--font-mono);
    font-size: var(--font-size-2xs);
    font-weight: var(--font-weight-semibold);
    letter-spacing: var(--letter-spacing-mono);
    text-transform: uppercase;
    border: 1px solid var(--color-border-subtle);
    background-color: var(--color-bg-subtle);
    color: var(--color-text-secondary);

    &--cyan {
      border-color: var(--color-accent-primary-subtle);
      background-color: var(--color-accent-primary-subtle);
      color: var(--color-accent-primary);
    }

    &--amber {
      border-color: var(--color-accent-warning-subtle);
      background-color: var(--color-accent-warning-subtle);
      color: var(--color-accent-warning);
    }

    &--green {
      border-color: var(--color-accent-success-subtle);
      background-color: var(--color-accent-success-subtle);
      color: var(--color-accent-success);
    }

    &--red {
      border-color: var(--color-accent-danger-subtle);
      background-color: var(--color-accent-danger-subtle);
      color: var(--color-accent-danger);
    }
  }

  &__body {
    padding: var(--space-md);
    flex: 1;
    color: var(--color-text-primary);
    min-width: 0;
  }

  &__footer {
    padding: var(--space-sm) var(--space-md);
    border-top: 1px solid var(--color-border-subtle);
    background-color: var(--color-bg-elevated);
    min-width: 0;
  }
}
</style>
