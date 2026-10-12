<script setup lang="ts">
// Skeleton component for operator card during loading
</script>

<template>
  <div class="ak-operator-card-skeleton" aria-hidden="true">
    <div class="ak-operator-card-skeleton__inner">
      <div class="ak-operator-card-skeleton__top">
        <div class="ak-operator-card-skeleton__avatar" />
        <div class="ak-operator-card-skeleton__main">
          <div class="ak-operator-card-skeleton__line ak-operator-card-skeleton__line--title" />
          <div class="ak-operator-card-skeleton__line ak-operator-card-skeleton__line--meta" />
        </div>
      </div>
      <div class="ak-operator-card-skeleton__bottom">
        <div class="ak-operator-card-skeleton__line ak-operator-card-skeleton__line--stars" />
      </div>
    </div>
    <div class="ak-operator-card-skeleton__stripe" />
  </div>
</template>

<style lang="scss" scoped>
.ak-operator-card-skeleton {
  position: relative;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border-subtle);
  overflow: hidden;
  min-width: 0;

  &__inner {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
    padding: var(--space-sm);
    min-width: 0;
  }

  &__top {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    min-width: 0;
  }

  &__avatar {
    width: 44px;
    height: 44px;
    background-color: var(--color-bg-subtle);
    animation: ak-pulse 1.5s ease-in-out infinite;
    flex-shrink: 0;
  }

  &__main {
    display: flex;
    flex-direction: column;
    gap: var(--space-2xs);
    flex: 1;
    min-width: 0;
  }

  &__line {
    background-color: var(--color-bg-subtle);
    border-radius: var(--radius-xs);
    animation: ak-pulse 1.5s ease-in-out infinite;

    &--title {
      height: 1rem;
      width: 70%;
    }

    &--meta {
      height: 0.75rem;
      width: 50%;
    }

    &--stars {
      height: 0.75rem;
      width: 40%;
    }
  }

  &__bottom {
    display: flex;
    align-items: center;
    margin-top: 0.125rem;
  }

  &__stripe {
    height: 3px;
    width: 100%;
    background-color: var(--color-border-subtle);
  }
}

@keyframes ak-pulse {
  0%,
  100% {
    opacity: 0.6;
  }

  50% {
    opacity: 0.25;
  }
}
</style>
