<script setup lang="ts">
// Skeleton component for operator card during loading
</script>

<template>
  <div class="ak-operator-card-skeleton" aria-hidden="true">
    <div class="ak-operator-card-skeleton__art-box" />
    <div class="ak-operator-card-skeleton__info">
      <div class="ak-operator-card-skeleton__line ak-operator-card-skeleton__line--title" />
      <div class="ak-operator-card-skeleton__line ak-operator-card-skeleton__line--meta" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ak-operator-card-skeleton {
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-deep);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-none);
  overflow: hidden;
  min-width: 0;

  &__art-box {
    height: 340px;
    background-color: var(--color-bg-subtle);
    animation: ak-skeleton-pulse 1.5s ease-in-out infinite;
  }

  &__info {
    padding: 14px 16px;
    border-bottom: 3px solid var(--color-border-bold);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__line {
    background-color: var(--color-border-bold);
    border-radius: var(--radius-none);
    animation: ak-skeleton-pulse 1.5s ease-in-out infinite;

    &--title {
      width: 70%;
      height: 18px;
    }

    &--meta {
      width: 40%;
      height: 14px;
    }
  }
}

@keyframes ak-skeleton-pulse {
  0%,
  100% {
    opacity: 0.6;
  }

  50% {
    opacity: 0.3;
  }
}
</style>
