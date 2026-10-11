<script setup lang="ts">
const { t } = useI18n()
</script>

<template>
  <main class="page-home">
    <h1 class="page-home__title">{{ t('home.title') }}</h1>
    <p class="page-home__description">{{ t('home.description') }}</p>
  </main>
</template>

<style lang="scss" scoped>
.page-home {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: var(--space-2xl);
  text-align: center;

  &__title {
    font-family: var(--font-heading);
    font-size: var(--font-size-4xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-text-primary);
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin-bottom: var(--space-xs);
  }

  &__description {
    font-family: var(--font-body);
    font-size: var(--font-size-lg);
    color: var(--color-text-secondary);
  }
}
</style>
