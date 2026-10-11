<script setup lang="ts">
interface Props {
  title?: string
  subtitle?: string
  cutCorner?: 'top-left' | 'top-right' | 'bottom-right' | 'none'
  variant?: 'base' | 'surface' | 'bordered'
}

withDefaults(defineProps<Props>(), {
  title: undefined,
  subtitle: undefined,
  cutCorner: 'top-left',
  variant: 'surface',
})
</script>

<template>
  <section
    class="ak-panel"
    :class="[
      `ak-panel--${variant}`,
      {
        'ak-panel--cut-top-left': cutCorner === 'top-left',
        'ak-panel--cut-top-right': cutCorner === 'top-right',
        'ak-panel--cut-bottom-right': cutCorner === 'bottom-right',
      },
    ]"
  >
    <header v-if="title || $slots.header || $slots.actions" class="ak-panel__header">
      <div class="ak-panel__title-group">
        <slot name="header">
          <h2 v-if="title" class="ak-panel__title">
            {{ title }}
          </h2>
          <p v-if="subtitle" class="ak-panel__subtitle">
            {{ subtitle }}
          </p>
        </slot>
      </div>

      <div v-if="$slots.actions" class="ak-panel__actions">
        <slot name="actions" />
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

  &--surface {
    background-color: var(--color-bg-surface);
  }

  &--base {
    background-color: var(--color-bg-base);
  }

  &--bordered {
    background-color: transparent;
    border-color: var(--color-border-bold);
  }

  &--cut-top-left {
    @include cut-corner(16px, top-left);
  }

  &--cut-top-right {
    @include cut-corner(16px, top-right);
  }

  &--cut-bottom-right {
    @include cut-corner(16px, bottom-right);
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-md);
    padding: var(--space-md) var(--space-lg);
    border-bottom: 1px solid var(--color-border-subtle);
    background-color: var(--color-bg-elevated);
  }

  &__title-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
  }

  &__title {
    font-family: var(--font-heading);
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin: 0;
  }

  &__subtitle {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    margin: 0;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
  }

  &__body {
    padding: var(--space-lg);
    flex: 1;
    color: var(--color-text-primary);
  }

  &__footer {
    padding: var(--space-sm) var(--space-lg);
    border-top: 1px solid var(--color-border-subtle);
    background-color: var(--color-bg-elevated);
  }
}
</style>
