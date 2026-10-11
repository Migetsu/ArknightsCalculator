<template>
  <div class="layout-default">
    <slot />
  </div>
</template>

<style lang="scss" scoped>
.layout-default {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>
