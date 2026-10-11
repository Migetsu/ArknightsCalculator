<script setup lang="ts">
// Index page stub
</script>

<template>
  <main class="page-home">
    <h1 class="page-home__title">Arknights Companion</h1>
    <p class="page-home__description">Planner, Depot, Farming, Wiki, Recruitment & Gacha</p>
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
