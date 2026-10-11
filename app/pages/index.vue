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
  padding: 2rem;
  text-align: center;

  &__title {
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 0.5rem;
  }

  &__description {
    font-size: 1.125rem;
    color: #666;
  }
}
</style>
