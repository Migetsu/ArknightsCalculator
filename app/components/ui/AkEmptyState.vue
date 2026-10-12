<script setup lang="ts">
interface Props {
  title: string
  description?: string
  icon?: string
}

withDefaults(defineProps<Props>(), {
  description: undefined,
  icon: undefined,
})
</script>

<template>
  <div class="ak-empty-state">
    <div v-if="icon || $slots.icon" class="ak-empty-state__icon-box">
      <slot name="icon">
        <span class="ak-empty-state__icon">{{ icon }}</span>
      </slot>
    </div>

    <div class="ak-empty-state__content">
      <h3 class="ak-empty-state__title">{{ title }}</h3>
      <p v-if="description" class="ak-empty-state__description">
        {{ description }}
      </p>
    </div>

    <div v-if="$slots.action" class="ak-empty-state__action">
      <slot name="action" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ak-empty-state {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--space-xl) var(--space-md);
  gap: var(--space-sm);
  border: 1px dashed var(--color-border-bold);
  background: linear-gradient(135deg, rgb(16 18 23 / 70%) 0%, rgb(8 9 12 / 80%) 100%);

  @include cut-corner(12px, top-right);

  &::before,
  &::after {
    content: '';
    position: absolute;
    width: 8px;
    height: 8px;
    pointer-events: none;
  }

  &::before {
    top: 4px;
    left: 4px;
    border-top: 2px solid var(--color-accent-primary);
    border-left: 2px solid var(--color-accent-primary);
  }

  &::after {
    bottom: 4px;
    right: 4px;
    border-bottom: 2px solid var(--color-accent-primary);
    border-right: 2px solid var(--color-accent-primary);
  }

  &__icon-box {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3.25rem;
    height: 3.25rem;
    border: 1px solid var(--color-border-bold);
    background-color: var(--color-bg-elevated);
    color: var(--color-accent-primary);
    font-size: var(--font-size-lg);
    box-shadow: 0 0 10px rgb(0 0 0 / 50%);

    @include cut-corner(6px, top-right);
  }

  &__icon {
    line-height: 1;
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
    max-width: 440px;
  }

  &__title {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    letter-spacing: var(--letter-spacing-mono);
    text-transform: uppercase;
    color: var(--color-text-primary);
    margin: 0;
  }

  &__description {
    font-size: var(--font-size-xs);
    color: var(--color-text-secondary);
    line-height: var(--line-height-relaxed);
    margin: 0;
  }

  &__action {
    margin-top: var(--space-xs);
  }
}
</style>
