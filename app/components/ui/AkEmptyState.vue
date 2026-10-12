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
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--space-xl) var(--space-md);
  gap: var(--space-sm);
  border: 1px dashed var(--color-border-bold);
  background-color: rgb(20 22 26 / 50%);

  &__icon-box {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    border: 1px solid var(--color-border-subtle);
    background-color: var(--color-bg-elevated);
    color: var(--color-text-secondary);
    font-size: var(--font-size-lg);
  }

  &__icon {
    line-height: 1;
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
    max-width: 420px;
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
    line-height: var(--line-height-base);
    margin: 0;
  }

  &__action {
    margin-top: var(--space-xs);
  }
}
</style>
