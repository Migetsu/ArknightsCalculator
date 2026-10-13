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
      <slot />
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
  padding: 28px 20px;
  gap: var(--space-sm);
  border: 1px dashed var(--color-border-bold);
  border-radius: var(--radius-none);
  background-color: transparent;
  color: var(--color-text-secondary);

  &__icon-box {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 3rem;
    height: 3rem;
    background-color: var(--color-bg-deep);
    border: 1px solid var(--color-border-base);
    color: var(--color-text-accent);
    font-size: var(--font-size-lg);
  }

  &__icon {
    line-height: 1;
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-width: 480px;
    font-family: var(--font-body);
    font-size: var(--font-size-sm);
    line-height: var(--line-height-base);
  }

  &__title {
    font-family: var(--font-display);
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    margin: 0;
  }

  &__description {
    color: var(--color-text-secondary);
    margin: 0;
  }

  &__action {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 4px;
  }
}
</style>
