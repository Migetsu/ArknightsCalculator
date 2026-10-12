<script setup lang="ts">
export type ContainerSize = 'sm' | 'md' | 'lg' | 'xl' | 'full'

interface Props {
  tag?: string
  size?: ContainerSize
  padded?: boolean
}

withDefaults(defineProps<Props>(), {
  tag: 'div',
  size: 'lg',
  padded: true,
})
</script>

<template>
  <component
    :is="tag"
    class="ak-container"
    :class="[`ak-container--size-${size}`, { 'ak-container--padded': padded }]"
  >
    <slot />
  </component>
</template>

<style lang="scss" scoped>
.ak-container {
  width: 100%;
  margin-left: auto;
  margin-right: auto;
  box-sizing: border-box;
  min-width: 0;

  &--padded {
    padding-left: var(--space-sm);
    padding-right: var(--space-sm);

    @include mq(md) {
      padding-left: var(--space-lg);
      padding-right: var(--space-lg);
    }

    @include mq(xl) {
      padding-left: var(--space-xl);
      padding-right: var(--space-xl);
    }
  }

  &--size-sm {
    max-width: 720px;
  }

  &--size-md {
    max-width: 1024px;
  }

  &--size-lg {
    max-width: 1440px;
  }

  &--size-xl {
    max-width: 1920px;
  }

  &--size-full {
    max-width: 100%;
  }
}
</style>
